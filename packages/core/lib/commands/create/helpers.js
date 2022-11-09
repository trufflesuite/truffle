const path = require("path");
const fse = require("fs-extra");

const templates = {
  test: {
    filename: path.join(__dirname, "templates", "example.js"),
    variable: "example"
  },
  contract: {
    filename: path.join(__dirname, "templates", "Example.sol"),
    name: "Example",
    license: "MIT",
    variable: "example"
  },
  migration: {
    filename: path.join(__dirname, "templates", "migration.js")
  }
};

const replaceContents = (filePath, find, replacement) => {
  const data = fse.readFileSync(filePath, { encoding: "utf8" });
  if (typeof find === "string") {
    find = new RegExp(find, "g");
  }
  const result = data.replace(find, replacement);
  fse.writeFileSync(filePath, result, { encoding: "utf8" });
};

const toUnderscoreFromCamel = (string) => {
  string = string.replace(/([A-Z])/g, function ($1) {
    return "_" + $1.toLowerCase();
  });

  if (string[0] === "_") {
    string = string.substring(1);
  }

  return string;
};

// getLicense return the license property value from Truffle config first and
// in case that the file doesn't exist it will fallback to package.json
const getLicense = (options) => {
  try {
    const license = require("@truffle/config").detect(options).license;
    if (license) {
      return license;
    }
  } catch (err) {
    console.log(err);
  }

  try {
    return require(path.join(process.cwd(), "package.json")).license;
  } catch {}
};

const Create = {
  contract: function (directory, name, options) {
    const from = templates.contract.filename;
    const to = path.join(directory, name + ".sol");

    if (!options.force && fse.existsSync(to)) {
      throw new Error("Can not create " + name + ".sol: file exists");
    }

    fse.copySync(from, to);

    replaceContents(to, templates.contract.name, name);
    const license = getLicense(options);
    if (license) {
      replaceContents(to, templates.contract.license, license);
    }
  },

  test: function (directory, name, options) {
    let underscored = toUnderscoreFromCamel(name);
    underscored = underscored.replace(/\./g, "_");
    const from = templates.test.filename;
    const to = path.join(directory, underscored + ".js");

    if (!options.force && fse.existsSync(to)) {
      throw new Error("Can not create " + underscored + ".js: file exists");
    }

    fse.copySync(from, to);
    replaceContents(to, templates.contract.name, name);
    replaceContents(to, templates.contract.variable, underscored);
  },

  migration: function (directory, name, options) {
    let underscored = toUnderscoreFromCamel(name || "");
    underscored = underscored.replace(/\./g, "_");
    const from = templates.migration.filename;
    let filename = (new Date().getTime() / 1000) | 0; // Only do seconds.

    if (name != null && name !== "") {
      filename += "_" + underscored;
    }

    filename += ".js";
    const to = path.join(directory, filename);

    if (!options.force && fse.existsSync(to)) {
      throw new Error("Can not create " + filename + ": file exists");
    }
    fse.copySync(from, to);
    replaceContents(to, templates.contract.name, name);
  }
};

module.exports = Create;
