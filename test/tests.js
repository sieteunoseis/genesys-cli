"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert");
const fs = require("node:fs");

const BIN = path.join(__dirname, "..", "bin", "genesys-cli.js");
const TEST_CONFIG_DIR = "/tmp/genesys-cli-test-" + process.pid;

function run(args) {
  return execFileSync("node", [BIN, ...args], {
    encoding: "utf-8",
    timeout: 10000,
    env: { ...process.env, GENESYS_CONFIG_DIR: TEST_CONFIG_DIR },
  });
}

function cleanup() {
  try {
    fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
  } catch {}
}

cleanup();

console.log("Test: --help lists all commands");
const help = run(["--help"]);
assert(help.includes("conversations"), "should list conversations");
assert(help.includes("trunks"), "should list trunks");
assert(help.includes("queues"), "should list queues");
assert(help.includes("doctor"), "should list doctor");
assert(help.includes("config"), "should list config");
console.log("  PASS");

console.log("Test: --version shows version");
const version = run(["--version"]);
assert(
  version.trim().match(/^\d+\.\d+\.\d+$/),
  `expected semver, got ${version.trim()}`,
);
console.log("  PASS");

console.log("Test: config list with empty config");
const listOutput = run(["config", "list"]);
assert(listOutput.includes("No results found"), "should show no results");
console.log("  PASS");

console.log("Test: config add creates org");
const addOutput = run([
  "config",
  "add",
  "test-org",
  "--client-id",
  "test-id",
  "--client-secret",
  "test-secret",
  "--region",
  "usw2",
]);
assert(addOutput.includes("added successfully"), "should confirm add");
console.log("  PASS");

console.log("Test: config list shows added org");
const listAfterAdd = run(["config", "list"]);
assert(listAfterAdd.includes("test-org"), "should show org name");
assert(listAfterAdd.includes("usw2"), "should show region");
console.log("  PASS");

console.log("Test: config show masks secret");
const showOutput = run(["config", "show"]);
assert(!showOutput.includes("test-secret"), "should not show plaintext secret");
console.log("  PASS");

console.log("Test: config add second org and use");
run([
  "config",
  "add",
  "second-org",
  "--client-id",
  "id2",
  "--client-secret",
  "secret2",
  "--region",
  "mypurecloud.com",
]);
const useOutput = run(["config", "use", "second-org"]);
assert(useOutput.includes("second-org"), "should confirm use");
console.log("  PASS");

console.log("Test: config remove deletes org");
const removeOutput = run(["config", "remove", "second-org"]);
assert(removeOutput.includes("removed successfully"), "should confirm remove");
const listAfterRemove = run(["config", "list"]);
assert(!listAfterRemove.includes("second-org"), "should not show removed org");
console.log("  PASS");

console.log("Test: config list --format json outputs valid JSON");
const jsonOutput = run(["config", "list", "--format", "json"]);
JSON.parse(jsonOutput);
console.log("  PASS");

console.log("Test: config list --format csv outputs CSV");
const csvOutput = run(["config", "list", "--format", "csv"]);
assert(csvOutput.includes("name"), "should have CSV header");
console.log("  PASS");

console.log("Test: conversations --help shows subcommands");
const convHelp = run(["conversations", "--help"]);
assert(convHelp.includes("list"), "should list 'list' subcommand");
assert(convHelp.includes("detail"), "should list 'detail' subcommand");
console.log("  PASS");

console.log("Test: trunks --help shows subcommands");
const trunksHelp = run(["trunks", "--help"]);
assert(trunksHelp.includes("list"), "should list 'list'");
assert(trunksHelp.includes("metrics"), "should list 'metrics'");
console.log("  PASS");

console.log("Test: queues --help shows list subcommand");
const queuesHelp = run(["queues", "--help"]);
assert(queuesHelp.includes("list"), "should list 'list'");
console.log("  PASS");

cleanup();

console.log("\nAll tests passed.");
