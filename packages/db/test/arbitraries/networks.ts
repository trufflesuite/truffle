import { logger } from "@truffle/db/logger";
const debug = logger("test:arbitraries:networks");

import * as fc from "fast-check";

import { generateId, IdObject } from "@truffle/db/meta";
import { DataModel, Input } from "@truffle/db/resources";

import { fake } from "./fake";

export interface Network extends Input<"networks"> {
  getBlockByNumber(height: number): DataModel.BlockInput;
}

export class Model {
  private byDescendantIndexThenHeight: Input<"networks">[][] = [];

  extendNetwork(descendantIndex: number, hash: string) {
    const networks = this.byDescendantIndexThenHeight[descendantIndex];

    const [latest] = networks.slice(-1);

    networks.push({
      ...latest,
      historicBlock: {
        height: latest.historicBlock.height + 1,
        hash
      }
    });
  }

  addNetwork(network: Input<"networks">) {
    this.byDescendantIndexThenHeight.push([network]);
  }

  forkNetwork(descendantIndex: number, leftHash: string, rightHash: string) {
    const networks = this.byDescendantIndexThenHeight[descendantIndex];

    const [latest] = networks.slice(-1);

    this.byDescendantIndexThenHeight.push([
      ...networks,
      {
        ...latest,
        historicBlock: {
          height: latest.historicBlock.height + 1,
          hash: rightHash
        }
      }
    ]);

    networks.push({
      ...latest,
      historicBlock: {
        height: latest.historicBlock.height + 1,
        hash: leftHash
      }
    });
  }

  get networks (): Network[] {
    return this.byDescendantIndexThenHeight.map(
      networks => {
        const [latest] = networks.slice(-1);
        return {
          ...latest,
          getBlockByNumber:
            (height: number) => (networks[height] || {}).historicBlock
        }
      }
    )
  }
}

const Hash = (): fc.Arbitrary<string> =>
  fc.hexaString({
    minLength: 32,
    maxLength: 32
  }).map(hash => `0x${hash}`);

const Name = (): fc.Arbitrary<string> => fake("{{hacker.noun}}");

const NetworkId = (): fc.Arbitrary<number> => fc.integer({ min: 1 });

namespace Commands {
  type Command = (model: Model) => void;

  export const AddNetwork = (): fc.Arbitrary<Command> =>
    fc.tuple(
      Hash(),
      Name(),
      NetworkId()
    ).map(([
      hash,
      name,
      networkId
    ]) => (model: Model) => {
      model.addNetwork({
        name,
        networkId,
        historicBlock: {
          height: 0,
          hash
        }
      })
    });

  export const ExtendNetwork = (): fc.Arbitrary<Command> =>
    fc.tuple(
      fc.nat(),
      Hash()
    ).map(([
      num,
      hash
    ]) => (model: Model) => {
      const descendantIndex = num % model.networks.length;
      model.extendNetwork(descendantIndex, hash);
    });

  export const ForkNetwork = (): fc.Arbitrary<Command> =>
    fc.tuple(
      fc.nat(),
      Hash(),
      Hash()
    ).map(([
      num,
      leftHash,
      rightHash
    ]) => (model: Model) => {
      const descendantIndex = num % model.networks.length;
      model.forkNetwork(descendantIndex, leftHash, rightHash);
    });
}

export const Networks = (): fc.Arbitrary<Model> =>
  fc.tuple(
    Commands.AddNetwork(),
    fc.array(
      fc.frequency({
        arbitrary: Commands.AddNetwork(),
        weight: 1
      }, {
        arbitrary: Commands.ExtendNetwork(),
        weight: 3
      }, {
        arbitrary: Commands.ForkNetwork(),
        weight: 1
      }),
      { maxLength: 50 }
    )
  ).map(([
    addNetwork,
    commands
  ]) => {
    const model = new Model();

    addNetwork(model);

    for (const command of commands) {
      command(model);
    }

    return model;
  });

export interface Batch {
  descendantIndex: number;
  inputs: Input<"networks">[];
}

export const Batch = (model: Model): fc.Arbitrary<Batch> => {
  const { networks } = model;

  return fc.nat({
    max: networks.length - 1
  }).chain(descendantIndex => {
    const network = networks[descendantIndex];
    const maxHeight = network.historicBlock.height;

    return fc.record({
      descendantIndex: fc.constant(descendantIndex),
      inputs: fc.array(
        fc.nat({ max: maxHeight })
          .map(height => ({
            name: network.name,
            networkId: network.networkId,
            historicBlock: network.getBlockByNumber(height)
          })),
        { maxLength: 5 }
      )
    });
  });
}

export const Batches = (model: Model): fc.Arbitrary<Batch[]> =>
  fc.array(Batch(model), { maxLength: 5 })
