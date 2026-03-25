"use strict";

const {
  loadConfig,
  getConfigPath,
  getConfigDir,
} = require("../utils/config.js");
const {
  resolveConfig,
  createClient,
  resolveRegion,
} = require("../utils/connection.js");

module.exports = function registerDoctorCommand(program) {
  program
    .command("doctor")
    .description("Check Genesys Cloud connectivity and configuration health")
    .action(async (opts, command) => {
      const globalOpts = command.optsWithGlobals();
      let passed = 0;
      let warned = 0;
      let failed = 0;

      const ok = (msg) => {
        console.log(`  \u2713 ${msg}`);
        passed++;
      };
      const warn = (msg) => {
        console.log(`  \u26A0 ${msg}`);
        warned++;
      };
      const fail = (msg) => {
        console.log(`  \u2717 ${msg}`);
        failed++;
      };

      console.log("\n  genesys-cli doctor");
      console.log("  " + "\u2500".repeat(50));

      console.log("\n  Configuration");
      let conn;
      try {
        const data = loadConfig();
        if (!data.activeOrg) {
          fail("No active org configured");
          console.log(
            "    Run: genesys-cli config add <name> --client-id <id> --client-secret <secret> --region <region>",
          );
          printSummary(passed, warned, failed);
          return;
        }
        ok(`Active org: ${data.activeOrg}`);
        const org = data.orgs[data.activeOrg];
        ok(`Region: ${org.region}`);
        ok(`Client ID: ${org.clientId}`);

        conn = await resolveConfig(globalOpts);
        const regionInfo = resolveRegion(conn.region);
        ok(`API endpoint: ${regionInfo.api}`);
      } catch (err) {
        fail(`Config error: ${err.message}`);
        printSummary(passed, warned, failed);
        return;
      }

      console.log("\n  OAuth");
      try {
        const client = await createClient(globalOpts);
        ok("Token acquisition: success");

        const resp = await client.get("/organizations/me");
        ok(`Org name: ${resp.data.name}`);
        ok(`Org ID: ${resp.data.id}`);
        if (resp.data.state) ok(`State: ${resp.data.state}`);
      } catch (err) {
        const msg = err.message || String(err);
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          fail("OAuth: authentication failed \u2014 check client credentials");
        } else if (msg.includes("403") || msg.includes("Forbidden")) {
          fail("OAuth: insufficient permissions \u2014 check role assignments");
        } else if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
          fail(
            "OAuth: cannot reach Genesys Cloud \u2014 check region and network",
          );
        } else {
          fail(`OAuth: ${msg}`);
        }
      }

      console.log("\n  Security");
      try {
        const fs = require("node:fs");
        const configPath = getConfigPath();
        const stats = fs.statSync(configPath);
        const mode = (stats.mode & 0o777).toString(8);
        if (mode === "600") ok(`Config file permissions: ${mode} (secure)`);
        else
          warn(
            `Config file permissions: ${mode} \u2014 should be 600. Run: chmod 600 ${configPath}`,
          );
      } catch {
        /* config file may not exist yet */
      }

      try {
        const fs = require("node:fs");
        const path = require("node:path");
        const auditPath = path.join(getConfigDir(), "audit.jsonl");
        if (fs.existsSync(auditPath)) {
          const stats = fs.statSync(auditPath);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
          ok(`Audit trail: ${sizeMB}MB`);
          if (stats.size > 8 * 1024 * 1024)
            warn("Audit trail approaching 10MB rotation limit");
        } else {
          ok("Audit trail: empty (no operations logged yet)");
        }
      } catch {
        /* ignore */
      }

      printSummary(passed, warned, failed);
    });

  function printSummary(passed, warned, failed) {
    console.log("\n  " + "\u2500".repeat(50));
    console.log(
      `  Results: ${passed} passed, ${warned} warning${warned !== 1 ? "s" : ""}, ${failed} failed`,
    );
    if (failed > 0) {
      process.exitCode = 1;
      console.log("  Status:  issues found \u2014 review failures above");
    } else if (warned > 0) {
      console.log("  Status:  healthy with warnings");
    } else {
      console.log("  Status:  all systems healthy");
    }
    console.log("");
  }
};
