const { file: copyFile } = require("../../copy");
const { join } = require("path");
const fs = require("fs");

const templates = {
  test: {
    filename: join(__dirname, "templates", "example.js"),
    variable: "example"
  },
  contract: {
    filename: join(__dirname, "templates", "Example"),
    name: "Example",
    variable: "example"
  },
  migration: {
    filename: join(__dirname, "templates", "migration.js")
  }
};

const processFile = (filePath, processFn, callback) => {
  try {
    const data = fs.readFileSync(filePath, { encoding: "utf8" });
    const result = processFn(data);
    fs.writeFile(filePath, result, { encoding: "utf8" }, callback);
  } catch (error) {
    return callback(error);
  }
};

const replaceContents = (filePath, find, replacement, callback) => {
  processFile(
    filePath,
    data => {
      if (typeof find === "string") {
        find = new RegExp(find, "g");
      }
      return data.replace(find, replacement);
    },
    callback
  );
};

const toUnderscoreFromCamel = string => {
  let transformedString = string.replace(/([A-Z])/g, $1 => {
    return "_" + $1.toLowerCase();
  });

  if (transformedString[0] === "_") {
    transformedString = transformedString.substring(1);
  }

  return transformedString;
};

const Create = {
  contract: (directory, smartContractType, contractName, options, callback) => {
    let from;
    let to;

    if (typeof options === "function") {
      callback = options;
    }

    const smartContractFileExtensions = {
      pascaligo: ".ligo",
      cameligo: ".mligo",
      reasonligo: ".religo",
      smartpy: ".py"
    };

    const smartContractFileExtension =
      smartContractFileExtensions[smartContractType];
    if (smartContractFileExtension) {
      from = templates.contract.filename + smartContractFileExtension;
      to = join(directory, contractName + smartContractFileExtension);
      if (!options.force && fs.existsSync(to)) {
        return callback(
          new Error(
            `Can not create ${contractName}${smartContractFileExtension}: file exists`
          )
        );
      }
    } else {
      from = templates.contract.filename + ".sol";
      to = join(directory, contractName + ".sol");
      if (!options.force && fs.existsSync(to)) {
        return callback(
          new Error(`Can not create ${contractName}.sol: file exists`)
        );
      }
    }

    copyFile(from, to, err => {
      if (err) return callback(err);

      replaceContents(to, templates.contract.name, contractName, callback);
    });
  },

  test: (directory, _smartContractType, testName, options, callback) => {
    if (typeof options === "function") {
      callback = options;
    }

    let underscored = toUnderscoreFromCamel(testName);
    underscored = underscored.replace(/\./g, "_");
    const from = templates.test.filename;
    const to = join(directory, underscored + ".js");

    if (!options.force && fs.existsSync(to)) {
      return callback(
        new Error("Can not create " + underscored + ".js: file exists")
      );
    }

    copyFile(from, to, err => {
      if (err) return callback(err);

      replaceContents(to, templates.contract.name, testName, err => {
        if (err) return callback(err);
        replaceContents(to, templates.contract.variable, underscored, callback);
      });
    });
  },

  migration: (
    directory,
    _smartContractType,
    migrationsName,
    options,
    callback
  ) => {
    if (typeof options === "function") {
      callback = options;
    }

    let underscored = toUnderscoreFromCamel(migrationsName || "");
    underscored = underscored.replace(/\./g, "_");
    const from = templates.migration.filename;
    const currentMigrationsDirectory = fs.readdirSync(directory);
    const migrationsPrefix = currentMigrationsDirectory.length + 1;
    let filename = migrationsPrefix;

    if (migrationsName != null && migrationsName !== "") {
      filename += "_" + underscored;
    }

    filename += ".js";
    const to = join(directory, filename);

    if (!options.force && fs.existsSync(to)) {
      return callback(
        new Error("Can not create " + filename + ": file exists")
      );
    }

    copyFile(from, to, callback);
  }
};

module.exports = Create;
