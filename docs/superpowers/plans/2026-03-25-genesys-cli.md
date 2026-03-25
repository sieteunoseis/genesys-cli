# genesys-cli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js CLI tool for troubleshooting VoIP and contact center operations on Genesys Cloud CX via the Platform API.

**Architecture:** Direct REST client using axios with OAuth 2.0 Client Credentials authentication. Commander.js CLI with 4-format output (table, json, csv, toon). Config, audit, and error handling follow the established audiocodes-cli patterns exactly. Region-aware with automatic token caching and refresh.

**Tech Stack:** Node.js (CommonJS), Commander.js, axios, cli-table3, csv-stringify, @toon-format/toon, update-notifier

**Spec:** `docs/superpowers/specs/2026-03-25-genesys-cli-design.md`

---

## File Map

| File                            | Responsibility                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `package.json`                  | Package metadata, dependencies, bin, scripts                                         |
| `bin/genesys-cli.js`            | Shebang entry point                                                                  |
| `cli/index.js`                  | Commander program setup, global options, command registration                        |
| `cli/utils/config.js`           | Org config CRUD, secret masking, SS placeholder resolution                           |
| `cli/utils/connection.js`       | Config resolution (flags > env > file), OAuth token management, axios client factory |
| `cli/utils/output.js`           | Format dispatcher (printResult) + error handler (printError)                         |
| `cli/utils/audit.js`            | JSONL audit logging with rotation and credential redaction                           |
| `cli/formatters/json.js`        | JSON formatter                                                                       |
| `cli/formatters/csv.js`         | CSV formatter                                                                        |
| `cli/formatters/toon.js`        | TOON formatter                                                                       |
| `cli/formatters/table.js`       | Table formatter with dot-notation flattening                                         |
| `cli/commands/config.js`        | Config subcommands: add, use, list, show, remove, test                               |
| `cli/commands/conversations.js` | Conversation queries: list, detail                                                   |
| `cli/commands/trunks.js`        | BYOC trunk status and metrics                                                        |
| `cli/commands/queues.js`        | Queue stats                                                                          |
| `cli/commands/doctor.js`        | Health check command                                                                 |
| `test/tests.js`                 | CLI unit tests                                                                       |

---

### Task 1: Project Scaffolding

**Files:**

- Create: `package.json`
- Create: `bin/genesys-cli.js`
- Create: `cli/index.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "genesys-cli",
  "version": "0.1.0",
  "description": "CLI for Genesys Cloud CX via Platform API",
  "author": "sieteunoseis",
  "license": "MIT",
  "keywords": [
    "genesys",
    "genesys-cloud",
    "contact-center",
    "voip",
    "sip",
    "byoc",
    "troubleshooting",
    "cli"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "bin": {
    "genesys-cli": "./bin/genesys-cli.js"
  },
  "scripts": {
    "test": "node ./test/tests.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sieteunoseis/genesys-cli.git"
  },
  "dependencies": {
    "axios": "^1.7.9",
    "commander": "^14.0.3",
    "cli-table3": "^0.6.5",
    "csv-stringify": "^6.7.0",
    "@toon-format/toon": "^2.1.0",
    "update-notifier": "^7.3.1"
  }
}
```

- [ ] **Step 2: Create bin entry point**

Create `bin/genesys-cli.js`:

```javascript
#!/usr/bin/env node
require("../cli/index.js");
```

- [ ] **Step 3: Create CLI index with global options**

Create `cli/index.js`:

```javascript
"use strict";

const { Command } = require("commander");
const pkg = require("../package.json");

try {
  const updateNotifier =
    require("update-notifier").default || require("update-notifier");
  updateNotifier({ pkg }).notify();
} catch {}

const program = new Command();

program
  .name("genesys-cli")
  .description("CLI for Genesys Cloud CX via Platform API")
  .version(pkg.version)
  .option("--format <type>", "output format: table, json, toon, csv", "table")
  .option("--client-id <id>", "OAuth client ID (overrides config/env)")
  .option(
    "--client-secret <secret>",
    "OAuth client secret (overrides config/env)",
  )
  .option("--region <region>", "Genesys Cloud region (overrides config/env)")
  .option("--org <name>", "use a specific named org from config")
  .option("--clean", "remove empty/null values from results")
  .option("--no-audit", "disable audit logging for this command")
  .option("--debug", "enable debug logging");

// Commands registered in subsequent tasks
// require("./commands/config.js")(program);
// require("./commands/doctor.js")(program);
// require("./commands/conversations.js")(program);
// require("./commands/trunks.js")(program);
// require("./commands/queues.js")(program);

program.parse();
```

- [ ] **Step 4: Install dependencies and make bin executable**

Run:

```bash
cd /Users/wordenj/Developer/genesys-cli && npm install && chmod +x bin/genesys-cli.js
```

- [ ] **Step 5: Verify scaffolding works**

Run: `node bin/genesys-cli.js --help`
Expected: Shows "CLI for Genesys Cloud CX via Platform API" and global options

Run: `node bin/genesys-cli.js --version`
Expected: `0.1.0`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json bin/genesys-cli.js cli/index.js
git commit -m "feat: scaffold genesys-cli with Commander.js entry point"
```

---

### Task 2: Output Formatters

**Files:**

- Create: `cli/formatters/json.js`
- Create: `cli/formatters/csv.js`
- Create: `cli/formatters/toon.js`
- Create: `cli/formatters/table.js`
- Create: `cli/utils/output.js`

- [ ] **Step 1: Create JSON formatter**

Create `cli/formatters/json.js`:

```javascript
"use strict";

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

module.exports = { formatJson };
```

- [ ] **Step 2: Create CSV formatter**

Create `cli/formatters/csv.js`:

```javascript
"use strict";

const { stringify } = require("csv-stringify/sync");

function formatCsv(data) {
  const rows = Array.isArray(data) ? data : [data];
  return stringify(rows, { header: true });
}

module.exports = { formatCsv };
```

- [ ] **Step 3: Create TOON formatter**

Create `cli/formatters/toon.js`:

```javascript
"use strict";

async function formatToon(data) {
  const { encode } = await import("@toon-format/toon");
  return encode(data);
}

module.exports = { formatToon };
```

- [ ] **Step 4: Create table formatter**

Create `cli/formatters/table.js` — identical to audiocodes-cli table formatter with flattenObj, shortenKeys, formatArrayTable, formatTable functions.

```javascript
"use strict";

const Table = require("cli-table3");

function flattenObj(obj, prefix = "", result = {}) {
  if (obj === null || obj === undefined) return result;
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val === null || val === undefined) {
      result[fullKey] = "";
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        result[fullKey] = "";
      } else if (typeof val[0] !== "object" || val[0] === null) {
        result[fullKey] = val.join(", ");
      } else {
        result[fullKey] = `[${val.length} items]`;
      }
    } else if (typeof val === "object") {
      flattenObj(val, fullKey, result);
    } else {
      result[fullKey] = String(val);
    }
  }
  return result;
}

function shortenKeys(fullKeys) {
  const shortNames = fullKeys.map((k) => {
    const parts = k.split(".");
    return parts[parts.length - 1];
  });

  const counts = {};
  for (const s of shortNames) counts[s] = (counts[s] || 0) + 1;

  return fullKeys.map((k, i) => {
    if (counts[shortNames[i]] <= 1) return shortNames[i];
    const parts = k.split(".");
    return parts.length >= 2
      ? parts.slice(-2).join(".")
      : parts[parts.length - 1];
  });
}

function formatArrayTable(rows) {
  const flatRows = rows.map((row) => flattenObj(row));
  const keySet = new Set();
  for (const flat of flatRows) {
    for (const k of Object.keys(flat)) keySet.add(k);
  }
  const keys = [...keySet];
  const shortKeys = shortenKeys(keys);

  const table = new Table({ head: shortKeys, wordWrap: true });

  for (const flat of flatRows) {
    table.push(keys.map((k) => (flat[k] !== undefined ? flat[k] : "")));
  }

  const footer = new Table();
  footer.push([
    { colSpan: keys.length || 1, content: `${rows.length} results found` },
  ]);

  return table.toString() + "\n" + footer.toString();
}

function formatTable(data) {
  if (data !== null && data !== undefined && typeof data !== "object") {
    return String(data);
  }

  if (Array.isArray(data) && data.length === 0) {
    return "No results found";
  }

  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return formatArrayTable(data);
  }

  if (Array.isArray(data)) {
    const table = new Table({ head: ["value"] });
    for (const item of data) {
      table.push([item === null || item === undefined ? "" : String(item)]);
    }
    return table.toString();
  }

  const flat = flattenObj(data);
  const keys = Object.keys(flat);
  const shortKeys = shortenKeys(keys);
  const table = new Table({ wordWrap: true });
  for (let i = 0; i < keys.length; i++) {
    table.push({ [shortKeys[i]]: flat[keys[i]] });
  }
  return table.toString();
}

module.exports = { formatTable };
```

- [ ] **Step 5: Create output dispatcher**

Create `cli/utils/output.js`:

```javascript
"use strict";

const { formatJson } = require("../formatters/json.js");
const { formatCsv } = require("../formatters/csv.js");
const { formatTable } = require("../formatters/table.js");
const { formatToon } = require("../formatters/toon.js");

async function printResult(data, format = "table") {
  let output;
  switch (format) {
    case "json":
      output = formatJson(data);
      break;
    case "csv":
      output = formatCsv(data);
      break;
    case "toon":
      output = await formatToon(data);
      break;
    case "table":
    default:
      output = formatTable(data);
      break;
  }
  process.stdout.write(output + "\n");
}

function printError(err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  if (message.includes("401") || message.includes("Unauthorized")) {
    process.stderr.write(
      `Hint: Check client credentials. Run "genesys-cli config test" to verify.\n`,
    );
  } else if (message.includes("403") || message.includes("Forbidden")) {
    process.stderr.write(
      `Hint: Insufficient permissions. Check OAuth client role in Genesys Cloud admin.\n`,
    );
  } else if (message.includes("429") || message.includes("Too Many")) {
    process.stderr.write(
      `Hint: Rate limited. The CLI retries automatically.\n`,
    );
  } else if (
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND")
  ) {
    process.stderr.write(
      `Hint: Check region setting and network connectivity.\n`,
    );
  }
  process.exitCode = 1;
}

module.exports = { printResult, printError };
```

- [ ] **Step 6: Commit**

```bash
git add cli/formatters/ cli/utils/output.js
git commit -m "feat: add output formatters (table, json, csv, toon) and dispatcher"
```

---

### Task 3: Configuration Management & Connection Utility

**Files:**

- Create: `cli/utils/config.js`
- Create: `cli/utils/connection.js`
- Create: `cli/utils/audit.js`
- Create: `cli/commands/config.js`

- [ ] **Step 1: Write test for config round-trip**

Create `test/tests.js`:

```javascript
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert");

const BIN = path.join(__dirname, "..", "bin", "genesys-cli.js");

function run(args) {
  return execFileSync("node", [BIN, ...args], {
    encoding: "utf-8",
    timeout: 10000,
    env: {
      ...process.env,
      GENESYS_CONFIG_DIR: "/tmp/genesys-cli-test-" + process.pid,
    },
  });
}

console.log("Test: config list with empty config");
const listOutput = run(["config", "list"]);
assert(listOutput.includes("No results found"), "should show no results");
console.log("  PASS");

console.log("\nAll tests passed.");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test/tests.js`
Expected: FAIL — config command not registered yet

- [ ] **Step 3: Create config utility**

Create `cli/utils/config.js`:

```javascript
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
```

- [ ] **Step 4: Create connection utility with OAuth token management**

Create `cli/utils/connection.js`:

```javascript
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
```

- [ ] **Step 5: Create audit logging utility**

Create `cli/utils/audit.js` — identical to audiocodes-cli but with `clientId`, `clientSecret`, `token`, `access_token` added to REDACTED_FIELDS. Use `GENESYS_CONFIG_DIR` env var. Same fire-and-forget pattern with 10MB rotation.

```javascript
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const AUDIT_FILE = "audit.jsonl";
const ROTATION_THRESHOLD = 10 * 1024 * 1024;

const REDACTED_FIELDS = new Set([
  "password",
  "username",
  "user",
  "pass",
  "secret",
  "token",
  "auth",
  "clientid",
  "clientsecret",
  "access_token",
]);

function getConfigDir() {
  return (
    process.env.GENESYS_CONFIG_DIR || path.join(os.homedir(), ".genesys-cli")
  );
}

function sanitize(entry) {
  if (!entry || typeof entry !== "object") return {};
  const safe = {};
  for (const [key, val] of Object.entries(entry)) {
    if (!REDACTED_FIELDS.has(key.toLowerCase())) {
      safe[key] = val;
    }
  }
  return safe;
}

async function logAudit(entry) {
  try {
    const safe = sanitize(entry);
    const record = { timestamp: new Date().toISOString(), ...safe };
    const line = JSON.stringify(record) + "\n";
    const dir = getConfigDir();
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, AUDIT_FILE);
    fs.appendFileSync(filePath, line, "utf8");
  } catch {
    // Fire-and-forget
  }
}

async function rotateAuditLog() {
  try {
    const dir = getConfigDir();
    const filePath = path.join(dir, AUDIT_FILE);
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size <= ROTATION_THRESHOLD) return;
    const rotatedPath = path.join(dir, AUDIT_FILE + ".1");
    if (fs.existsSync(rotatedPath)) {
      fs.unlinkSync(rotatedPath);
    }
    fs.renameSync(filePath, rotatedPath);
    fs.writeFileSync(filePath, "", "utf8");
  } catch {
    // Fire-and-forget
  }
}

module.exports = { logAudit, rotateAuditLog };
```

- [ ] **Step 6: Create config command**

Create `cli/commands/config.js`:

```javascript
"use strict";

const configUtil = require("../utils/config.js");
const { printResult, printError } = require("../utils/output.js");
const { createClient } = require("../utils/connection.js");

module.exports = function registerConfigCommand(program) {
  const config = program
    .command("config")
    .description("Manage Genesys Cloud org configurations");

  config
    .command("add <name>")
    .description("Add a named org (use --client-id, --client-secret, --region)")
    .action((name, opts, cmd) => {
      try {
        const globalOpts = cmd.optsWithGlobals();
        const clientId = globalOpts.clientId;
        const clientSecret = globalOpts.clientSecret;
        const region = globalOpts.region;
        if (!clientId) throw new Error("Missing required option: --client-id");
        if (!clientSecret)
          throw new Error("Missing required option: --client-secret");
        if (!region) throw new Error("Missing required option: --region");

        configUtil.addOrg(name, { clientId, clientSecret, region });
        process.stdout.write(`Org "${name}" added successfully.\n`);
      } catch (err) {
        printError(err);
      }
    });

  config
    .command("use <name>")
    .description("Set a named org as the active org")
    .action((name) => {
      try {
        configUtil.useOrg(name);
        process.stdout.write(`Org "${name}" is now the active org.\n`);
      } catch (err) {
        printError(err);
      }
    });

  config
    .command("list")
    .description("List all configured orgs")
    .action(async () => {
      try {
        const { activeOrg, orgs } = configUtil.listOrgs();
        const rows = Object.entries(orgs).map(([name, org]) => ({
          name,
          active: name === activeOrg ? "\u2713" : "",
          region: org.region,
          clientId: org.clientId,
        }));
        const format = program.opts().format;
        await printResult(rows, format);
      } catch (err) {
        printError(err);
      }
    });

  config
    .command("show")
    .description("Show the active org configuration (secrets masked)")
    .action(async () => {
      try {
        const orgName = program.opts().org;
        const org = configUtil.getActiveOrg(orgName);
        if (!org) {
          printError(
            new Error("No active org configured. Run: genesys-cli config add"),
          );
          return;
        }
        const display = {
          ...org,
          clientSecret: configUtil.maskSecret(org.clientSecret),
        };
        const format = program.opts().format;
        await printResult(display, format);
      } catch (err) {
        printError(err);
      }
    });

  config
    .command("remove <name>")
    .description("Remove a named org from config")
    .action((name) => {
      try {
        configUtil.removeOrg(name);
        process.stdout.write(`Org "${name}" removed successfully.\n`);
      } catch (err) {
        printError(err);
      }
    });

  config
    .command("test")
    .description("Test connectivity to the active org")
    .action(async () => {
      try {
        const flags = program.opts();
        const client = await createClient(flags);
        const resp = await client.get("/organizations/me");
        const orgData = resp.data;
        process.stdout.write(
          `Connection successful — org: ${orgData.name} (${orgData.id})\n`,
        );
      } catch (err) {
        printError(err);
      }
    });
};
```

- [ ] **Step 7: Register config command in cli/index.js**

Uncomment: `require("./commands/config.js")(program);`

- [ ] **Step 8: Run test to verify it passes**

Run: `node test/tests.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add cli/utils/ cli/commands/config.js cli/index.js test/tests.js
git commit -m "feat: add config management, OAuth connection utility, and audit logging"
```

---

### Task 4: Doctor Command

**Files:**

- Create: `cli/commands/doctor.js`
- Modify: `cli/index.js` — register doctor command

- [ ] **Step 1: Create doctor command**

Create `cli/commands/doctor.js`:

```javascript
"use strict";

const {
  loadConfig,
  getConfigPath,
  getConfigDir,
} = require("../utils/config.js");
const {
  resolveConfig,
  createClient,
  resolveRegion,
} = require("../utils/connection.js");

module.exports = function registerDoctorCommand(program) {
  program
    .command("doctor")
    .description("Check Genesys Cloud connectivity and configuration health")
    .action(async (opts, command) => {
      const globalOpts = command.optsWithGlobals();
      let passed = 0;
      let warned = 0;
      let failed = 0;

      const ok = (msg) => {
        console.log(`  \u2713 ${msg}`);
        passed++;
      };
      const warn = (msg) => {
        console.log(`  \u26A0 ${msg}`);
        warned++;
      };
      const fail = (msg) => {
        console.log(`  \u2717 ${msg}`);
        failed++;
      };

      console.log("\n  genesys-cli doctor");
      console.log("  " + "\u2500".repeat(50));

      console.log("\n  Configuration");
      let conn;
      try {
        const data = loadConfig();
        if (!data.activeOrg) {
          fail("No active org configured");
          console.log(
            "    Run: genesys-cli config add <name> --client-id <id> --client-secret <secret> --region <region>",
          );
          printSummary(passed, warned, failed);
          return;
        }
        ok(`Active org: ${data.activeOrg}`);
        const org = data.orgs[data.activeOrg];
        ok(`Region: ${org.region}`);
        ok(`Client ID: ${org.clientId}`);

        conn = await resolveConfig(globalOpts);
        const regionInfo = resolveRegion(conn.region);
        ok(`API endpoint: ${regionInfo.api}`);
      } catch (err) {
        fail(`Config error: ${err.message}`);
        printSummary(passed, warned, failed);
        return;
      }

      console.log("\n  OAuth");
      try {
        const client = await createClient(globalOpts);
        ok("Token acquisition: success");

        const resp = await client.get("/organizations/me");
        ok(`Org name: ${resp.data.name}`);
        ok(`Org ID: ${resp.data.id}`);
        if (resp.data.state) ok(`State: ${resp.data.state}`);
      } catch (err) {
        const msg = err.message || String(err);
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          fail("OAuth: authentication failed \u2014 check client credentials");
        } else if (msg.includes("403") || msg.includes("Forbidden")) {
          fail("OAuth: insufficient permissions \u2014 check role assignments");
        } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
          fail(
            "OAuth: cannot reach Genesys Cloud \u2014 check region and network",
          );
        } else {
          fail(`OAuth: ${msg}`);
        }
      }

      console.log("\n  Security");
      try {
        const fs = require("node:fs");
        const configPath = getConfigPath();
        const stats = fs.statSync(configPath);
        const mode = (stats.mode & 0o777).toString(8);
        if (mode === "600") ok(`Config file permissions: ${mode} (secure)`);
        else
          warn(
            `Config file permissions: ${mode} \u2014 should be 600. Run: chmod 600 ${configPath}`,
          );
      } catch {
        /* config file may not exist yet */
      }

      try {
        const fs = require("node:fs");
        const path = require("node:path");
        const auditPath = path.join(getConfigDir(), "audit.jsonl");
        if (fs.existsSync(auditPath)) {
          const stats = fs.statSync(auditPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          ok(`Audit trail: ${sizeMB}MB`);
          if (stats.size > 8 * 1024 * 1024)
            warn("Audit trail approaching 10MB rotation limit");
        } else {
          ok("Audit trail: empty (no operations logged yet)");
        }
      } catch {
        /* ignore */
      }

      printSummary(passed, warned, failed);
    });

  function printSummary(passed, warned, failed) {
    console.log("\n  " + "\u2500".repeat(50));
    console.log(
      `  Results: ${passed} passed, ${warned} warning${warned !== 1 ? "s" : ""}, ${failed} failed`,
    );
    if (failed > 0) {
      process.exitCode = 1;
      console.log("  Status:  issues found \u2014 review failures above");
    } else if (warned > 0) {
      console.log("  Status:  healthy with warnings");
    } else {
      console.log("  Status:  all systems healthy");
    }
    console.log("");
  }
};
```

- [ ] **Step 2: Register doctor command in cli/index.js**

Uncomment: `require("./commands/doctor.js")(program);`

- [ ] **Step 3: Verify help output**

Run: `node bin/genesys-cli.js --help`
Expected: Lists "doctor" command

- [ ] **Step 4: Commit**

```bash
git add cli/commands/doctor.js cli/index.js
git commit -m "feat: add doctor command for connectivity and health checks"
```

---

### Task 5: Conversations Command

**Files:**

- Create: `cli/commands/conversations.js`
- Modify: `cli/index.js` — register conversations command

- [ ] **Step 1: Create conversations command**

Create `cli/commands/conversations.js`:

```javascript
"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

function parseDuration(str) {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match)
    throw new Error(`Invalid duration "${str}". Use format: 30m, 2h, 7d`);
  const [, num, unit] = match;
  const ms = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num, 10) * ms[unit];
}

module.exports = function registerConversationsCommand(program) {
  const conversations = program
    .command("conversations")
    .description("Query conversation history and details");

  conversations
    .command("list")
    .description("Query recent conversations")
    .option("--last <duration>", "relative time range: 30m, 2h, 1d, 7d", "24h")
    .option("--caller <number>", "filter by caller/ANI number")
    .option("--callee <number>", "filter by callee/DNIS number")
    .option("--queue <name>", "filter by queue name")
    .option("--disconnect-reason <reason>", "filter by disconnect type")
    .option("--limit <n>", "max results", "25")
    .action(async (cmdOpts, command) => {
      const startTime = Date.now();
      const globalOpts = command.optsWithGlobals();
      let status = "success";
      let errorMsg;

      try {
        const client = await createClient(globalOpts);

        const durationMs = parseDuration(cmdOpts.last);
        const now = new Date();
        const start = new Date(now.getTime() - durationMs);

        const body = {
          interval: `${start.toISOString()}/${now.toISOString()}`,
          order: "desc",
          orderBy: "conversationStart",
          paging: {
            pageSize: parseInt(cmdOpts.limit, 10),
            pageNumber: 1,
          },
          segmentFilters: [],
          conversationFilters: [],
        };

        if (cmdOpts.caller) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "ani", value: cmdOpts.caller }],
          });
        }
        if (cmdOpts.callee) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "dnis", value: cmdOpts.callee }],
          });
        }
        if (cmdOpts.queue) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "queueId", value: cmdOpts.queue }],
          });
        }
        if (cmdOpts.disconnectReason) {
          body.segmentFilters.push({
            type: "and",
            predicates: [
              { dimension: "disconnectType", value: cmdOpts.disconnectReason },
            ],
          });
        }

        const resp = await client.post(
          "/analytics/conversations/details/query",
          body,
        );

        const conversations = resp.data.conversations || [];
        const data = conversations.map((c) => {
          const firstParticipant = c.participants && c.participants[0];
          const firstSession =
            firstParticipant &&
            firstParticipant.sessions &&
            firstParticipant.sessions[0];
          const firstSegment =
            firstSession && firstSession.segments && firstSession.segments[0];
          return {
            conversationStart: c.conversationStart
              ? new Date(c.conversationStart).toLocaleString()
              : "",
            conversationId: c.conversationId || "",
            ani: firstSession ? firstSession.ani || "" : "",
            dnis: firstSession ? firstSession.dnis || "" : "",
            direction: firstSession ? firstSession.direction || "" : "",
            disconnectType: firstSegment
              ? firstSegment.disconnectType || ""
              : "",
            sipResponseCode: firstSegment
              ? firstSegment.sipResponseCode || ""
              : "",
          };
        });

        await printResult(data, globalOpts.format);
      } catch (err) {
        status = "error";
        errorMsg = err.message;
        printError(err);
      } finally {
        if (globalOpts.audit !== false) {
          const { logAudit } = require("../utils/audit.js");
          const { getActiveOrg } = require("../utils/config.js");
          const orgName = getActiveOrg(globalOpts.org)?.name || "env/flags";
          logAudit({
            org: orgName,
            operation: "conversations.list",
            duration_ms: Date.now() - startTime,
            status,
            ...(errorMsg && { error: errorMsg }),
          });
        }
      }
    });

  conversations
    .command("detail <conversationId>")
    .description("Get full detail for a conversation")
    .action(async (conversationId, cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();

      try {
        const client = await createClient(globalOpts);
        const resp = await client.get(`/conversations/${conversationId}`);
        await printResult(resp.data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
```

- [ ] **Step 2: Register conversations command in cli/index.js**

Uncomment: `require("./commands/conversations.js")(program);`

- [ ] **Step 3: Verify help output**

Run: `node bin/genesys-cli.js conversations --help`
Expected: Shows "list" and "detail" subcommands

- [ ] **Step 4: Commit**

```bash
git add cli/commands/conversations.js cli/index.js
git commit -m "feat: add conversations list and detail commands"
```

---

### Task 6: Trunks Command

**Files:**

- Create: `cli/commands/trunks.js`
- Modify: `cli/index.js` — register trunks command

- [ ] **Step 1: Create trunks command**

Create `cli/commands/trunks.js`:

```javascript
"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function registerTrunksCommand(program) {
  const trunks = program
    .command("trunks")
    .description("BYOC trunk status and metrics");

  trunks
    .command("list")
    .description("List BYOC trunks and their status")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();

      try {
        const client = await createClient(globalOpts);
        const resp = await client.get("/telephony/providers/edges/trunks", {
          params: { pageSize: 100 },
        });

        const entities = resp.data.entities || [];
        const data = entities.map((t) => ({
          name: t.name || "",
          state: t.state || "",
          trunkType: t.trunkType || "",
          inService: t.inService != null ? String(t.inService) : "",
          connectedStatus: t.connectedStatus
            ? t.connectedStatus.connected
              ? "connected"
              : "disconnected"
            : "",
        }));

        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });

  trunks
    .command("metrics")
    .description("Show trunk call metrics")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();

      try {
        const client = await createClient(globalOpts);
        const resp = await client.get("/telephony/providers/edges/metrics");
        await printResult(resp.data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
```

- [ ] **Step 2: Register trunks command in cli/index.js**

Uncomment: `require("./commands/trunks.js")(program);`

- [ ] **Step 3: Commit**

```bash
git add cli/commands/trunks.js cli/index.js
git commit -m "feat: add trunks list and metrics commands"
```

---

### Task 7: Queues Command

**Files:**

- Create: `cli/commands/queues.js`
- Modify: `cli/index.js` — register queues command

- [ ] **Step 1: Create queues command**

Create `cli/commands/queues.js`:

```javascript
"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function registerQueuesCommand(program) {
  const queues = program
    .command("queues")
    .description("Routing queue status and stats");

  queues
    .command("list")
    .description("List routing queues")
    .option("--detail", "include observation stats (agents online, waiting)")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();

      try {
        const client = await createClient(globalOpts);
        const resp = await client.get("/routing/queues", {
          params: { pageSize: 100 },
        });

        const entities = resp.data.entities || [];
        let data;

        if (cmdOpts.detail) {
          // Get observation stats for each queue
          const queueIds = entities.map((q) => q.id);
          let observations = {};
          if (queueIds.length > 0) {
            try {
              const obsResp = await client.post(
                "/analytics/queues/observations/query",
                {
                  filter: {
                    type: "or",
                    predicates: queueIds.map((id) => ({
                      dimension: "queueId",
                      value: id,
                    })),
                  },
                  metrics: ["oOnQueueUsers", "oActiveUsers", "oWaiting"],
                },
              );
              for (const result of obsResp.data.results || []) {
                const queueId = result.group && result.group.queueId;
                if (queueId) {
                  const stats = {};
                  for (const d of result.data || []) {
                    if (d.metric && d.stats && d.stats.count != null) {
                      stats[d.metric] = d.stats.count;
                    }
                  }
                  observations[queueId] = stats;
                }
              }
            } catch {
              // Observation query may fail with insufficient permissions
            }
          }
          data = entities.map((q) => {
            const obs = observations[q.id] || {};
            return {
              name: q.name || "",
              memberCount: q.memberCount != null ? q.memberCount : "",
              onQueueUsers: obs.oOnQueueUsers != null ? obs.oOnQueueUsers : "",
              activeUsers: obs.oActiveUsers != null ? obs.oActiveUsers : "",
              waiting: obs.oWaiting != null ? obs.oWaiting : "",
            };
          });
        } else {
          data = entities.map((q) => ({
            name: q.name || "",
            memberCount: q.memberCount != null ? q.memberCount : "",
          }));
        }

        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
```

- [ ] **Step 2: Register queues command in cli/index.js**

Uncomment: `require("./commands/queues.js")(program);`

- [ ] **Step 3: Commit**

```bash
git add cli/commands/queues.js cli/index.js
git commit -m "feat: add queues list command with optional observation stats"
```

---

### Task 8: Complete Test Suite

**Files:**

- Modify: `test/tests.js` — comprehensive tests

- [ ] **Step 1: Replace test/tests.js with full suite**

```javascript
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert");
const fs = require("node:fs");

const BIN = path.join(__dirname, "..", "bin", "genesys-cli.js");
const TEST_CONFIG_DIR = "/tmp/genesys-cli-test-" + process.pid;

function run(args) {
  return execFileSync("node", [BIN, ...args], {
    encoding: "utf-8",
    timeout: 10000,
    env: {
      ...process.env,
      GENESYS_CONFIG_DIR: TEST_CONFIG_DIR,
    },
  });
}

function cleanup() {
  try {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  } catch {}
}

cleanup();

// --help
console.log("Test: --help lists all commands");
const help = run(["--help"]);
assert(help.includes("conversations"), "should list conversations command");
assert(help.includes("trunks"), "should list trunks command");
assert(help.includes("queues"), "should list queues command");
assert(help.includes("doctor"), "should list doctor command");
assert(help.includes("config"), "should list config command");
console.log("  PASS");

// --version
console.log("Test: --version shows version");
const version = run(["--version"]);
assert(
  version.trim().match(/^\d+\.\d+\.\d+$/),
  `expected semver, got ${version.trim()}`,
);
console.log("  PASS");

// config list (empty)
console.log("Test: config list with empty config");
const listOutput = run(["config", "list"]);
assert(listOutput.includes("No results found"), "should show no results");
console.log("  PASS");

// config add
console.log("Test: config add creates org");
const addOutput = run([
  "config",
  "add",
  "test-org",
  "--client-id",
  "test-id",
  "--client-secret",
  "test-secret",
  "--region",
  "usw2",
]);
assert(addOutput.includes("added successfully"), "should confirm add");
console.log("  PASS");

// config list (with org)
console.log("Test: config list shows added org");
const listAfterAdd = run(["config", "list"]);
assert(listAfterAdd.includes("test-org"), "should show org name");
assert(listAfterAdd.includes("usw2"), "should show region");
console.log("  PASS");

// config show (secret masked)
console.log("Test: config show masks secret");
const showOutput = run(["config", "show"]);
assert(!showOutput.includes("test-secret"), "should not show plaintext secret");
assert(
  showOutput.includes("test"),
  "should show masked secret with partial reveal",
);
console.log("  PASS");

// config use
console.log("Test: config add second org and use");
run([
  "config",
  "add",
  "second-org",
  "--client-id",
  "id2",
  "--client-secret",
  "secret2",
  "--region",
  "mypurecloud.com",
]);
const useOutput = run(["config", "use", "second-org"]);
assert(useOutput.includes("second-org"), "should confirm use");
console.log("  PASS");

// config remove
console.log("Test: config remove deletes org");
const removeOutput = run(["config", "remove", "second-org"]);
assert(removeOutput.includes("removed successfully"), "should confirm remove");
const listAfterRemove = run(["config", "list"]);
assert(!listAfterRemove.includes("second-org"), "should not show removed org");
console.log("  PASS");

// Format flags
console.log("Test: config list --format json outputs valid JSON");
const jsonOutput = run(["config", "list", "--format", "json"]);
JSON.parse(jsonOutput);
console.log("  PASS");

console.log("Test: config list --format csv outputs CSV");
const csvOutput = run(["config", "list", "--format", "csv"]);
assert(csvOutput.includes("name"), "should have CSV header");
console.log("  PASS");

// conversations --help
console.log("Test: conversations --help shows subcommands");
const convHelp = run(["conversations", "--help"]);
assert(convHelp.includes("list"), "should list 'list' subcommand");
assert(convHelp.includes("detail"), "should list 'detail' subcommand");
console.log("  PASS");

// trunks --help
console.log("Test: trunks --help shows subcommands");
const trunksHelp = run(["trunks", "--help"]);
assert(trunksHelp.includes("list"), "should list 'list' subcommand");
assert(trunksHelp.includes("metrics"), "should list 'metrics' subcommand");
console.log("  PASS");

// queues --help
console.log("Test: queues --help shows list subcommand");
const queuesHelp = run(["queues", "--help"]);
assert(queuesHelp.includes("list"), "should list 'list' subcommand");
console.log("  PASS");

cleanup();

console.log("\nAll tests passed.");
```

- [ ] **Step 2: Run tests**

Run: `node test/tests.js`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add test/tests.js
git commit -m "test: add comprehensive CLI test suite"
```

---

### Task 9: Final Polish & README

**Files:**

- Create: `README.md`
- Create: `.gitignore`
- Create: `.github/workflows/release.yml`
- Create: `.github/FUNDING.yml`
- Modify: `cli/index.js` — ensure all commands registered

- [ ] **Step 1: Verify cli/index.js has all commands registered**

```javascript
require("./commands/config.js")(program);
require("./commands/doctor.js")(program);
require("./commands/conversations.js")(program);
require("./commands/trunks.js")(program);
require("./commands/queues.js")(program);
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.DS_Store
.env
audit.jsonl
```

- [ ] **Step 3: Create README.md**

Follow the audiocodes-cli README pattern with badges, quick start, commands table, global flags table, and firmware compatibility section replaced with a Genesys Cloud regions section.

- [ ] **Step 4: Create release workflow and FUNDING.yml**

Same as audiocodes-cli — `.github/workflows/release.yml` with npm trusted publishing and `.github/FUNDING.yml` with buymeacoffee.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add README.md .gitignore .github/ cli/index.js
git commit -m "docs: add README, release workflow, and finalize command registration"
```
