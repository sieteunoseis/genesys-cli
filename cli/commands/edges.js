"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function registerEdgesCommand(program) {
  const edges = program
    .command("edges")
    .description("Edge server status and diagnostics");

  edges
    .command("list")
    .description("List Edge servers and their status")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);
        const resp = await client.get("/telephony/providers/edges", {
          params: { pageSize: 100 },
        });
        const entities = resp.data.entities || [];
        const data = entities.map((e) => ({
          name: e.name || "",
          state: e.state || "",
          onlineStatus: e.onlineStatus || "",
          edgeGroup: e.edgeGroup ? e.edgeGroup.name || "" : "",
          site: e.site ? e.site.name || "" : "",
          softwareVersion: e.softwareVersion || "",
        }));
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });

  edges
    .command("sites")
    .description("List telephony sites")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);
        const resp = await client.get("/telephony/providers/edges/sites", {
          params: { pageSize: 100 },
        });
        const entities = resp.data.entities || [];
        const data = entities.map((s) => ({
          name: s.name || "",
          state: s.state || "",
          location: s.location ? s.location.name || "" : "",
          managed: s.managed != null ? String(s.managed) : "",
        }));
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
