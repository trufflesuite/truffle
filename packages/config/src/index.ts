import path from "path";
import merge from "lodash/merge";
import findUp from "find-up";
import Conf from "conf";
import TruffleError from "@truffle/error";
import originalRequire from "original-require";
import { getInitialConfig, configProps } from "./configDefaults";
import { EventManager } from "@truffle/events";
import debugModule from "debug";
const debug = debugModule("config");

const DEFAULT_CONFIG_FILENAME = "truffle-config.js";
const BACKUP_CONFIG_FILENAME = "truffle.js"; // old config filename
class TruffleConfig {
  // eslint-disable-next-line no-undef
  [key: string]: any;

  private _deepCopy: string[];
  private _values: any;

  constructor(
    truffleDirectory?: string,
    workingDirectory?: string,
    network?: any
  ) {
    this._deepCopy = ["compilers", "mocha", "dashboard", "networks"];
    this._values = getInitialConfig({
      truffleDirectory,
      workingDirectory,
      network
    });

    this.events = new EventManager(this);

    const props = configProps({ configObject: this });

    Object.entries(props).forEach(([propName, descriptor]) =>
      this.addProp(propName, descriptor)
    );
  }

  public addProp(propertyName: string, descriptor: any): void {
    // possible property descriptors
    //
    // supports `default` and `transform` in addition to `get` and `set`
    //
    // default: specify function to retrieve default value (used by get)
    // transform: specify function to transform value when (used by set)
    const self = this;

    Object.defineProperty(this, propertyName, {
      get:
        descriptor.get ||
        function () {
          // value is specified
          if (propertyName in self._values) {
            return self._values[propertyName];
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
        function (value) {
          self._values[propertyName] = descriptor.transform
            ? descriptor.transform(value)
            : value;
        },
      configurable: true,
      enumerable: true
    });
  }

  public normalize(obj: any): any {
    const clone: any = {};

    Object.keys(obj).forEach(key => {
      try {
        clone[key] = obj[key];
      } catch (e) {
        // Do nothing with values that throw.
      }
    });

    return clone;
  }

  public with(obj: any): TruffleConfig {
    //Normalized, or shallow clowning only copies an object's own enumerable
    //properties ignoring properties up the prototype chain
    const current = this.normalize(this);
    const normalized = this.normalize(obj);

    const newConfig = Object.assign(
      Object.create(TruffleConfig.prototype),
      current,
      normalized
    );

    this.events.updateSubscriberOptions(newConfig);
    return newConfig;
  }

  public merge(obj: any): TruffleConfig {
    const clone = this.normalize(obj);

    // Only set keys for values that don't throw.
    const propertyNames = Object.keys(obj);

    propertyNames.forEach(key => {
      try {
        if (typeof clone[key] === "object" && this._deepCopy.includes(key)) {
          this[key] = merge(this[key], clone[key]);
        } else {
          debug("setting key -- %o -- to -- %o", key, clone[key]);
          this[key] = clone[key];
        }
      } catch (e) {
        // ignore
      }
    });

    this.events.updateSubscriberOptions(this);
    return this;
  }

  public static default(): TruffleConfig {
    return new TruffleConfig();
  }

  public static search(options: any = {}, filename?: string): string | null {
    const searchOptions = {
      cwd: options.working_directory || options.workingDirectory
    };

    if (!filename) {
      const isWin = process.platform === "win32";
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
  }

  public static detect(options: any = {}, filename?: string): TruffleConfig {
    debug("callling Config.detect with filename -- %o", filename);
    let configFile;
    const configPath = options.config;

    if (configPath) {
      configFile = path.isAbsolute(configPath)
        ? configPath
        : path.resolve(configPath);
    } else {
      configFile = TruffleConfig.search(options, filename);
    }

    if (!configFile) {
      throw new TruffleError("Could not find suitable configuration file.");
    }

    return TruffleConfig.load(configFile, options);
  }

  public static load(file: string, options: any = {}): TruffleConfig {
    debug("calling Config.load with file -- %o", file);
    const workingDirectory = options.config
      ? process.cwd()
      : path.dirname(path.resolve(file));

    const config = new TruffleConfig(undefined, workingDirectory, undefined);

    const staticConfig = originalRequire(file);
    debug("the static config is -- %o", staticConfig);

    config.merge(staticConfig);
    config.merge(options);

    // When loading a user's config, ensure their subscribers are initialized
    config.events.updateSubscriberOptions(config);
    config.events.initializeUserSubscribers(config);

    return config;
  }

  public static getUserConfig(): Conf {
    return new Conf({ projectName: "truffle" });
  }

  public static getTruffleDataDirectory(): string {
    const conf = TruffleConfig.getUserConfig();
    return path.dirname(conf.path);
  }
}

export = TruffleConfig;
