"use strict";

const { createClient } = require("../utils/connection.js");
const { printResult, printError } = require("../utils/output.js");

module.exports = function registerExternalContactsCommand(program) {
  const contacts = program
    .command("external-contacts")
    .description("Look up external contacts");

  contacts
    .command("get <contactId>")
    .description("Get an external contact by ID")
    .action(async (contactId, cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);
        const resp = await client.get(
          `/externalcontacts/contacts/${contactId}`,
        );
        await printResult(resp.data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });

  contacts
    .command("list")
    .description("List external contacts, optionally filtered by name or phone")
    .option("--query <text>", "filter by name, email, or phone number")
    .option("--limit <n>", "max results", "100")
    .action(async (cmdOpts, command) => {
      const globalOpts = command.optsWithGlobals();
      try {
        const client = await createClient(globalOpts);
        const params = { pageSize: parseInt(cmdOpts.limit, 10) };
        if (cmdOpts.query) params.q = cmdOpts.query;

        const resp = await client.get("/externalcontacts/contacts", { params });
        const entities = resp.data.entities || [];
        const data = entities.map((c) => ({
          id: c.id || "",
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          company: c.company || "",
          cellPhone: c.cellPhone ? c.cellPhone.display || "" : "",
          workPhone: c.workPhone ? c.workPhone.display || "" : "",
          workEmail: c.workEmail || "",
          type: c.type || "",
        }));
        await printResult(data, globalOpts.format);
      } catch (err) {
        printError(err);
      }
    });
};
