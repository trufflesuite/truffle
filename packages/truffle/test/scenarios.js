var fs = require("fs");
var path = require("path");

describe("Scenarios", function() {
  var scenarios_diractory = path.join(__dirname, "scenarios");
  var folders = fs.readdirSync(scenarios_diractory);

  folders.forEach(function(folder) {
    var scenario_directory = path.join(scenarios_diractory, folder);
    var files;

    try {
      files = fs.readdirSync(scenario_directory);
    } catch(e) {
      // Must not be a directory. Move on.
      return;
    }

    files = files.filter(function(file) {
      return path.extname(file) === ".js";
    });

    files.forEach(function(file) {
      require(path.join(scenario_directory, file));
    });
  });
});
