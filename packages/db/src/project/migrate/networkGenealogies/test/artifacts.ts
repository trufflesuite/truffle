import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:networkGenealogies:test:artifacts");

import { Project } from "@truffle/db";
import { resources } from "@truffle/db/process";
import { DataModel, IdObject } from "@truffle/db/resources";
import { Batch, Model } from "test/arbitraries/networks";

export const prepareArtifacts = async (options: {
  project: Project;
  model: Model;
  batch: Batch;
}): Promise<{
  network: {
    networkId: number;
  };
  artifacts: {
    networks: {
      [networkId: string]: {
        block: DataModel.Block;
        db: {
          network: IdObject<"networks">;
        };
      };
    };
  }[];
}> => {
  const { model, batch, project } = options;
  const { descendantIndex, inputs } = batch;

  const { networkId } = model.networks[descendantIndex];

  const networks = await project.run(resources.load, "networks", inputs);

  return {
    network: {
      networkId
    },
    artifacts: networks.map((network: IdObject<"networks">, index) => ({
      networks: {
        [networkId]: {
          block: inputs[index].historicBlock,
          db: {
            network
          }
        }
      }
    }))
  };
};
