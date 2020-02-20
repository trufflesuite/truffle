var copy = require("./copy");
var path = require("path");
var fs = require("fs");

var templates = {
  test: {
    filename: path.join(__dirname, "templates", "example.js"),
    variable: "example"
  },
  contract: {
    filename: path.join(__dirname, "templates", "Example.sol"),
    name: "Example",
    variable: "example"
  },
  migration: {
    filename: path.join(__dirname, "templates", "migration.js")
  }
};

const replaceContents = function(file_path, find, replacement, callback) {
  let data;
  try {
    data = fs.readFileSync(file_path, { encoding: "utf8" });
    if (typeof find === "string") {
      find = new RegExp(find, "g");
    }
    const result = data.replace(find, replacement);
    fs.writeFile(file_path, result, { encoding: "utf8" }, callback);
    return;
  } catch (error) {
    callback(error);
    return;
  }
};

var toUnderscoreFromCamel = function(string) {
  string = string.replace(/([A-Z])/g, function($1) {
    return "_" + $1.toLowerCase();
  });

  if (string[0] === "_") {
    string = string.substring(1);
  }

  return string;
};

var Create = {
  contract: async function(directory, name, options, callback) {
    if (typeof options === "function") {
      callback = options;
    }

    var from = templates.contract.filename;
    var to = path.join(directory, name + ".sol");

    if (!options.force && fs.existsSync(to)) {
      return callback(
        new Error("Can not create " + name + ".sol: file exists")
      );
    }

    try {
      await copy.file(from, to);
    } catch (error) {
      return callback(error);
    }

    replaceContents(to, templates.contract.name, name, callback);
  },

  test: async function(directory, name, options, callback) {
    if (typeof options === "function") {
      callback = options;
    }

    var underscored = toUnderscoreFromCamel(name);
    underscored = underscored.replace(/\./g, "_");
    var from = templates.test.filename;
    var to = path.join(directory, underscored + ".js");

    if (!options.force && fs.existsSync(to)) {
      return callback(
        new Error("Can not create " + underscored + ".js: file exists")
      );
    }

    try {
      await copy.file(from, to);
    } catch (error) {
      return callback(error);
    }

    replaceContents(to, templates.contract.name, name, function(err) {
      if (err) return callback(err);
      replaceContents(to, templates.contract.variable, underscored, callback);
    });
  },
  migration: async function(directory, name, options, callback) {
    if (typeof options === "function") {
      callback = options;
    }

    var underscored = toUnderscoreFromCamel(name || "");
    underscored = underscored.replace(/\./g, "_");
    var from = templates.migration.filename;
    var filename = (new Date().getTime() / 1000) | 0; // Only do seconds.

    if (name != null && name !== "") {
      filename += "_" + underscored;
    }

    filename += ".js";
    var to = path.join(directory, filename);

    if (!options.force && fs.existsSync(to)) {
      return callback(
        new Error("Can not create " + filename + ": file exists")
      );
    }

    try {
      await copy.file(from, to);
      callback();
    } catch (error) {
      callback(error);
    }
  }
};

module.exports = Create;
