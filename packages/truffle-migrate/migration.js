const path = require("path");
const Deployer = require("truffle-deployer");
const Require = require("truffle-require");
const Emittery = require("emittery");
const Web3Shim = require("truffle-interface-adapter").Web3Shim;

const ResolverIntercept = require("./resolverintercept");

class Migration {
  constructor(file, reporter, options) {
    this.file = path.resolve(file);
    this.reporter = reporter;
    this.number = parseInt(path.basename(file));
    this.emitter = new Emittery();
    this.isFirst = false;
    this.isLast = false;
    this.dryRun = options.dryRun;
    this.interactive = options.interactive;
    this.options = options || {};
  }

  // ------------------------------------- Private -------------------------------------------------
  /**
   * Loads & validates migration, then runs it.
   * @param  {Object}   options  config and command-line
   * @param  {Object}   context  web3
   * @param  {Object}   deployer truffle module
   * @param  {Object}   resolver truffle module
   * @param  {Function} callback
   */
  async _load(options, context, deployer, resolver, callback) {
    const self = this;

    // Load assets and run `execute`
    try {
      const accounts = await context.web3.eth.getAccounts();
      const requireOptions = {
        file: self.file,
        context: context,
        resolver: resolver,
        args: [deployer]
      };

      Require.file(requireOptions, async (err, fn) => {
        if (err) return callback(err);

        const unRunnable = !fn || !fn.length || fn.length == 0;

        if (unRunnable) {
          const msg = `Migration ${
            self.file
          } invalid or does not take any parameters`;
          return callback(new Error(msg));
        }

        // `migrateFn` might be sync or async. We negotiate that difference in
        // `execute` through the deployer API.
        try {
          const migrateFn = fn(deployer, options.network, accounts);
          await self._deploy(options, deployer, resolver, migrateFn, callback);
        } catch (err) {
          callback(err);
        }
      });
    } catch (err) {
      callback(err);
    }
  }

  /**
   * Initiates deployer sequence, then manages migrations info
   * publication to chain / artifact saving.
   * @param  {Object}   options     config and command-line
   * @param  {Object}   deployer    truffle module
   * @param  {Object}   resolver    truffle module
   * @param  {[type]}   migrateFn   module.exports of a migrations.js
   */
  async _deploy(options, deployer, resolver, migrateFn, callback) {
    const self = this;

    try {
      await deployer.start();

      // Allow migrations method to be async and
      // deploy to use await
      if (migrateFn && migrateFn.then !== undefined) {
        await deployer.then(() => migrateFn);
      }

      // Migrate without saving
      if (options.save === false) return;

      // Write migrations record to chain
      const Migrations = resolver.require("Migrations");

      if (Migrations && Migrations.isDeployed()) {
        const message = `Saving migration to chain.`;

        if (!this.dryRun) {
          const data = { message: message };
          await self.emitter.emit("startTransaction", data);
        }

        const migrations = await Migrations.deployed();
        const receipt = await migrations.setCompleted(self.number);

        if (!this.dryRun) {
          const data = { receipt: receipt, message: message };
          await self.emitter.emit("endTransaction", data);
        }
      }

      await self.emitter.emit("postMigrate", self.isLast);

      // Save artifacts to local filesystem
      await options.artifactor.saveAll(resolver.contracts());

      deployer.finish();

      // Cleanup
      if (self.isLast) {
        self.emitter.clearListeners();

        // Exiting w provider-engine appears to be hopeless. This hack on
        // our fork just swallows errors from eth-block-tracking
        // as we unwind the handlers downstream from here.
        if (self.options.provider && self.options.provider.engine) {
          self.options.provider.engine.silent = true;
        }
      }
      // Prevent errors thrown in the callback from triggering the below catch()
      process.nextTick(callback);
    } catch (e) {
      const payload = {
        type: "migrateErr",
        error: e
      };

      await self.emitter.emit("error", payload);
      deployer.finish();
      callback(e);
    }
  }

  // ------------------------------------- Private -------------------------------------------------
  /**
   * Runs the legacy migration sequence by used in Truffle v4,
   * but continues to use the concurrent Deployer and Web3 provider
   * @param  {Object}   options  config and command-line
   * @param  {Function} callback
   */
  async runLegacyMigrations(options, callback) {
    const self = this;
    const logger = options.logger;

    const web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    logger.log(
      "Running migration: " +
        path.relative(options.migrations_directory, self.file)
    );

    const resolver = new ResolverIntercept(options.resolver);

    // Initial context.
    const context = {
      web3: web3
    };

    const deployer = new Deployer({
      logger: logger,
      confirmations: options.confirmations,
      timeoutBlocks: options.timeoutBlocks,
      networks: options.networks,
      network: options.network,
      network_id: options.network_id,
      provider: options.provider,
      basePath: path.dirname(self.file)
    });

    const finish = err => {
      if (err) return callback(err);
      deployer
        .start()
        .then(() => {
          if (options.save === false) return;

          const Migrations = resolver.require("./Migrations.sol");

          if (Migrations && Migrations.isDeployed()) {
            logger.log("Saving successful migration to network...");
            return Migrations.deployed().then(migrations => {
              return migrations.setCompleted(self.number);
            });
          }
        })
        .then(() => {
          if (options.save === false) return;
          logger.log("Saving artifacts...");
          return options.artifactor.saveAll(resolver.contracts());
        })
        .then(() => {
          // Use process.nextTicK() to prevent errors thrown in the callback from triggering the below catch()
          process.nextTick(callback);
        })
        .catch(e => {
          logger.log(
            "Error encountered, bailing. Network state unknown. Review successful transactions manually."
          );
          callback(e);
        });
    };

    web3.eth.getAccountsAndMigrate = () => {
      return new Promise((resolve, reject) => {
        web3.eth.getAccounts((err, accounts) => {
          if (err) return reject(err);

          Require.file(
            {
              file: self.file,
              context: context,
              resolver: resolver,
              args: [deployer]
            },
            (err, fn) => {
              if (!fn || !fn.length || fn.length == 0) {
                return reject(
                  new Error(
                    "Migration " +
                      self.file +
                      " invalid or does not take any parameters"
                  )
                );
              }
              fn(deployer, options.network, accounts);
              resolve(finish());
            }
          );
        });
      });
    };
    web3.eth.getAccountsAndMigrate();
  }

  // ------------------------------------- Public -------------------------------------------------
  /**
   * Instantiates a deployer, connects this migration and its deployer to the reporter
   * and launches a migration file's deployment sequence
   * @param  {Object}   options  config and command-line
   * @param  {Function} callback
   */
  async run(options, callback) {
    const self = this;

    if (options.networks[options.network].type === "quorum") {
      await self.runLegacyMigrations(options, callback);
      return;
    }

    const logger = options.logger;
    const resolver = new ResolverIntercept(options.resolver);

    const web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    // Initial context.
    const context = {
      web3: web3
    };

    // Instantiate a Deployer
    const deployer = new Deployer({
      logger: logger,
      confirmations: options.confirmations,
      timeoutBlocks: options.timeoutBlocks,
      networks: options.networks,
      network: options.network,
      network_id: options.network_id,
      provider: options.provider,
      basePath: path.dirname(self.file)
    });

    // Connect reporter to this migration
    if (self.reporter) {
      self.reporter.setMigration(self);
      self.reporter.setDeployer(deployer);
      self.reporter.confirmations = options.confirmations || 0;
      self.reporter.listen();
    }

    // Get file path and emit pre-migration event
    const file = path.relative(options.migrations_directory, self.file);
    const block = await web3.eth.getBlock("latest");

    const preMigrationsData = {
      file: file,
      isFirst: self.isFirst,
      network: options.network,
      networkId: options.network_id,
      blockLimit: block.gasLimit
    };

    await self.emitter.emit("preMigrate", preMigrationsData);
    await self._load(options, context, deployer, resolver, callback);
  }
}

module.exports = Migration;
