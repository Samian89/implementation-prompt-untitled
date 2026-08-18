const path = require("node:path");
const Module = require("node:module");

const root = process.cwd();
const original = Module._resolveFilename;

Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(root, request.slice(2));
  }
  return original.call(this, request, parent, isMain, options);
};
