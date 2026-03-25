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

module.exports = function registerConversationsCommand(program) {
  const conversations = program
    .command("conversations")
    .description("Query conversation history and details");

  conversations
    .command("list")
    .description("Query recent conversations")
    .option("--last <duration>", "relative time range: 30m, 2h, 1d, 7d", "24h")
    .option("--caller <number>", "filter by caller/ANI number")
    .option("--callee <number>", "filter by callee/DNIS number")
    .option("--queue <name>", "filter by queue name")
    .option("--disconnect-reason <reason>", "filter by disconnect type")
    .option("--limit <n>", "max results", "25")
    .action(async (cmdOpts, command) => {
      const startTime = Date.now();
      const globalOpts = command.optsWithGlobals();
      let status = "success";
      let errorMsg;

      try {
        const client = await createClient(globalOpts);

        const durationMs = parseDuration(cmdOpts.last);
        const now = new Date();
        const start = new Date(now.getTime() - durationMs);

        const body = {
          interval: `${start.toISOString()}/${now.toISOString()}`,
          order: "desc",
          orderBy: "conversationStart",
          paging: {
            pageSize: parseInt(cmdOpts.limit, 10),
            pageNumber: 1,
          },
          segmentFilters: [],
          conversationFilters: [],
        };

        if (cmdOpts.caller) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "ani", value: cmdOpts.caller }],
          });
        }
        if (cmdOpts.callee) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "dnis", value: cmdOpts.callee }],
          });
        }
        if (cmdOpts.queue) {
          body.segmentFilters.push({
            type: "and",
            predicates: [{ dimension: "queueId", value: cmdOpts.queue }],
          });
        }
        if (cmdOpts.disconnectReason) {
          body.segmentFilters.push({
            type: "and",
            predicates: [
              { dimension: "disconnectType", value: cmdOpts.disconnectReason },
            ],
          });
        }

        const resp = await client.post(
          "/analytics/conversations/details/query",
          body,
        );

        const conversations = resp.data.conversations || [];
        const data = conversations.map((c) => {
          const firstParticipant = c.participants && c.participants[0];
          const firstSession =
            firstParticipant &&
            firstParticipant.sessions &&
            firstParticipant.sessions[0];
          const firstSegment =
            firstSession && firstSession.segments && firstSession.segments[0];
          const cleanNumber = (n) =>
            n ? n.replace(/^tel:\+?|^sip:/i, "").replace(/@.*$/, "") : "";
          return {
            conversationId: c.conversationId || "",
            time: c.conversationStart
              ? new Date(c.conversationStart).toLocaleTimeString()
              : "",
            caller: cleanNumber(firstSession ? firstSession.ani : ""),
            callee: cleanNumber(firstSession ? firstSession.dnis : ""),
            direction: firstSession ? firstSession.direction || "" : "",
            disconnectType: firstSegment
              ? firstSegment.disconnectType || ""
              : "",
            sipResponseCode: firstSegment
              ? firstSegment.sipResponseCode || ""
              : "",
          };
        });

        await printResult(data, globalOpts.format);
      } catch (err) {
        status = "error";
        errorMsg = err.message;
        printError(err);
      } finally {
        if (globalOpts.audit !== false) {
          const { logAudit } = require("../utils/audit.js");
          const { getActiveOrg } = require("../utils/config.js");
          const orgName = getActiveOrg(globalOpts.org)?.name || "env/flags";
          logAudit({
            org: orgName,
            operation: "conversations.list",
            duration_ms: Date.now() - startTime,
            status,
            ...(errorMsg && { error: errorMsg }),
          });
        }
      }
    });

  conversations
    .command("detail <conversationId>")
    .description("Get full detail for a conversation")
    .action(async (conversationId, cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();

      try {
        const client = await createClient(globalOpts);
        const resp = await client.get(`/conversations/${conversationId}`);
        await printResult(resp.data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
