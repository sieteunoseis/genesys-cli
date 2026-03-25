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
