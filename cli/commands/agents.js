"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function registerAgentsCommand(program) {
  const agents = program
    .command("agents")
    .description("Agent presence and status");

  agents
    .command("list")
    .description("List agents with presence status")
    .option("--queue <name>", "filter by queue name")
    .option("--limit <n>", "max results", "100")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);

        let url = "/users";
        const params = {
          pageSize: parseInt(cmdOpts.limit, 10),
          expand: ["presence", "routingStatus"],
        };

        if (cmdOpts.queue) {
          // Look up queue ID first
          const qResp = await client.get("/routing/queues", {
            params: { name: cmdOpts.queue, pageSize: 1 },
          });
          const queues = qResp.data.entities || [];
          if (queues.length === 0) {
            printError(new Error(`Queue "${cmdOpts.queue}" not found`));
            return;
          }
          url = `/routing/queues/${queues[0].id}/members`;
          params.expand = ["presence", "routingStatus"];
        }

        const resp = await client.get(url, { params });
        const entities = resp.data.entities || [];
        const data = entities.map((u) => ({
          name: u.name || "",
          email: u.email || "",
          presence: u.presence
            ? u.presence.presenceDefinition
              ? u.presence.presenceDefinition.systemPresence || ""
              : ""
            : "",
          routingStatus: u.routingStatus ? u.routingStatus.status || "" : "",
          state: u.state || "",
        }));
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
