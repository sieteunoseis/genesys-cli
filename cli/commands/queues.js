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
