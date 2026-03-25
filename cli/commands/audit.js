"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

function parseDuration(str) {
  const match = str.match(/^(\d+)(m|h|d)$/);
  if (!match)
    throw new Error(`Invalid duration "${str}". Use format: 30m, 2h, 7d`);
  const [, num, unit] = match;
  const ms = { m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num, 10) * ms[unit];
}

module.exports = function registerAuditCommand(program) {
  const audit = program
    .command("audit")
    .description("Configuration change history");

  audit
    .command("list")
    .description("Query recent configuration changes")
    .option("--last <duration>", "relative time range: 30m, 2h, 1d, 7d", "24h")
    .option("--user <name>", "filter by user name")
    .option("--entity <type>", "filter by entity type")
    .option("--action <action>", "filter by action (Create, Update, Delete)")
    .option("--limit <n>", "max results", "25")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);

        const durationMs = parseDuration(cmdOpts.last);
        const now = new Date();
        const start = new Date(now.getTime() - durationMs);

        const body = {
          interval: `${start.toISOString()}/${now.toISOString()}`,
          pageSize: parseInt(cmdOpts.limit, 10),
          pageNumber: 1,
          sort: [{ name: "Timestamp", sortOrder: "descending" }],
          filters: [],
        };

        if (cmdOpts.user) {
          body.filters.push({
            property: "UserName",
            value: cmdOpts.user,
          });
        }
        if (cmdOpts.entity) {
          body.filters.push({
            property: "EntityType",
            value: cmdOpts.entity,
          });
        }
        if (cmdOpts.action) {
          body.filters.push({
            property: "Action",
            value: cmdOpts.action,
          });
        }

        const resp = await client.post("/audits/query/realtime", body);
        const entities = resp.data.entities || [];
        const data = entities.map((a) => ({
          timestamp: a.eventDate ? new Date(a.eventDate).toLocaleString() : "",
          user: a.user ? a.user.name || "" : "",
          action: a.action || "",
          entityType: a.entityType || "",
          entityName: a.entity ? a.entity.name || "" : "",
        }));
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
