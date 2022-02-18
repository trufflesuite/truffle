export = Project;
declare class Project extends Model {
  name: {
    defaultValue: string;
  };
  _contracts: {
    defaultValue: never[];
  };
  _compilations: {
    defaultValue: never[];
  };
  network: any;
  networks: any;
  contractInstances: any;
  set contracts(arg: any);
  get contracts(): any;
  set compilations(arg: any);
  get compilations(): any;
  getContractIDs(): any;
  getCompilationIDs(): any;
  id:
    | {
        defaultValue: string;
      }
    | undefined;
  generateID(): {
    defaultValue: string;
  };
  #private;
}
import Model = require("../Model");
