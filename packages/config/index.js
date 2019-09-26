const _ = require("lodash");
const path = require("path");
const TruffleError = require("@truffle/error");
const Module = require("module");
const findUp = require("find-up");
const originalrequire = require("original-require");
const Configstore = require("configstore");
const { EventManager } = require("@truffle/events");

const DEFAULT_CONFIG_FILENAME = "truffle-config.js";
const BACKUP_CONFIG_FILENAME = "truffle.js"; // old config filename

const { _values, configProps } = require("./configDefaults");

class Config {
  constructor(truffleDirectory, workingDirectory, network) {
    this._deepCopy = ["compilers"];
    this._values = _values({ truffleDirectory, workingDirectory, network });

    const props = configProps({ configObject: this });

    const eventsOptions = eventManagerOptions(this);
    this.events = new EventManager(eventsOptions);
    Object.keys(props).forEach(prop => {
      this.addProp(prop, props[prop]);
    });
  }

  addProp(propertyName, descriptor) {
    // possible property descriptors
    //
    // supports `default` and `transform` in addition to `get` and `set`
    //
    // default: specify function to retrieve default value (used by get)
    // transform: specify function to transform value when (used by set)
    Object.defineProperty(this, propertyName, {
      // retrieve config property value
      get:
        descriptor.get ||
        function() {
          // value is specified
          if (propertyName in this._values) {
            return this._values[propertyName];
          }

          // default getter is specified
          if (descriptor.default) {
            return descriptor.default();
          }

          // descriptor is a function
          return descriptor();
        },
      set:
        descriptor.set ||
        function(value) {
          this._values[propertyName] = descriptor.transform
            ? descriptor.transform(value)
            : value;
        },
      configurable: true,
      enumerable: true
    });
  }

  normalize(obj) {
    const clone = {};
    Object.keys(obj).forEach(key => {
      try {
        clone[key] = obj[key];
      } catch (e) {
        // Do nothing with values that throw.
      }
    });
    return clone;
  }

  with(obj) {
    const normalized = this.normalize(obj);
    const current = this.normalize(this);
    let eventsOptions = eventManagerOptions(this);
    this.events.updateSubscriberOptions(eventsOptions);

    return _.extend(Object.create(Config.prototype), current, normalized);
  }

  merge(obj) {
    let clone = this.normalize(obj);

    // Only set keys for values that don't throw.
    const propertyNames = Object.keys(obj);

    propertyNames.forEach(key => {
      try {
        if (typeof clone[key] === "object" && this._deepCopy.includes(key)) {
          this[key] = _.merge(this[key], clone[key]);
        } else {
          this[key] = clone[key];
        }
      } catch (e) {
        // Do nothing.
      }
    });
    const eventsOptions = eventManagerOptions(this);
    this.events.updateSubscriberOptions(eventsOptions);

    return this;
  }
}

Config.default = () => new Config();

Config.search = (options = {}, filename) => {
  const searchOptions = {
    cwd: options.working_directory || options.workingDirectory
  };

  if (!filename) {
    const isWin = /^win/.test(process.platform);
    const defaultConfig = findUp.sync(DEFAULT_CONFIG_FILENAME, searchOptions);
    const backupConfig = findUp.sync(BACKUP_CONFIG_FILENAME, searchOptions);
    if (defaultConfig && backupConfig) {
      console.warn(
        `Warning: Both ${DEFAULT_CONFIG_FILENAME} and ${BACKUP_CONFIG_FILENAME} were found. Using ${DEFAULT_CONFIG_FILENAME}.`
      );
      return defaultConfig;
    } else if (backupConfig && !defaultConfig) {
      if (isWin)
        console.warn(
          `Warning: Please rename ${BACKUP_CONFIG_FILENAME} to ${DEFAULT_CONFIG_FILENAME} to ensure Windows compatibility.`
        );
      return backupConfig;
    } else {
      return defaultConfig;
    }
  }

  return findUp.sync(filename, searchOptions);
};

Config.detect = (options = {}, filename) => {
  const configFile = Config.search(options, filename);

  if (!configFile) {
    throw new TruffleError("Could not find suitable configuration file.");
  }

  return Config.load(configFile, options);
};

// When new options are passed in, a new eventManager needs to be
// attached as it might override some options (e.g. { quiet: true })
const eventManagerOptions = config => {
  let muteLogging;
  const { quiet, logger, subscribers } = config;

  if (quiet) muteLogging = true;
  return { logger, muteLogging, subscribers };
};

Config.load = (file, options) => {
  const config = new Config();

  config.working_directory = path.dirname(path.resolve(file));

  // The require-nocache module used to do this for us, but
  // it doesn't bundle very well. So we've pulled it out ourselves.
  delete require.cache[Module._resolveFilename(file, module)];
  const static_config = originalrequire(file);

  config.merge(static_config);
  config.merge(options);

  const eventsOptions = eventManagerOptions(config);
  config.events.updateSubscriberOptions(eventsOptions);
  config.events.initializeUserSubscribers(eventsOptions);

  return config;
};

Config.getUserConfig = () =>
  new Configstore("truffle", {}, { globalConfigPath: true });

Config.getTruffleDataDirectory = () => {
  const configStore = new Configstore(
    "truffle",
    {},
    { globalConfigPath: true }
  );
  return path.dirname(configStore.path);
};

module.exports = Config;
