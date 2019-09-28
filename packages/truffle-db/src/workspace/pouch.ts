import PouchDB from "pouchdb";
import PouchDBMemoryAdapter from "pouchdb-adapter-memory";
import PouchDBFind from "pouchdb-find";

import { soliditySha3 } from "web3-utils";

type PouchApi = {
  sources?: PouchDB.Database,
  bytecodes?: PouchDB.Database,
  compilations?: PouchDB.Database,
  contracts?: PouchDB.Database,
  contractInstances?: PouchDB.Database,
  networks?: PouchDB.Database
}

const jsonStableStringify = require('json-stable-stringify');

const resources = {
  contracts: {
    createIndexes: [
    ]
  },
  sources: {
    createIndexes: [
      { fields: ["contents"] },
      { fields: ["sourcePath"] },
    ]
  },
  compilations: {
    createIndexes: [
    ]
  },
  bytecodes: {
    createIndexes: [
    ]
  },
  networks: {
    createIndexes: [
      { fields: ["id"] }
    ]
  },
  contractInstances: {
    createIndexes: [
    ]
  }
}

export class Workspace {

  dbApi: PouchApi;

  private ready: Promise<void>;

  constructor () {
    this.dbApi = {}
    PouchDB.plugin(PouchDBMemoryAdapter);
    PouchDB.plugin(PouchDBFind);

    for (let resource of Object.keys(resources)) {
      this.dbApi[resource] = new PouchDB(resource, { adapter: "memory" });
    }

    this.ready = this.initialize();
  }

  async initialize() {
    for (let [resource, definition] of Object.entries(resources)) {
      const db = this.dbApi[resource];

      const { createIndexes } = definition;

      for (let index of (createIndexes || [])) {
        await db.createIndex({ index });
      }
    }
  }

  async contractNames () {
    await this.ready;

    const { docs }: any = await this.dbApi.contracts.find({
      selector: {},
      fields: ['name']
    })
    return docs.map( ({ name }) => name );
  }

  async contract ({ id }: { id: string }) {
    await this.ready;

    try {
      const result = {
        ...await this.dbApi.contracts.get(id),

        id
      }
      return result;
    } catch (_) {
      return null;
    }
  }

  async contractsAdd({input}) {
    await this.ready;

    const { contracts } = input;

    return {
      contracts: Promise.all(contracts.map(
        async (contractInput) => {
          const {
            name,
            abi,
            compilation,
            sourceContract,
            constructor: contractConstructor
          } = contractInput;
          const id = soliditySha3(jsonStableStringify({ name: name, abi: abi, sourceContract: sourceContract, compilation: compilation }));

          const contract = await this.contract( { id } );

          if(contract) {
            return contract;
          } else {
            const contractAdded = await this.dbApi.contracts.put({
            ...contractInput,
            _id: id,
            });

            return { name, abi, compilation, sourceContract, constructor: contractConstructor, id };
          }
        }
      ))
    }
  }

  async compilation ({ id }: { id: string }) {
    await this.ready;

    try {
      return  {
        ... await this.dbApi.compilations.get(id),

        id
      };

    } catch (_) {
      return null;
    }
  }

  async compilationsAdd ({ input }) {
    await this.ready;

    const { compilations } = input;

    return {
      compilations: Promise.all(compilations.map(
        async (compilationInput) => {
         const { compiler, contracts, sources } = compilationInput;

         const sourceIds = sources.map(source => source.id);
         const sourcesObject = Object.assign({}, sourceIds);

         const id = soliditySha3(jsonStableStringify({ compiler: compiler, sourceIds: sources } ));

         const compilation = await this.compilation({ id }) || { ...compilationInput, id };

          await this.dbApi.compilations.put({
            ...compilation,
            ...compilationInput,


            _id: id
          });

          return compilation;
        }
      ))
    };
  }

  async contractInstance ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.dbApi.contractInstances.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async contractInstancesAdd ({ input }) {
    await this.ready;

    const { contractInstances } = input;

    return {
      contractInstances: Promise.all(contractInstances.map(
        async (contractInstanceInput) => {
          const { address, network, creation, contract, callBytecode } = contractInstanceInput;
          // hash includes address and network of this contractInstance
          const id = soliditySha3(jsonStableStringify({
            address: address,
            network: { id: network.id }
          }));

          const contractInstance = await this.contractInstance({ id });

          if(contractInstance) {
            return contractInstance;
          } else {
            let contractInstanceAdded = await this.dbApi.contractInstances.put({
              ...contractInstance,
              ...contractInstanceInput,

              _id: id
            });

            return { ...contractInstanceInput, id };
          }
        }
      ))
    };
  }

  async network ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.dbApi.networks.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async networksAdd ({ input }) {
    await this.ready;

    const { networks } = input;

    return {
      networks: Promise.all(networks.map(
        async (networkInput) => {
          const { networkId, historicBlock } = networkInput;
          const id = soliditySha3(jsonStableStringify({
            networkId: networkId,
            historicBlock: historicBlock
          }));

          const network = await this.network({ id });

          if(network) {
            return network;
          } else {
            const networkAdded = await this.dbApi.networks.put({
              ...networkInput,
              _id: id
            });

            return { networkId, historicBlock, id };
          }
        }
      ))
    };
  }

  async source ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.dbApi.sources.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async sourcesAdd ({ input }) {
    await this.ready;

    const { sources } = input;

    return {
      sources: Promise.all(sources.map(
        async (sourceInput) => {
          const { contents, sourcePath } = sourceInput;
          // hash includes sourcePath because two files can have same contents, but
          // should have different IDs
          const id = (sourcePath)
            ? soliditySha3(jsonStableStringify({ contents: contents, sourcePath: sourcePath }))
            : soliditySha3(jsonStableStringify({ contents: contents }))

          const source = await this.source({ id }) || { ...sourceInput, id };

          await this.dbApi.sources.put({
            ...source,
            ...sourceInput,

            _id: id
          });

          return source;
        }
      ))
    };
  }

  async bytecode ({ id }: { id: string }) {
    await this.ready;

    try {
      return {
        ...await this.dbApi.bytecodes.get(id),

        id
      };
    } catch (_) {
      return null;
    }
  }

  async bytecodesAdd ({ input }) {
    await this.ready;

    const { bytecodes } = input;

    return {
      bytecodes: await Promise.all(bytecodes.map(
        async (bytecodeInput) => {
          const { bytes } = bytecodeInput;

          const id = soliditySha3(jsonStableStringify({ bytes: bytes }));

          const bytecode = await this.bytecode({ id }) || { ...bytecodeInput, id };

          await this.dbApi.bytecodes.put({
            ...bytecode,
            ...bytecodeInput,

            _id: id
          });

          return bytecode;
        }
      ))
    };
  }
}
