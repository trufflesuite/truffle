const debug = require("debug")("migrate:Migration");
const path = require("path");
const Deployer = require("@truffle/deployer");
const Require = require("@truffle/require");
const Emittery = require("emittery");
const {
  Web3Shim,
  createInterfaceAdapter
} = require("@truffle/interface-adapter");
const {connect, Project} = require("@truffle/db");

const ResolverIntercept = require("./ResolverIntercept");

class Migration {
  constructor(file, reporter, config) {
    this.file = path.resolve(file);
    this.reporter = reporter;
    this.number = parseInt(path.basename(file));
    this.emitter = new Emittery();
    this.isFirst = false;
    this.isLast = false;
    this.dryRun = config.dryRun;
    this.interactive = config.interactive;
    this.config = config || {};
  }

  // ------------------------------------- Private -------------------------------------------------
  /**
   * Loads & validates migration, then runs it.
   * @param  {Object}   options  config and command-line
   * @param  {Object}   context  web3 & interfaceAdapter
   * @param  {Object}   deployer truffle module
   * @param  {Object}   resolver truffle module
   */
  async _load(options, context, deployer, resolver) {
    // Load assets and run `execute`
    const accounts = await context.interfaceAdapter.getAccounts();
    const requireOptions = {
      file: this.file,
      context: context,
      resolver: resolver,
      args: [deployer]
    };

    const fn = Require.file(requireOptions);

    const unRunnable = !fn || !fn.length || fn.length == 0;

    if (unRunnable) {
      const msg = `Migration ${this.file} invalid or does not take any parameters`;
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

      let Migrations;

      // Attempt to write migrations record to chain
      try {
        Migrations = resolver.require("Migrations");
      } catch (error) {
        // do nothing, Migrations contract optional
      }

      if (Migrations && Migrations.isDeployed()) {
        const message = `Saving migration to chain.`;

        if (!this.dryRun) {
          const data = {message: message};
          await this.emitter.emit("startTransaction", data);
        }

        const migrations = await Migrations.deployed();
        const receipt = await migrations.setCompleted(this.number);

        if (!this.dryRun) {
          const data = {receipt: receipt, message: message};
          await this.emitter.emit("endTransaction", data);
        }
      }

      await this.emitter.emit("postMigrate", this.isLast);

      let artifacts = resolver
        .contracts()
        .map(abstraction => abstraction._json);
      if (this.config.db && this.config.db.enabled && artifacts.length > 0) {
        const db = connect(this.config);
        const project = await Project.initialize({
          db,
          project: {
            directory: this.config.working_directory
          }
        });

        const result = await project
          .connect({provider: this.config.provider})
          .loadMigrate({
            network: {
              name: this.config.network
            },
            artifacts
          });

        ({ artifacts } = result);

        await project.assignNames({
          assignments: {
            networks: [result.network]
          }
        });
      }

      // Save artifacts to local filesystem
      await options.artifactor.saveAll(artifacts);

      deployer.finish();

      // Cleanup
      if (this.isLast) {
        this.emitter.clearListeners();

        // Exiting w provider-engine appears to be hopeless. This hack on
        // our fork just swallows errors from eth-block-tracking
        // as we unwind the handlers downstream from here.
        if (this.config.provider && this.config.provider.engine) {
          this.config.provider.engine.silent = true;
        }
      }
    } catch (error) {
      const payload = {
        type: "migrateErr",
        error: error
      };

      await this.emitter.emit("error", payload);
      deployer.finish();
      throw error;
    }
  }

  // ------------------------------------- Public -------------------------------------------------
  /**
   * Instantiates a deployer, connects this migration and its deployer to the reporter
   * and launches a migration file's deployment sequence
   * @param  {Object}   options  config and command-line
   */
  async run(options) {
    const {
      interfaceAdapter,
      resolver,
      context,
      deployer
    } = this.prepareForMigrations(options);

    // Connect reporter to this migration
    if (this.reporter) {
      this.reporter.setMigration(this);
      this.reporter.setDeployer(deployer);
      this.reporter.confirmations = options.confirmations || 0;
      this.reporter.listen();
    }

    // Get file path and emit pre-migration event
    const file = path.relative(options.migrations_directory, this.file);
    const block = await interfaceAdapter.getBlock("latest");

    const preMigrationsData = {
      file: file,
      number: this.number,
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
    const interfaceAdapter = createInterfaceAdapter({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });
    const web3 = new Web3Shim({
      provider: options.provider,
      networkType: options.networks[options.network].type
    });

    const resolver = new ResolverIntercept(options.resolver);

    // Initial context.
    const context = {web3, interfaceAdapter, config: this.config};

    const deployer = new Deployer({
      logger,
      confirmations: options.confirmations,
      timeoutBlocks: options.timeoutBlocks,
      networks: options.networks,
      network: options.network,
      network_id: options.network_id,
      provider: options.provider,
      basePath: path.dirname(this.file),
      ens: options.ens
    });

    return {interfaceAdapter, resolver, context, deployer};
  }

  /**
   * Returns a serializable version of `this`
   * @returns  {Object}
   */
  serializeable() {
    return {
      file: this.file,
      number: this.number,
      isFirst: this.isFirst,
      isLast: this.isLast,
      dryRun: this.dryRun,
      interactive: this.interactive
    };
  }
}

module.exports = Migration;
