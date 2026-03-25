"use strict";

const Table = require("cli-table3");

function flattenObj(obj, prefix = "", result = {}) {
  if (obj === null || obj === undefined) return result;
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val === null || val === undefined) {
      result[fullKey] = "";
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        result[fullKey] = "";
      } else if (typeof val[0] !== "object" || val[0] === null) {
        result[fullKey] = val.join(", ");
      } else {
        result[fullKey] = `[${val.length} items]`;
      }
    } else if (typeof val === "object") {
      flattenObj(val, fullKey, result);
    } else {
      result[fullKey] = String(val);
    }
  }
  return result;
}

function shortenKeys(fullKeys) {
  const shortNames = fullKeys.map((k) => {
    const parts = k.split(".");
    return parts[parts.length - 1];
  });

  const counts = {};
  for (const s of shortNames) counts[s] = (counts[s] || 0) + 1;

  return fullKeys.map((k, i) => {
    if (counts[shortNames[i]] <= 1) return shortNames[i];
    const parts = k.split(".");
    return parts.length >= 2
      ? parts.slice(-2).join(".")
      : parts[parts.length - 1];
  });
}

function formatArrayTable(rows) {
  const flatRows = rows.map((row) => flattenObj(row));
  const keySet = new Set();
  for (const flat of flatRows) {
    for (const k of Object.keys(flat)) keySet.add(k);
  }
  const keys = [...keySet];
  const shortKeys = shortenKeys(keys);

  const table = new Table({ head: shortKeys, wordWrap: true });

  for (const flat of flatRows) {
    table.push(keys.map((k) => (flat[k] !== undefined ? flat[k] : "")));
  }

  const footer = new Table();
  footer.push([
    { colSpan: keys.length || 1, content: `${rows.length} results found` },
  ]);

  return table.toString() + "\n" + footer.toString();
}

function formatTable(data) {
  if (data !== null && data !== undefined && typeof data !== "object") {
    return String(data);
  }

  if (Array.isArray(data) && data.length === 0) {
    return "No results found";
  }

  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return formatArrayTable(data);
  }

  if (Array.isArray(data)) {
    const table = new Table({ head: ["value"] });
    for (const item of data) {
      table.push([item === null || item === undefined ? "" : String(item)]);
    }
    return table.toString();
  }

  const flat = flattenObj(data);
  const keys = Object.keys(flat);
  const shortKeys = shortenKeys(keys);
  const table = new Table({ wordWrap: true });
  for (let i = 0; i < keys.length; i++) {
    table.push({ [shortKeys[i]]: flat[keys[i]] });
  }
  return table.toString();
}

module.exports = { formatTable };
