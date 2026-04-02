"use strict";

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

  const authHeader =
    "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch(`https://${loginDomain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authHeader,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    throw new Error(`OAuth token request failed: HTTP ${resp.status}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
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
  let token = await getToken(
    regionInfo.login,
    config.clientId,
    config.clientSecret,
  );

  const baseURL = `https://${regionInfo.api}/api/v2`;
  const debug = !!flags.debug;

  async function request(method, urlPath, options = {}) {
    const qs = options.params
      ? new URLSearchParams(options.params).toString()
      : "";
    const url = `${baseURL}${urlPath}${qs ? "?" + qs : ""}`;

    if (debug) {
      process.stderr.write(`DEBUG: ${method.toUpperCase()} ${url}\n`);
    }

    const fetchOpts = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      signal: AbortSignal.timeout(30000),
    };

    if (options.data !== undefined) {
      fetchOpts.body = JSON.stringify(options.data);
    }

    let response = await fetch(url, fetchOpts);

    // Retry on 401 (token expired) — refresh and retry once
    if (response.status === 401) {
      cachedToken = null;
      tokenExpiry = 0;
      token = await getToken(
        regionInfo.login,
        config.clientId,
        config.clientSecret,
      );
      fetchOpts.headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, fetchOpts);
    }

    // Retry on 429 with exponential backoff (up to 3 attempts)
    let retryCount = 0;
    while (response.status === 429 && retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      retryCount++;
      response = await fetch(url, fetchOpts);
    }

    if (debug) {
      process.stderr.write(
        `DEBUG: ${response.status} ${response.statusText}\n`,
      );
    }

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`HTTP ${response.status}: ${body}`);
      err.response = { status: response.status, data: body };
      throw err;
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: response.status, statusText: response.statusText, data };
  }

  return {
    get: (path, opts) => request("GET", path, opts),
    post: (path, data, opts) => request("POST", path, { ...opts, data }),
    put: (path, data, opts) => request("PUT", path, { ...opts, data }),
    delete: (path, opts) => request("DELETE", path, opts),
    patch: (path, data, opts) => request("PATCH", path, { ...opts, data }),
    defaults: { baseURL },
  };
}

module.exports = {
  resolveConfig,
  createClient,
  resolveRegion,
};
