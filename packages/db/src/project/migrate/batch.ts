import { logger } from "@truffle/db/logger";
const debug = logger("db:project:migrate:batch");

import { ContractObject, NetworkObject } from "@truffle/contract-schema/spec";
import * as Meta from "@truffle/db/meta";
import { DataModel, Process, _, IdObject } from "@truffle/db/project/process";

type Config = {
  network?: {};
  artifact?: {};

  requires?: {};
  produces: {};

  entry?: any;
  result?: any;
};

type Network<C extends Config> = C["network"] & {
  networkId: string;
};
type Requires<C extends Config> = "requires" extends keyof C
  ? C["requires"]
  : {};
type Produces<C extends Config> = C["produces"];

type Entry<C extends Config> = C["entry"];
type Result<C extends Config> = C["result"];

type ArtifactNetwork<C extends Config> = NetworkObject & Requires<C>;
type Artifact<C extends Config> = ContractObject &
  C["artifact"] & {
    db: {
      contract: IdObject<DataModel.Contract>;
      callBytecode: IdObject<DataModel.Bytecode>;
      createBytecode: IdObject<DataModel.Bytecode>;
    };
    networks?: {
      [networkId: string]: ArtifactNetwork<C>;
    };
  };

type Input<C extends Config> = ArtifactNetwork<C>;
type Output<C extends Config> = Input<C> & Produces<C>;

type Structure<C extends Config> = {
  network: Network<C>;
  artifacts: (ContractObject &
    Artifact<C> & {
      db: {
        contract: IdObject<DataModel.Contract>;
        callBytecode: IdObject<DataModel.Bytecode>;
        createBytecode: IdObject<DataModel.Bytecode>;
      };
      networks?: {
        [networkId: string]: _;
      };
    })[];
};

type Breadcrumb<_C extends Config> = {
  artifactIndex: number;
};

type Batch<C extends Config> = {
  structure: Structure<C>;
  breadcrumb: Breadcrumb<C>;
  input: Input<C>;
  output: Output<C>;
  entry: Entry<C>;
  result: Result<C>;
};

type Options<C extends Config> = Omit<
  Meta.Batch.Options<Batch<C>>,
  "iterate" | "find" | "initialize" | "merge"
>;

export const generate = <C extends Config>(
  options: Options<C>
): (<
  I extends Meta.Batch.Input<Batch<C>>,
  O extends Meta.Batch.Output<Batch<C>>
>(
  inputs: Meta.Batch.Inputs<Batch<C>, I>
) => Process<Meta.Batch.Outputs<Batch<C>, I & O>>) =>
  Meta.Batch.configure<Batch<C>>({
    *iterate<_I>({
      inputs: {
        artifacts,
        network: { networkId }
      }
    }) {
      for (const [artifactIndex, artifact] of artifacts.entries()) {
        if (!artifact.networks) {
          continue;
        }

        const artifactNetwork = artifact.networks[networkId];

        if (!artifactNetwork) {
          continue;
        }

        yield {
          input: artifactNetwork,
          breadcrumb: { artifactIndex }
        };
      }
    },

    find<_I>({
      inputs: {
        artifacts,
        network: { networkId }
      },
      breadcrumb
    }) {
      const { artifactIndex } = breadcrumb;
      return artifacts[artifactIndex].networks[networkId];
    },

    initialize<I, O>({ inputs: { artifacts, network } }) {
      return {
        network,
        artifacts: artifacts.map(
          artifact =>
            ({
              ...artifact,

              networks: {
                ...artifact.networks
              } as { [networkId: string]: I & O }
            } as Artifact<C> & { networks?: { [networkId: string]: I & O } })
        )
      };
    },

    merge<I, O>({ outputs: { network, artifacts }, breadcrumb, output }) {
      debug("output %o", output);
      const { networkId } = network;
      const { artifactIndex } = breadcrumb;
      const artifactsBefore: (Artifact<C> & {
        networks?: { [networkId: string]: I & O };
      })[] = artifacts.slice(0, artifactIndex);
      const artifact = artifacts[artifactIndex];
      const artifactsAfter: (Artifact<C> & {
        networks?: { [networkId: string]: I & O };
      })[] = artifacts.slice(artifactIndex + 1);

      const artifactNetwork: I & O = {
        ...artifact.networks[networkId],
        ...output
      };

      return {
        network,
        artifacts: [
          ...artifactsBefore,
          {
            ...artifact,
            networks: {
              ...artifact.networks,

              [networkId]: artifactNetwork
            }
          },
          ...artifactsAfter
        ]
      };
    },

    ...options
  });
