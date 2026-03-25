# Genesys Cloud API Setup

## Prerequisites

- Genesys Cloud CX organization with admin access
- A role with appropriate permissions for the API operations you need

## Step 1: Create an OAuth Client

1. Log in to Genesys Cloud admin at `https://apps.{region}.pure.cloud`
2. Navigate to **Admin** > **Integrations** > **OAuth**
3. Click **Add Client**
4. Fill in:
   - **App Name:** `genesys-cli`
   - **Description:** `CLI tool for Genesys Cloud troubleshooting`
   - **Grant Type:** Select **Client Credentials**
   - **Roles:** Assign a role with the permissions below
5. Click **Save**
6. Copy the **Client ID** and **Client Secret** — the secret is only shown once

## Step 2: Assign Permissions

Create a custom role or use an existing one with these permissions:

### Minimum permissions for troubleshooting

| Permission                             | What it enables                             |
| -------------------------------------- | ------------------------------------------- |
| `analytics:conversationDetail:view`    | Query conversation history and call details |
| `analytics:conversationAggregate:view` | Query aggregated call statistics            |
| `conversation:communication:view`      | View active conversations                   |
| `telephony:plugin:all`                 | View edges, trunks, and telephony config    |
| `quality:evaluation:view`              | View call quality evaluations               |
| `routing:queue:view`                   | View queue stats and membership             |
| `user:view`                            | View user/agent details                     |
| `audit:audit:view`                     | View audit/change history                   |

### Additional permissions for BYOC trunk management

| Permission                         | What it enables                                  |
| ---------------------------------- | ------------------------------------------------ |
| `telephony:plugin:all`             | Full telephony management (edges, trunks, sites) |
| `telephony:phoneBaseSettings:view` | View phone base settings                         |

## Step 3: Identify Your Region

Genesys Cloud has multiple regions. Your login and API URLs depend on your region:

| Region                | Login URL                  | API URL                  |
| --------------------- | -------------------------- | ------------------------ |
| US East (N. Virginia) | `login.mypurecloud.com`    | `api.mypurecloud.com`    |
| US West (Oregon)      | `login.usw2.pure.cloud`    | `api.usw2.pure.cloud`    |
| Canada                | `login.cac1.pure.cloud`    | `api.cac1.pure.cloud`    |
| EU (Ireland)          | `login.mypurecloud.ie`     | `api.mypurecloud.ie`     |
| EU (Frankfurt)        | `login.mypurecloud.de`     | `api.mypurecloud.de`     |
| EU (London)           | `login.euw2.pure.cloud`    | `api.euw2.pure.cloud`    |
| Asia Pacific (Mumbai) | `login.aps1.pure.cloud`    | `api.aps1.pure.cloud`    |
| Asia Pacific (Seoul)  | `login.apne2.pure.cloud`   | `api.apne2.pure.cloud`   |
| Asia Pacific (Sydney) | `login.mypurecloud.com.au` | `api.mypurecloud.com.au` |
| Asia Pacific (Tokyo)  | `login.mypurecloud.jp`     | `api.mypurecloud.jp`     |
| South America         | `login.sae1.pure.cloud`    | `api.sae1.pure.cloud`    |
| Middle East           | `login.mec1.pure.cloud`    | `api.mec1.pure.cloud`    |

## Step 4: Configure the CLI

```bash
# Add your Genesys Cloud org
genesys-cli config add <name> --client-id <id> --client-secret "$GENESYS_CLIENT_SECRET" --region usw2

# Test connectivity
genesys-cli config test

# Or use environment variables
export GENESYS_CLIENT_ID=your-client-id
export GENESYS_CLIENT_SECRET=your-client-secret
export GENESYS_REGION=usw2
```

## Authentication Flow

The CLI uses the **OAuth 2.0 Client Credentials** grant:

```
POST https://login.{region}.pure.cloud/oauth/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Response:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

The CLI handles token caching and refresh automatically. Tokens are valid for 24 hours by default.

## API Rate Limits

Genesys Cloud enforces rate limits per OAuth client:

| Limit Type         | Threshold                                            |
| ------------------ | ---------------------------------------------------- |
| Per-org rate limit | 300 requests/minute (may vary)                       |
| Analytics queries  | Lower limits, use intervals                          |
| Burst              | Short bursts allowed, sustained high rates throttled |

The CLI implements automatic retry with backoff for 429 (Too Many Requests) responses.

## Security Notes

- Never commit `client_secret` to source control
- Use environment variables or `ss-cli` placeholders for credentials
- The CLI stores credentials in `~/.genesys-cli/config.json` with file permissions `0600`
- OAuth client credentials should be rotated periodically in Genesys Cloud admin

## References

- [Create an OAuth Client](https://help.genesys.cloud/articles/create-an-oauth-client/)
- [Client Credentials Grant](https://developer.genesys.cloud/authorization/platform-auth/use-client-credentials)
- [Platform API Reference](https://developer.genesys.cloud/api/rest/index.html)
- [API Rate Limits](https://developer.genesys.cloud/platform/api/rate-limits)
