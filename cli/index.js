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
require("./commands/config.js")(program);
require("./commands/doctor.js")(program);
require("./commands/conversations.js")(program);
// require("./commands/trunks.js")(program);
// require("./commands/queues.js")(program);

program.parse();
