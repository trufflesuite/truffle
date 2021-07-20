import path from "path";
import assignIn from "lodash.assignin";
import merge from "lodash.merge";
import Module from "module";
import findUp from "find-up";
import Configstore from "configstore";
import TruffleError from "@truffle/error";
import originalRequire from "original-require";
import { getInitialConfig, configProps } from "./configDefaults";
import { EventManager } from "@truffle/events";

const DEFAULT_CONFIG_FILENAME = "truffle-config.js";
const BACKUP_CONFIG_FILENAME = "truffle.js"; // old config filename

class TruffleConfig {
  [key: string]: any;

  private _deepCopy: string[];
  private _values: any;

  constructor(
    truffleDirectory?: string,
    workingDirectory?: string,
    network?: any
  ) {
    this._deepCopy = ["compilers", "mocha"];
    this._values = getInitialConfig({
      truffleDirectory,
      workingDirectory,
      network
    });

    const eventsOptions = this.eventManagerOptions(this);
    this.events = new EventManager(eventsOptions);

    const props = configProps({ configObject: this });

    Object.entries(props).forEach(([propName, descriptor]) =>
      this.addProp(propName, descriptor)
    );
  }

  public eventManagerOptions(config: TruffleConfig): any {
    let muteLogging;
    const { quiet, logger, subscribers } = config;
    return { logger, quiet, subscribers };
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
        function() {
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
        function(value) {
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
    const current = this.normalize(this);
    const normalized = this.normalize(obj);

    let eventsOptions = this.eventManagerOptions(this);
    this.events.updateSubscriberOptions(eventsOptions);

    return assignIn(
      Object.create(TruffleConfig.prototype),
      current,
      normalized
    );
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
          this[key] = clone[key];
        }
      } catch (e) {
        // ignore
      }
    });

    const eventsOptions = this.eventManagerOptions(this);
    this.events.updateSubscriberOptions(eventsOptions);

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
    const workingDirectory = options.config
      ? process.cwd()
      : path.dirname(path.resolve(file));

    const config = new TruffleConfig(undefined, workingDirectory, undefined);

    // The require-nocache module used to do this for us, but
    // it doesn't bundle very well. So we've pulled it out ourselves.
    // @ts-ignore
    delete require.cache[Module._resolveFilename(file, module)];
    const staticConfig = originalRequire(file);

    config.merge(staticConfig);
    config.merge(options);

    // When loading a user's config, ensure their subscribers are initialized
    const eventsOptions = config.eventManagerOptions(config);
    config.events.updateSubscriberOptions(eventsOptions);
    config.events.initializeUserSubscribers(eventsOptions);

    return config;
  }

  public static getUserConfig(): Configstore {
    return new Configstore("truffle", {}, { globalConfigPath: true });
  }

  public static getTruffleDataDirectory(): string {
    const configStore = TruffleConfig.getUserConfig();

    return path.dirname(configStore.path);
  }
}

export = TruffleConfig;
