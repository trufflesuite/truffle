import { expectAssignable } from "tsd";

import { Db, Ens, Directories } from "test/schemas";

import type { ProjectConfig } from "./types";

export namespace Environments {
  export namespace SingleSchema {
    declare const config: ProjectConfig<Db.Schema>;

    export namespace Destructuring {
      // test that we can safely destructure schema properties
      const { environments } = config;

      for (const { db } of Object.values(environments)) {
        expectAssignable<{ enabled: boolean }>(db);
      }
    }
  }

  export namespace DualSchema {
    declare const config: ProjectConfig<Db.Schema & Ens.Schema>;

    export namespace Destructuring {
      // test that we can safely destructure properties from either schema
      const { environments } = config;
      for (const { db, ens } of Object.values(environments)) {
        expectAssignable<{ enabled: boolean }>(db);
        expectAssignable<{ networkName: string }>(ens);
      }
    }
  }

  export namespace WithKnownEnvironmentNames {
    type Environments = {
      environmentName: "dev" | "prod";
    };

    declare const config: ProjectConfig<Environments>;

    export namespace Destructuring {
      const { environments } = config;
      expectAssignable<{ dev: {}; prod: {} }>(environments);
    }
  }
}

export namespace Properties {
  declare const config: ProjectConfig<Directories.Schema>;

  const { directories } = config;

  expectAssignable<string>(directories.contracts);
  expectAssignable<string>(directories.tests);
}
