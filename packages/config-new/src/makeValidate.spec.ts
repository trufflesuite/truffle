import { Validator, makeValidate } from "@truffle/config-new";

import { Db, Ens } from "test/schemas";

describe("makeValidate", () => {
  describe("for a single schema", () => {
    const validate = makeValidate(Db.validate);

    it("throws for invalid config", () => {
      const config = {};

      expect(() => {
        validate(config);
      }).toThrow();
    });

    it("no-ops for a valid config", () => {
      const config = {
        environments: {
          dev: {
            db: {
              enabled: true
            }
          }
        }
      };

      validate(config);
    });
  });

  describe("for multiple schemas", () => {
    // @ts-ignore FOR NOW
    const validate: Validator<Db.Schema & Ens.Schema> = makeValidate(
      Db.validate,
      Ens.validate
    );

    it("throws for a config that validates none", () => {
      const config = {
        environments: {
          dev: {}
        }
      };

      expect(() => {
        validate(config);
      }).toThrow();
    });

    it("throws for a config that validates one but not all", () => {
      const config = {
        environments: {
          dev: {
            db: {
              enabled: true
            }
          }
        }
      };

      expect(() => {
        validate(config);
      }).toThrow();
    });

    it("no-ops for a valid config", () => {
      const config = {
        environments: {
          dev: {
            db: {
              enabled: true
            },
            ens: {
              networkName: "ganache",
              registryAddress: "0x0"
            }
          }
        }
      };

      validate(config);
    });
  });
});
