"use strict";

const { formatJson } = require("../formatters/json.js");
const { formatCsv } = require("../formatters/csv.js");
const { formatTable } = require("../formatters/table.js");
const { formatToon } = require("../formatters/toon.js");

async function printResult(data, format = "table") {
  let output;
  switch (format) {
    case "json":
      output = formatJson(data);
      break;
    case "csv":
      output = formatCsv(data);
      break;
    case "toon":
      output = await formatToon(data);
      break;
    case "table":
    default:
      output = formatTable(data);
      break;
  }
  process.stdout.write(output + "\n");
}

function printError(err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  if (message.includes("401") || message.includes("Unauthorized")) {
    process.stderr.write(
      `Hint: Check client credentials. Run "genesys-cli config test" to verify.\n`,
    );
  } else if (message.includes("403") || message.includes("Forbidden")) {
    process.stderr.write(
      `Hint: Insufficient permissions. Check OAuth client role in Genesys Cloud admin.\n`,
    );
  } else if (message.includes("429") || message.includes("Too Many")) {
    process.stderr.write(
      `Hint: Rate limited. The CLI retries automatically.\n`,
    );
  } else if (
    message.includes("ECONNREFUSED") ||
    message.includes("ENOTFOUND")
  ) {
    process.stderr.write(
      `Hint: Check region setting and network connectivity.\n`,
    );
  }
  process.exitCode = 1;
}

module.exports = { printResult, printError };
