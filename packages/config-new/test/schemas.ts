import * as expect from "@truffle/expect";

import { ProjectConfig, Validator } from "@truffle/config-new";

export namespace Db {
  export type Schema = {
    environment: {
      db: {
        enabled: boolean;
      };
    };
  };

  export const validate: Validator<Schema> = (
    options
  ): options is ProjectConfig<Schema> => {
    try {
      expect.options(options, ["environments"]);

      const { environments } = options;
      expect.object(environments);

      for (const environment of Object.values(environments)) {
        expect.options(environment, ["db"]);
        const { db } = environment;
        expect.options(db, ["enabled"]);
      }
      return true;
    } catch {
      return false;
    }
  };
}

export namespace Ens {
  export type Schema = {
    environment: {
      ens: {
        networkName: string;
        registryAddress: string;
      };
    };
  };

  export const validate: Validator<Schema> = (
    options
  ): options is ProjectConfig<Schema> => {
    try {
      expect.options(options, ["environments"]);

      const { environments } = options;
      expect.object(environments);

      for (const environment of Object.values(environments)) {
        expect.options(environment, ["ens"]);
        const { ens } = environment;
        expect.options(ens, ["networkName", "registryAddress"]);
      }

      return true;
    } catch {
      return false;
    }
  };
}

export namespace Directories {
  export type Schema = {
    properties: {
      directories: {
        contracts: string;
        tests: string;
      };
    };
  };

  export const validate: Validator<Schema> = (
    options
  ): options is ProjectConfig<Schema> => {
    try {
      expect.options(options, ["directories"]);
      const { directories } = options;

      expect.options(directories, ["contracts", "tests"]);

      return true;
    } catch {
      return false;
    }
  };
}
