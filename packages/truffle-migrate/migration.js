const path = require("path");
const Deployer = require("truffle-deployer");
const Require = require("truffle-require");
const Emittery = require("emittery");
const {
  Web3Shim,
  getLegacyNetworkTypes
} = require("truffle-interface-adapter");

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
   */
  async _load(options, context, deployer, resolver) {
    // Load assets and run `execute`
    const accounts = await context.web3.eth.getAccounts();
    const requireOptions = {
      file: this.file,
      context: context,
      resolver: resolver,
      args: [deployer]
    };

    const fn = Require.file(requireOptions);

    const unRunnable = !fn || !fn.length || fn.length == 0;

    if (unRunnable) {
      const msg = `Migration ${
        this.file
      } invalid or does not take any parameters`;
      throw new Error(msg);
    }

    // `migrateFn` might be sync or async. We negotiate that difference in
    // `execute` through the deployer API.
    const migrateFn = fn(deployer, options.network, accounts);
    await this._deploy(options, deployer, resolver, migrateFn);
  }

  /**
   * Initiates deployer sequence, then manages migrations info
   * publication to chain / artifact saving.
   * @param  {Object}   options     config and command-line
   * @param  {Object}   deployer    truffle module
   * @param  {Object}   resolver    truffle module
   * @param  {[type]}   migrateFn   module.exports of a migrations.js
   */
  async _deploy(options, deployer, resolver, migrateFn) {
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
          await this.emitter.emit("startTransaction", data);
        }

        const migrations = await Migrations.deployed();
        const receipt = await migrations.setCompleted(this.number);

        if (!this.dryRun) {
          const data = { receipt: receipt, message: message };
          await this.emitter.emit("endTransaction", data);
        }
      }

      await this.emitter.emit("postMigrate", this.isLast);

      // Save artifacts to local filesystem
      await options.artifactor.saveAll(resolver.contracts());

      deployer.finish();

      // Cleanup
      if (this.isLast) {
        this.emitter.clearListeners();

        // Exiting w provider-engine appears to be hopeless. This hack on
        // our fork just swallows errors from eth-block-tracking
        // as we unwind the handlers downstream from here.
        if (this.options.provider && this.options.provider.engine) {
          this.options.provider.engine.silent = true;
        }
      }
    } catch (error) {
      const payload = {
        type: "migrateErr",
        error: error
      };

      await this.emitter.emit("error", payload);
      deployer.finish();
      throw new Error(error);
    }
  }

  // ------------------------------------- Private -------------------------------------------------
  /**
   * Runs the legacy migration sequence by used in Truffle v4,
   * but continues to use the concurrent Deployer and Web3 provider
   * @param  {Object}   options  config and command-line
   */
  async runLegacyMigrations(options) {
    const {
      logger,
      web3,
      resolver,
      context,
      deployer
    } = this.prepareForMigrations(options);

    logger.log(
      "Running migration: " +
        path.relative(options.migrations_directory, this.file)
    );

    const accounts = await web3.eth.getAccounts();

    const fn = Require.file({
      file: this.file,
      context: context,
      resolver: resolver,
      args: [deployer]
    });

    if (!fn || !fn.length || fn.length == 0) {
      const message = `Migration ${
        this.file
      } invalid or does not take any parameters`;
      throw new Error(message);
    }
    fn(deployer, options.network, accounts);

    try {
      await deployer.start();
      if (options.save === false) return;

      const Migrations = resolver.require("./Migrations.sol");

      if (Migrations && Migrations.isDeployed()) {
        logger.log("Saving successful migration to network...");
        const migrations = await Migrations.deployed();
        await migrations.setCompleted(this.number);
      }
      if (options.save !== false) {
        logger.log("Saving artifacts...");
        await options.artifactor.saveAll(resolver.contracts());
      }
    } catch (error) {
      logger.log(
        "Error encountered, bailing. Network state unknown. Review successful transactions manually."
      );
      throw new Error(error);
    }
  }

  // ------------------------------------- Public -------------------------------------------------
  /**
   * Instantiates a deployer, connects this migration and its deployer to the reporter
   * and launches a migration file's deployment sequence
   * @param  {Object}   options  config and command-line
   */
  async run(options) {
    const networkType = options.networks[options.network].type;

    if (getLegacyNetworkTypes().includes(networkType))
      return await this.runLegacyMigrations(options);

    const { web3, resolver, context, deployer } = this.prepareForMigrations(
      options
    );

    // Connect reporter to this migration
    if (this.reporter) {
      this.reporter.setMigration(this);
      this.reporter.setDeployer(deployer);
      this.reporter.confirmations = options.confirmations || 0;
      this.reporter.listen();
    }

    // Get file path and emit pre-migration event
    const file = path.relative(options.migrations_directory, this.file);
    const block = await web3.eth.getBlock("latest");

    const preMigrationsData = {
      file: file,
      isFirst: this.isFirst,
      network: options.network,
      networkId: options.network_id,
      blockLimit: block.gasLimit
    };

    await this.emitter.emit("preMigrate", preMigrationsData);
    await this._load(options, context, deployer, resolver);
  }

  prepareForMigrations(options) {
    const logger = options.logger;
    const web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    const resolver = new ResolverIntercept(options.resolver);

    // Initial context.
    const context = { web3 };

    const deployer = new Deployer({
      logger,
      confirmations: options.confirmations,
      timeoutBlocks: options.timeoutBlocks,
      networks: options.networks,
      network: options.network,
      network_id: options.network_id,
      provider: options.provider,
      basePath: path.dirname(this.file)
    });

    return { logger, web3, resolver, context, deployer };
  }
}

module.exports = Migration;
