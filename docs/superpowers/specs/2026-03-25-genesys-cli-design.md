# genesys-cli Design Spec

## Overview

Node.js CLI tool for troubleshooting VoIP and contact center operations on Genesys Cloud CX via the Platform API. Query conversation history, monitor BYOC trunk health, check queue stats, and manage org configurations.

## Architecture

Direct REST client using axios with OAuth 2.0 Client Credentials authentication. Commander.js CLI with 4-format output (table, json, csv, toon). Config, audit, and error handling follow the established audiocodes-cli/cisco-yang patterns exactly.

## Tech Stack

- Node.js (CommonJS)
- Commander.js (CLI framework)
- axios (HTTP client)
- cli-table3 (table formatting)
- csv-stringify (CSV output)
- @toon-format/toon (universal format)
- update-notifier (version checks)

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
| `cli/commands/queues.js`        | Queue stats and agent counts                                                         |
| `cli/commands/doctor.js`        | Health check command                                                                 |
| `test/tests.js`                 | CLI unit tests                                                                       |

## Authentication

### OAuth 2.0 Client Credentials Flow

The CLI uses the Client Credentials grant type — no user interaction needed.

**Token acquisition:**

```
POST https://login.{region-domain}/oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

**Response:**

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Token lifecycle:**

- Tokens cached in memory (not persisted to disk)
- Refreshed automatically when expired
- On 401 response, refresh token and retry once
- All API requests include `Authorization: Bearer <token>` header

### Region Mapping

The `region` config value maps to login and API domains:

| Short Name                               | Login Domain               | API Domain               |
| ---------------------------------------- | -------------------------- | ------------------------ |
| `us-east-1` or `mypurecloud.com`         | `login.mypurecloud.com`    | `api.mypurecloud.com`    |
| `usw2` or `usw2.pure.cloud`              | `login.usw2.pure.cloud`    | `api.usw2.pure.cloud`    |
| `cac1` or `cac1.pure.cloud`              | `login.cac1.pure.cloud`    | `api.cac1.pure.cloud`    |
| `eu-west-1` or `mypurecloud.ie`          | `login.mypurecloud.ie`     | `api.mypurecloud.ie`     |
| `eu-central-1` or `mypurecloud.de`       | `login.mypurecloud.de`     | `api.mypurecloud.de`     |
| `euw2` or `euw2.pure.cloud`              | `login.euw2.pure.cloud`    | `api.euw2.pure.cloud`    |
| `aps1` or `aps1.pure.cloud`              | `login.aps1.pure.cloud`    | `api.aps1.pure.cloud`    |
| `apne2` or `apne2.pure.cloud`            | `login.apne2.pure.cloud`   | `api.apne2.pure.cloud`   |
| `ap-southeast-2` or `mypurecloud.com.au` | `login.mypurecloud.com.au` | `api.mypurecloud.com.au` |
| `ap-northeast-1` or `mypurecloud.jp`     | `login.mypurecloud.jp`     | `api.mypurecloud.jp`     |
| `sae1` or `sae1.pure.cloud`              | `login.sae1.pure.cloud`    | `api.sae1.pure.cloud`    |
| `mec1` or `mec1.pure.cloud`              | `login.mec1.pure.cloud`    | `api.mec1.pure.cloud`    |

Accept both short names and full domain formats. If the region value contains `.pure.cloud` or `.mypurecloud`, treat it as a full domain.

## Configuration

### Config File

Stored at `~/.genesys-cli/config.json` (mode 0600).

```json
{
  "activeOrg": "lab",
  "orgs": {
    "lab": {
      "clientId": "abc123",
      "clientSecret": "secret-or-ss-placeholder",
      "region": "usw2"
    }
  }
}
```

### Config Precedence

CLI flags > environment variables > config file.

### Environment Variables

Support both prefixed and unprefixed forms:

| Prefixed                | Unprefixed      | Purpose                   |
| ----------------------- | --------------- | ------------------------- |
| `GENESYS_CLIENT_ID`     | `CLIENT_ID`     | OAuth client ID           |
| `GENESYS_CLIENT_SECRET` | `CLIENT_SECRET` | OAuth client secret       |
| `GENESYS_REGION`        | `REGION`        | Genesys Cloud region      |
| `GENESYS_CONFIG_DIR`    | —               | Override config directory |

Prefixed takes priority over unprefixed.

### Secret Server Support

Password fields support `<ss:ID:field>` placeholders resolved via `ss-cli get` at runtime. Same implementation as audiocodes-cli.

## Day-One Commands

### `config` — Org Configuration Management

Subcommands: `add`, `use`, `list`, `show`, `remove`, `test`

**`config add <name>`** — requires `--client-id` and `--region`. Client secret provided via `--client-secret "$GENESYS_CLIENT_SECRET"` or env var.

**`config test`** — acquires OAuth token and calls `GET /api/v2/organizations/me` to verify.

### `conversations list` — Query Conversation History

```
POST /api/v2/analytics/conversations/details/query
```

**Options:**

- `--last <duration>` — relative time range: 30m, 2h, 1d, 7d (default: 24h)
- `--caller <number>` — filter by ANI/caller number
- `--callee <number>` — filter by DNIS/called number
- `--queue <name>` — filter by queue name
- `--disconnect-reason <reason>` — filter by disconnect type
- `--limit <n>` — max results (default: 25)

**Display columns:** conversationStart, caller, callee, direction, duration, disconnectType, sipResponseCode, queueName

### `conversations detail <id>` — Full Conversation Detail

```
GET /api/v2/conversations/{conversationId}
```

Shows all participants, call legs, media stats, transfer history, and disconnect reasons.

### `trunks list` — BYOC Trunk Status

```
GET /api/v2/telephony/providers/edges/trunks
```

**Display columns:** name, state, trunkType, inService, connectedStatus

### `trunks metrics` — Trunk Metrics

```
GET /api/v2/telephony/providers/edges/metrics
```

Shows call counts, error counts, and utilization per trunk.

### `queues list` — Queue Overview

```
GET /api/v2/routing/queues
```

**Options:**

- `--detail` — include observation stats (active conversations, waiting, agents online)

**Display columns:** name, memberCount. With `--detail`: onQueueUsers, activeConversations, waitingConversations.

### `doctor` — Health Check

Checks:

1. Config — active org, region, client ID present
2. OAuth — token acquisition succeeds
3. API — `GET /api/v2/organizations/me` returns org info
4. Display: org name, org ID, region, token expiry

Visual output with checkmarks/crosses like audiocodes-cli doctor.

## Global Options

| Flag                       | Description                           | Default    |
| -------------------------- | ------------------------------------- | ---------- |
| `--format <type>`          | Output format: table, json, toon, csv | `table`    |
| `--org <name>`             | Use a specific named org from config  | active org |
| `--client-id <id>`         | Override client ID                    | —          |
| `--client-secret <secret>` | Override client secret                | —          |
| `--region <region>`        | Override region                       | —          |
| `--clean`                  | Remove empty/null values from results | —          |
| `--no-audit`               | Disable audit logging                 | —          |
| `--debug`                  | Enable debug logging                  | —          |

## Error Handling

String matching approach (no custom error classes). Context-specific hints:

| Error Pattern           | Hint                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| 401 / Unauthorized      | Check client credentials. Run: `genesys-cli config test`                  |
| 403 / Forbidden         | Insufficient permissions. Check OAuth client role in Genesys Cloud admin. |
| 429 / Too Many Requests | Rate limited. The CLI retries automatically with backoff.                 |
| ECONNREFUSED            | Check region setting and network connectivity.                            |
| Token errors            | OAuth token expired or invalid. Run: `genesys-cli config test`            |

## Audit Logging

JSONL format at `~/.genesys-cli/audit.jsonl` with rotation at 10MB. Same implementation as audiocodes-cli. Credentials (clientId, clientSecret, token) are redacted from audit entries.

## Rate Limit Handling

The connection utility implements automatic retry with exponential backoff for 429 responses:

- First retry after 1 second
- Second retry after 2 seconds
- Third retry after 4 seconds
- Max 3 retries, then surface the error

## Testing

Test isolation via `GENESYS_CONFIG_DIR` env var pointing to temp directories. Tests cover:

- `--help` lists all commands
- `--version` shows semver
- Config round-trip (add/use/list/show/remove)
- Format flags (json, csv)
- Command help output
