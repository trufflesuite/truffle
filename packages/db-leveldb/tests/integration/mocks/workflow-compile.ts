import { TruffleDB } from "../../../src";
/*
  Mocked so this will not interfere with the build/ci/packaging of truffle.
  Mocked directly from workflow-comile, comments out requires that are not 
  impacted by tests. This may be copy/pasted directly. 
*/
const WorkflowCompile = {
  async save(
    options: any,
    { contracts, compilations }: { contracts: any; compilations: any }
  ) {
    //const config = prepareConfig(options);

    //await fse.ensureDir(config.contracts_build_directory);

    if (options.db && options.db.enabled === true && contracts.length > 0) {
      const db = new TruffleDB(options.db);

      const project = await db.getProject();

      project.contracts = contracts;
      project.compilations = compilations;

      await project.save();
      await db.close();
    }

    //const artifacts = contracts.map(Shims.NewToLegacy.forContract);
    //await config.artifactor.saveAll(artifacts);

    return { contracts, compilations };
  }
};

module.exports = WorkflowCompile;
