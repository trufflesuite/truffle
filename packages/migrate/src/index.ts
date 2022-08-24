import fs from "fs";
import * as path from "path";
import glob from "glob";
import * as expect from "@truffle/expect";
import Config from "@truffle/config";
import { Migration } from "./Migration";
import { emitEvent } from "./emitEvent";
import inquirer from "inquirer";
import type { Question } from "inquirer";
import type { Resolver } from "@truffle/resolver";

/**
 *  This API is consumed by `@truffle/core` at the `migrate` and `test` commands via
 *  the `.runMigrations` method.
 */
export default {
  Migration: Migration,
  logger: null,

  promptToAcceptDryRun: async function (options?: Config) {
    const prompt: Question[] = [
      {
        type: "confirm",
        name: "proceed",
        message: `Dry-run successful. Do you want to proceed with real deployment?  >> (y/n): `,
        default: false
      }
    ];

    const answer = await inquirer.prompt(prompt);
    if (answer.proceed) {
      return true;
    }
    if (options) {
      await emitEvent(options, "migrate:dryRun:notAccepted");
    }
    return false;
  },

  assemble: function (options: Config): Migration[] {
    const config = Config.detect(options);
    if (
      !fs.existsSync(config.migrations_directory) ||
      !(fs.readdirSync(config.migrations_directory).length > 0)
    ) {
      return [];
    }

    const migrationsDir = config.migrations_directory;
    const directoryContents = glob.sync(`${migrationsDir}${path.sep}*`);
    const files = directoryContents.filter(item => fs.statSync(item).isFile());

    if (files.length === 0) return [];

    let migrations = files
      .filter(file => isNaN(parseInt(path.basename(file))) === false)
      .filter(
        file =>
          path.extname(file).match(config.migrations_file_extension_regexp) !=
          null
      )
      .map(file => new Migration(file, config));

    // Make sure to sort the prefixes as numbers and not strings.
    migrations = migrations.sort((a, b) => {
      if (a.number > b.number) return 1;
      if (a.number < b.number) return -1;
      return 0;
    });
    return migrations;
  },

  run: async function (options: Config) {
    expect.options(options, [
      "working_directory",
      "migrations_directory",
      "contracts_build_directory",
      "provider",
      "artifactor",
      "resolver",
      "network",
      "network_id",
      "logger",
      "from" // address doing deployment
    ]);

    if (options.reset === true) {
      await this.runAll(options);
      return;
    }

    const lastMigration = await this.lastCompletedMigration(options);

    // Don't rerun the last completed migration.
    await this.runFrom(lastMigration + 1, options);
  },

  runFrom: async function (number: number, options: Config) {
    let migrations: Migration[] = this.assemble(options);

    while (migrations.length > 0) {
      if (migrations[0].number >= number) break;
      migrations.shift();
    }

    if (options.to) {
      migrations = migrations.filter(
        migration => migration.number <= options.to
      );
    }
    return await this.runMigrations(migrations, options);
  },

  runAll: async function (options: Config) {
    return await this.runFrom(0, options);
  },

  runMigrations: async function (migrations: Migration[], options: Config) {
    // Perform a shallow clone of the options object
    // so that we can override the provider option without
    // changing the original options object passed in.
    const clone: any = {};

    Object.keys(options).forEach(key => (clone[key] = options[key]));

    if (options.quiet) clone.logger = { log: function () {} };

    clone.resolver = this.wrapResolver(options.resolver, clone.provider);

    // Make migrations aware of their position in sequence
    const total = migrations.length;
    if (total) {
      migrations[0].isFirst = true;
      migrations[total - 1].isLast = true;
    }

    await emitEvent(options, "migrate:runMigrations:start", {
      migrations,
      dryRun: options.dryRun
    });

    try {
      // @ts-ignore
      global.artifacts = clone.resolver;
      // @ts-ignore
      global.config = clone;
      for (const migration of migrations) {
        await migration.run(clone);
      }

      await emitEvent(options, "migrate:runMigrations:finish", {
        dryRun: options.dryRun,
        error: null
      });
      return;
    } catch (error) {
      await emitEvent(options, "migrate:runMigrations:finish", {
        dryRun: options.dryRun,
        error: error.toString()
      });
      throw error;
    } finally {
      // @ts-ignore
      delete global.artifacts;
      // @ts-ignore
      delete global.config;
    }
  },

  wrapResolver: function (resolver: Resolver, provider: any) {
    return {
      require: function (import_path: string, search_path?: string) {
        const abstraction = resolver.require(import_path, search_path);
        abstraction.setProvider(provider);
        return abstraction;
      },
      resolve: resolver.resolve
    };
  },

  lastCompletedMigration: async function (options: Config): Promise<number> {
    let Migrations: any; // I don't think we have a good type for this yet

    try {
      Migrations = options.resolver.require("Migrations");
    } catch (error) {
      // don't throw, Migrations contract optional
      return 0;
    }

    if (Migrations.isDeployed() === false) return 0;

    const migrationsOnChain = async (migrationsAddress: string) => {
      return (
        (await Migrations.interfaceAdapter.getCode(migrationsAddress)) !== "0x"
      );
    };

    // Two possible Migrations.sol's (lintable/unlintable)
    const lastCompletedMigration = (migrationsInstance: any) => {
      try {
        return migrationsInstance.last_completed_migration.call();
      } catch (error) {
        if (error instanceof TypeError)
          return migrationsInstance.lastCompletedMigration.call();
        throw new Error(error);
      }
    };

    const migrations = await Migrations.deployed();
    let completedMigration;
    if (await migrationsOnChain(migrations.address)) {
      completedMigration = await lastCompletedMigration(migrations);
    } else {
      completedMigration = 0;
    }
    return parseInt(completedMigration);
  },

  needsMigrating: function (options: Config) {
    return new Promise((resolve, reject) => {
      if (options.reset === true) return resolve(true);

      return this.lastCompletedMigration(options)
        .then((number: number) => {
          const migrations = this.assemble(options);
          while (migrations.length > 0) {
            if (migrations[0].number >= number) break;
            migrations.shift();
          }

          return resolve(
            migrations.length > 1 || (migrations.length && number === 0)
          );
        })
        .catch((error: Error) => reject(error));
    });
  }
};
