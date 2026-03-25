"use strict";

const axios = require("axios");
const {
  getActiveOrg,
  hasSsPlaceholders,
  resolveSsPlaceholders,
} = require("./config.js");

const REGION_MAP = {
  "us-east-1": { login: "login.mypurecloud.com", api: "api.mypurecloud.com" },
  "mypurecloud.com": {
    login: "login.mypurecloud.com",
    api: "api.mypurecloud.com",
  },
  usw2: { login: "login.usw2.pure.cloud", api: "api.usw2.pure.cloud" },
  "usw2.pure.cloud": {
    login: "login.usw2.pure.cloud",
    api: "api.usw2.pure.cloud",
  },
  cac1: { login: "login.cac1.pure.cloud", api: "api.cac1.pure.cloud" },
  "cac1.pure.cloud": {
    login: "login.cac1.pure.cloud",
    api: "api.cac1.pure.cloud",
  },
  "eu-west-1": { login: "login.mypurecloud.ie", api: "api.mypurecloud.ie" },
  "mypurecloud.ie": {
    login: "login.mypurecloud.ie",
    api: "api.mypurecloud.ie",
  },
  "eu-central-1": { login: "login.mypurecloud.de", api: "api.mypurecloud.de" },
  "mypurecloud.de": {
    login: "login.mypurecloud.de",
    api: "api.mypurecloud.de",
  },
  euw2: { login: "login.euw2.pure.cloud", api: "api.euw2.pure.cloud" },
  "euw2.pure.cloud": {
    login: "login.euw2.pure.cloud",
    api: "api.euw2.pure.cloud",
  },
  aps1: { login: "login.aps1.pure.cloud", api: "api.aps1.pure.cloud" },
  "aps1.pure.cloud": {
    login: "login.aps1.pure.cloud",
    api: "api.aps1.pure.cloud",
  },
  apne2: { login: "login.apne2.pure.cloud", api: "api.apne2.pure.cloud" },
  "apne2.pure.cloud": {
    login: "login.apne2.pure.cloud",
    api: "api.apne2.pure.cloud",
  },
  "ap-southeast-2": {
    login: "login.mypurecloud.com.au",
    api: "api.mypurecloud.com.au",
  },
  "mypurecloud.com.au": {
    login: "login.mypurecloud.com.au",
    api: "api.mypurecloud.com.au",
  },
  "ap-northeast-1": {
    login: "login.mypurecloud.jp",
    api: "api.mypurecloud.jp",
  },
  "mypurecloud.jp": {
    login: "login.mypurecloud.jp",
    api: "api.mypurecloud.jp",
  },
  sae1: { login: "login.sae1.pure.cloud", api: "api.sae1.pure.cloud" },
  "sae1.pure.cloud": {
    login: "login.sae1.pure.cloud",
    api: "api.sae1.pure.cloud",
  },
  mec1: { login: "login.mec1.pure.cloud", api: "api.mec1.pure.cloud" },
  "mec1.pure.cloud": {
    login: "login.mec1.pure.cloud",
    api: "api.mec1.pure.cloud",
  },
};

function resolveRegion(region) {
  const key = region
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const mapped = REGION_MAP[key];
  if (mapped) return mapped;
  // If it contains a dot, assume it's a full domain
  if (key.includes(".")) {
    return { login: `login.${key}`, api: `api.${key}` };
  }
  throw new Error(
    `Unknown region "${region}". Use a short name (usw2) or full domain (usw2.pure.cloud).`,
  );
}

let cachedToken = null;
let tokenExpiry = 0;

async function getToken(loginDomain, clientId, clientSecret) {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }
  const resp = await axios.post(
    `https://${loginDomain}/oauth/token`,
    "grant_type=client_credentials",
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      auth: { username: clientId, password: clientSecret },
      timeout: 10000,
    },
  );
  cachedToken = resp.data.access_token;
  tokenExpiry = Date.now() + resp.data.expires_in * 1000;
  return cachedToken;
}

async function resolveConfig(flags = {}) {
  let cfgClientId, cfgClientSecret, cfgRegion;

  const orgName = flags.org || undefined;
  const org = getActiveOrg(orgName);

  if (orgName && !org) {
    throw new Error(`Org "${orgName}" not found`);
  }

  if (org) {
    cfgClientId = org.clientId;
    cfgClientSecret = org.clientSecret;
    cfgRegion = org.region;
  }

  const envClientId = process.env.GENESYS_CLIENT_ID || process.env.CLIENT_ID;
  const envClientSecret =
    process.env.GENESYS_CLIENT_SECRET || process.env.CLIENT_SECRET;
  const envRegion = process.env.GENESYS_REGION || process.env.REGION;

  const clientId = flags.clientId || envClientId || cfgClientId;
  const clientSecret = flags.clientSecret || envClientSecret || cfgClientSecret;
  const region = flags.region || envRegion || cfgRegion;

  if (!clientId) {
    throw new Error(
      "No client ID configured. Provide --client-id, set GENESYS_CLIENT_ID, or add an org with: genesys-cli config add",
    );
  }
  if (!clientSecret) {
    throw new Error(
      "No client secret configured. Provide --client-secret, set GENESYS_CLIENT_SECRET, or add an org with: genesys-cli config add",
    );
  }
  if (!region) {
    throw new Error(
      "No region configured. Provide --region, set GENESYS_REGION, or add an org with: genesys-cli config add",
    );
  }

  const result = { clientId, clientSecret, region };

  if (hasSsPlaceholders(result)) {
    return resolveSsPlaceholders(result);
  }

  return result;
}

async function createClient(flags = {}) {
  const config = await resolveConfig(flags);
  const regionInfo = resolveRegion(config.region);
  const token = await getToken(
    regionInfo.login,
    config.clientId,
    config.clientSecret,
  );

  const client = axios.create({
    baseURL: `https://${regionInfo.api}/api/v2`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  // Retry on 401 (token expired)
  client.interceptors.response.use(null, async (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config._retried
    ) {
      error.config._retried = true;
      cachedToken = null;
      tokenExpiry = 0;
      const newToken = await getToken(
        regionInfo.login,
        config.clientId,
        config.clientSecret,
      );
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return client.request(error.config);
    }
    // Retry on 429 with backoff
    if (error.response && error.response.status === 429) {
      const retryCount = error.config._retryCount || 0;
      if (retryCount < 3) {
        error.config._retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        return client.request(error.config);
      }
    }
    return Promise.reject(error);
  });

  if (flags.debug) {
    client.interceptors.request.use((req) => {
      process.stderr.write(
        `DEBUG: ${req.method.toUpperCase()} ${req.baseURL}${req.url}\n`,
      );
      return req;
    });
    client.interceptors.response.use((resp) => {
      process.stderr.write(`DEBUG: ${resp.status} ${resp.statusText}\n`);
      return resp;
    });
  }

  return client;
}

module.exports = {
  resolveConfig,
  createClient,
  resolveRegion,
};
