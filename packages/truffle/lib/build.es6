var path = require("path");
var async = require("async");

var Promise = require("bluebird");
var mkdirp = Promise.promisify(require("mkdirp"));
var rimraf = Promise.promisify(require("rimraf"));
var fs = Promise.promisifyAll(require("fs"));
var copy = require("./copy");
var File = require("./file");
var normalfs = require("fs");
var _ = require("lodash");

var Build = {
  process_file(config, file, callback) {
    var extension = path.extname(file).toLowerCase();
    var processor = config.processors[extension];

    if (processor == null) {
      var display_name = "." + file.replace(config.working_dir, "");
      console.log(`Warning: Couldn't find processor for ${display_name}. Including as is.`);
      processor = config.processors["null"];
    }

    normalfs.readFile(file, "utf8", (err, contents) => {
      if (err != null) {
        callback(err);
        return;
      }

      processor(contents, file, config, Build.process_files, callback);
    });
  },

  process_files(config, files, base_path, separator, callback) {
    if (typeof base_path == "function") {
      separator = base_path;
      base_path = null;
    }

    if (typeof separator == "function") {
      callback = separator;
      separator = "\n\n";
    }

    if (typeof files == "string") files = [files];

    async.reduce(files, "", (memo, file, iterator_callback) => {
      var full_path = file;
      if (base_path != null) {
        full_path = `${base_path}/${file}`;
      }

      config.expect(full_path);

      // Call this function from the Build object since
      // @process_files is passed around and may not always have
      // the correct scope.
      Build.process_file(config, full_path, function(err, processed) {
        if (err != null) {
          iterator_callback(err);
          return;
        }

        iterator_callback(null, memo + separator + processed);
      });
    }, callback);
  },

  process_directory(config, target, key, callback) {
    var value = config.app.resolved.build[target];
    var destination_directory = `${config[key].directory}/${target}`;
    var source_directory = `${config.app.directory}/${value.files[0]}`;

    config.expect(source_directory, `source directory for target ${target}`, "Check app configuration.");

    mkdirp(destination_directory).then(function() {
      copy(source_directory, destination_directory, callback);
    }).catch(callback)
  },

  process_target(config, target, key, callback) {
    // Is this a directory?
    if (target[target.length - 1] == "/") {
      this.process_directory(config, target, key, callback);
      return;
    }

    var files = config.app.resolved.build[target].files;
    var post_processing = config.app.resolved.build[target]["post-process"][key];
    var target_file = `${config[key].directory}/${target}`;

    this.process_files(config, files, config.app.directory, (err, processed) => {
      if (err != null) {
        callback(err);
        return;
      }

      // Now do post processing.
      async.reduce(post_processing, processed, (memo, processor_name, post_processor_finished) => {
        var post_processor = config.processors[processor_name]

        if (!post_processor) {
          post_processor_finished(new Error(`Cannot find processor named '${processor_name}' during post-processing. Check app configuration.`));
          return;
        }

        post_processor(memo, target_file, config, Build.process_files, post_processor_finished);
      }, function(err, final_post_processed) {
        if (err != null) {
          callback(err);
          return;
        }

        mkdirp(path.dirname(target_file)).then(function() {
          return fs.writeFile(target_file, final_post_processed, 'utf8');
        }).then(callback).catch(callback);
      });
    });
  },

  process_all_targets(config, key, callback) {
    async.eachSeries(Object.keys(config.app.resolved.build), (target, finished_with_target) => {
      this.process_target(config, target, key, finished_with_target);
    }, callback);
  },

  base: Promise.promisify(function(config, key, callback) {
    // Clean first.
    rimraf(config[key].directory).then(function() {
      return mkdirp(config[key].directory);
    }).then(() => {
      this.process_all_targets(config, key, callback);
    });
  }),

  expect(config) {
    config.expect(config.app.configfile, "app configuration");
  },

  build: Promise.promisify(function(config, callback) {
    this.expect(config);
    this.base(config, "build").then(callback).catch(callback)
  }),

  dist: Promise.promisify(function(config, callback) {
    this.expect(config)
    this.base(config, "dist").then(callback).catch(callback)
  })
}

module.exports = Build;
