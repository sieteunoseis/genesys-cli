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
