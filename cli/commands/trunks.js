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
        const data = entities.map((t) => {
          // Strip UUID suffixes from trunk names (e.g. "OHSU-DCR-C3-LAB Trunk 8c0b49ed-...")
          let name = t.name || "";
          name = name.replace(
            /\s+(?:Trunk\s+)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
            "",
          );
          // Clean up tie trunk names
          name = name.replace(
            /Tie trunk between Edge [0-9a-f-]+ and Edge [0-9a-f-]+/i,
            "Tie Trunk",
          );
          return {
            name,
            state: t.state || "",
            trunkType: t.trunkType || "",
            inService: t.inService != null ? String(t.inService) : "",
            connectedStatus: t.connectedStatus
              ? t.connectedStatus.connected
                ? "connected"
                : "disconnected"
              : "",
          };
        });

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
        // First get trunk IDs
        const listResp = await client.get("/telephony/providers/edges/trunks", {
          params: { pageSize: 100 },
        });
        const entities = listResp.data.entities || [];
        const trunkIds = entities
          .filter((t) => t.trunkType === "EXTERNAL")
          .map((t) => t.id);

        if (trunkIds.length === 0) {
          await printResult([], globalOpts.format);
          return;
        }

        const metricsResp = await client.get(
          "/telephony/providers/edges/trunks/metrics",
          { params: { trunkIds: trunkIds.join(",") } },
        );
        const metrics = metricsResp.data.entities || metricsResp.data || [];
        const data = Array.isArray(metrics)
          ? metrics.map((m) => {
              let name = m.trunk && m.trunk.name ? m.trunk.name : "";
              name = name.replace(
                /\s+(?:Trunk\s+)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
                "",
              );
              return {
                name,
                callsInProgress:
                  m.calls && m.calls.inProgress != null
                    ? m.calls.inProgress
                    : "",
                callsCompleted:
                  m.calls && m.calls.completed != null ? m.calls.completed : "",
                callsErrored:
                  m.calls && m.calls.errored != null ? m.calls.errored : "",
                qos:
                  m.qos && m.qos.mismatchCount != null
                    ? m.qos.mismatchCount
                    : "",
              };
            })
          : metrics;
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
