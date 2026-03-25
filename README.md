# Genesys CLI

[![npm version](https://img.shields.io/npm/v/@sieteunoseis/genesys-cli.svg)](https://www.npmjs.com/package/@sieteunoseis/genesys-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@sieteunoseis/genesys-cli.svg)](https://nodejs.org)
[![Skills](https://img.shields.io/badge/skills.sh-genesys--cli-blue)](https://skills.sh/sieteunoseis/genesys-cli)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-orange?logo=buy-me-a-coffee)](https://buymeacoffee.com/automatebldrs)

A CLI for Genesys Cloud CX via Platform API. Query conversation history, monitor BYOC trunks, inspect routing queues, and troubleshoot contact center health from the terminal.

## Installation

```bash
npm install -g @sieteunoseis/genesys-cli
```

Or run without installing:

```bash
npx @sieteunoseis/genesys-cli --help
```

### AI Agent Skills

```bash
npx skills add sieteunoseis/genesys-cli
```

## Requirements

You need an OAuth client with the **Client Credentials** grant type configured in Genesys Cloud admin. See [docs/API.md](docs/API.md) for step-by-step instructions on creating an OAuth client and assigning the minimum required permissions.

## Quick Start

```bash
# Add your Genesys Cloud org (use an env var for the secret)
genesys-cli config add my-org --client-id <id> --client-secret "$GENESYS_CLIENT_SECRET" --region usw2

# Test the connection
genesys-cli config test

# Check API connectivity and token health
genesys-cli doctor

# List recent conversations
genesys-cli conversations list

# List BYOC trunks
genesys-cli trunks list

# List routing queues
genesys-cli queues list
```

## Configuration

```bash
genesys-cli config add <name> --client-id <id> --client-secret <secret> --region <region>
genesys-cli config use <name>       # switch active org
genesys-cli config list             # list all configured orgs
genesys-cli config show             # show active org (masks secrets)
genesys-cli config remove <name>    # remove an org
genesys-cli config test             # test connectivity
```

Auth precedence: CLI flags > env vars > config file.

Config stored at `~/.genesys-cli/config.json`. Supports [ss-cli](https://github.com/sieteunoseis/ss-cli) `<ss:ID:field>` placeholders for secrets.

### Environment Variables

| Variable                                   | Description                 |
| ------------------------------------------ | --------------------------- |
| `GENESYS_CLIENT_ID` or `CLIENT_ID`         | OAuth client ID             |
| `GENESYS_CLIENT_SECRET` or `CLIENT_SECRET` | OAuth client secret         |
| `GENESYS_REGION` or `REGION`               | Region short name or domain |

## CLI Commands

| Command                                | Description                                         |
| -------------------------------------- | --------------------------------------------------- |
| `conversations list`                   | Query recent conversations with optional filters    |
| `conversations detail <id>`            | Show full detail for a specific conversation        |
| `trunks list`                          | List BYOC trunks and their status                   |
| `trunks metrics`                       | Show real-time trunk metrics                        |
| `queues list`                          | List routing queues (use `--detail` for live stats) |
| `doctor`                               | Check API connectivity and OAuth token health       |
| `config add/use/list/show/remove/test` | Manage Genesys Cloud org configurations             |

## Supported Regions

| Region                | Short Name       | API Domain               |
| --------------------- | ---------------- | ------------------------ |
| US East (N. Virginia) | `us-east-1`      | `api.mypurecloud.com`    |
| US West (Oregon)      | `usw2`           | `api.usw2.pure.cloud`    |
| Canada                | `cac1`           | `api.cac1.pure.cloud`    |
| EU (Ireland)          | `eu-west-1`      | `api.mypurecloud.ie`     |
| EU (Frankfurt)        | `eu-central-1`   | `api.mypurecloud.de`     |
| EU (London)           | `euw2`           | `api.euw2.pure.cloud`    |
| Asia Pacific (Mumbai) | `aps1`           | `api.aps1.pure.cloud`    |
| Asia Pacific (Seoul)  | `apne2`          | `api.apne2.pure.cloud`   |
| Asia Pacific (Sydney) | `ap-southeast-2` | `api.mypurecloud.com.au` |
| Asia Pacific (Tokyo)  | `ap-northeast-1` | `api.mypurecloud.jp`     |
| South America         | `sae1`           | `api.sae1.pure.cloud`    |
| Middle East           | `mec1`           | `api.mec1.pure.cloud`    |

## Global Flags

| Flag                              | Description                           |
| --------------------------------- | ------------------------------------- |
| `--format table\|json\|toon\|csv` | Output format (default: table)        |
| `--client-id <id>`                | Override OAuth client ID              |
| `--client-secret <secret>`        | Override OAuth client secret          |
| `--region <region>`               | Override region                       |
| `--org <name>`                    | Select named org from config          |
| `--clean`                         | Remove empty/null values from results |
| `--no-audit`                      | Disable audit logging                 |
| `--debug`                         | Enable debug logging                  |

## Giving Back

If you found this helpful, consider:

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/automatebldrs)

## License

MIT
