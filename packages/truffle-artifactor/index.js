var Schema = require("truffle-contract-schema");
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var debug = require("debug")("artifactor");

function Artifactor(destination) {
  this.destination = destination;
}

Artifactor.prototype.save = function(artifactObject) {
  const self = this;

  const normalizedArtifact = Schema.normalize(artifactObject);
  const contractName = normalizedArtifact.contractName;

  if (!contractName) throw new Error("You must specify a contract name.");

  const output_path = path.join(self.destination, `${contractName}.json`);
  let completeArtifact = {};

  // helper for writing artifacts
  const writeArtifact = _completeArtifact => {
    _completeArtifact.updatedAt = new Date().toISOString();
    fs.writeFileSync(
      output_path,
      JSON.stringify(_completeArtifact, null, 2),
      "utf8"
    );
  };

  try {
    const existingArtifact = fs.readFileSync(output_path, "utf8"); // check if artifact already exists
    const existingArtifactObject = JSON.parse(existingArtifact); // parse existing artifact
    const normalizedExistingArtifact = Schema.normalize(existingArtifactObject);
    _.merge(completeArtifact, normalizedExistingArtifact, normalizedArtifact);
    writeArtifact(completeArtifact);
  } catch (e) {
    if (e.code === "ENOENT") return writeArtifact(normalizedArtifact);
    // if artifact doesn't already exist, write new file
    else if (e instanceof SyntaxError) throw new Error(e); // catches improperly formatted artifact json
    throw new Error(e); // catch all other errors
  }
};

Artifactor.prototype.saveAll = function(objects) {
  var self = this;

  if (Array.isArray(objects)) {
    var array = objects;
    objects = {};

    array.forEach(function(item) {
      objects[item.contract_name] = item;
    });
  }

  return new Promise(function(accept, reject) {
    fs.stat(self.destination, function(err, stat) {
      if (err) {
        return reject(
          new Error("Desination " + self.destination + " doesn't exist!")
        );
      }
      accept();
    });
  }).then(function() {
    var promises = [];

    Object.keys(objects).forEach(function(contractName) {
      var object = objects[contractName];
      object.contractName = contractName;
      promises.push(self.save(object));
    });

    return Promise.all(promises);
  });
};

module.exports = Artifactor;
