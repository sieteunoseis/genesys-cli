"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");

const SS_PLACEHOLDER_RE = /<ss:\d+:[^>]+>/;

function getConfigDir() {
  return (
    process.env.GENESYS_CONFIG_DIR ||
    path.join(require("node:os").homedir(), ".genesys-cli")
  );
}

function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

function loadConfig() {
  const cfgPath = getConfigPath();
  if (!fs.existsSync(cfgPath)) {
    return { activeOrg: null, orgs: {} };
  }
  try {
    const raw = fs.readFileSync(cfgPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to load config from ${cfgPath}: ${err.message}`);
  }
}

function saveConfig(config) {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const cfgPath = getConfigPath();
  const json = JSON.stringify(config, null, 2);
  fs.writeFileSync(cfgPath, json, { mode: 0o600, encoding: "utf8" });
}

function addOrg(name, opts) {
  const { clientId, clientSecret, region } = opts;
  const config = loadConfig();
  config.orgs[name] = { clientId, clientSecret, region };
  if (config.activeOrg === null || Object.keys(config.orgs).length === 1) {
    config.activeOrg = name;
  }
  saveConfig(config);
  return config;
}

function useOrg(name) {
  const config = loadConfig();
  if (!config.orgs[name]) {
    throw new Error(`Org "${name}" not found`);
  }
  config.activeOrg = name;
  saveConfig(config);
  return config;
}

function removeOrg(name) {
  const config = loadConfig();
  if (!config.orgs[name]) {
    throw new Error(`Org "${name}" not found`);
  }
  const wasActive = config.activeOrg === name;
  delete config.orgs[name];
  if (wasActive) {
    const remaining = Object.keys(config.orgs);
    config.activeOrg = remaining.length > 0 ? remaining[0] : null;
  }
  saveConfig(config);
  return config;
}

function getActiveOrg(orgName) {
  const config = loadConfig();
  if (orgName) {
    const org = config.orgs[orgName];
    if (!org) return null;
    return { name: orgName, ...org };
  }
  const activeName = config.activeOrg;
  if (!activeName || !config.orgs[activeName]) {
    return null;
  }
  return { name: activeName, ...config.orgs[activeName] };
}

function listOrgs() {
  return loadConfig();
}

function maskSecret(secret) {
  if (!secret) return secret;
  if (SS_PLACEHOLDER_RE.test(secret)) return secret;
  if (secret.length <= 8) return "*".repeat(secret.length);
  return secret.slice(0, 4) + "*".repeat(secret.length - 8) + secret.slice(-4);
}

function hasSsPlaceholders(obj) {
  for (const value of Object.values(obj)) {
    if (typeof value === "string" && SS_PLACEHOLDER_RE.test(value)) {
      return true;
    }
    if (value !== null && typeof value === "object") {
      if (hasSsPlaceholders(value)) return true;
    }
  }
  return false;
}

async function resolveSsPlaceholders(obj) {
  if (!hasSsPlaceholders(obj)) {
    return obj;
  }
  const resolved = { ...obj };
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") {
      const match = value.match(/<ss:(\d+):([^>]+)>/);
      if (match) {
        const [, id, field] = match;
        resolved[key] = await resolveSsValue(id, field);
      }
    } else if (value !== null && typeof value === "object") {
      resolved[key] = await resolveSsPlaceholders(value);
    }
  }
  return resolved;
}

function resolveSsValue(id, field) {
  return new Promise((resolve, reject) => {
    execFile(
      "ss-cli",
      ["get", id, "--format", "json"],
      (err, stdout, stderr) => {
        if (err) {
          if (err.code === "ENOENT" || (stderr && /not found/i.test(stderr))) {
            return reject(
              new Error(
                "ss-cli is not installed or not in PATH. " +
                  "Please install ss-cli to resolve Secret Server placeholders. " +
                  `Original error: ${err.message}`,
              ),
            );
          }
          return reject(
            new Error(`ss-cli failed for secret ${id}: ${err.message}`),
          );
        }
        try {
          const data = JSON.parse(stdout);
          const fieldLower = field.toLowerCase();
          const foundKey = Object.keys(data).find(
            (k) => k.toLowerCase() === fieldLower,
          );
          if (foundKey !== undefined) {
            return resolve(data[foundKey]);
          }
          if (Array.isArray(data.items)) {
            const item = data.items.find(
              (i) =>
                (i.slug && i.slug.toLowerCase() === fieldLower) ||
                (i.fieldName && i.fieldName.toLowerCase() === fieldLower),
            );
            if (item) {
              return resolve(item.itemValue);
            }
          }
          return reject(
            new Error(`Field "${field}" not found in secret ${id}`),
          );
        } catch (parseErr) {
          reject(
            new Error(
              `Failed to parse ss-cli output for secret ${id}: ${parseErr.message}`,
            ),
          );
        }
      },
    );
  });
}

module.exports = {
  loadConfig,
  saveConfig,
  addOrg,
  useOrg,
  removeOrg,
  getActiveOrg,
  listOrgs,
  maskSecret,
  getConfigDir,
  getConfigPath,
  hasSsPlaceholders,
  resolveSsPlaceholders,
};
