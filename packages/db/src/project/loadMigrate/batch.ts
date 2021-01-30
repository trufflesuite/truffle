/**
 * @category Internal boilerplate
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:loadMigrate:batch");

import type { _ } from "hkts/src";
import type {
  ContractObject,
  NetworkObject
} from "@truffle/contract-schema/spec";

import type { IdObject } from "@truffle/db/resources";
import type { Process } from "@truffle/db/process";
import * as Base from "@truffle/db/project/batch";

export type Config = {
  network?: {};
  artifact?: {};

  requires?: {};
  produces: {};

  entry?: any;
  result?: any;
};

export type Network<C extends Config> = C["network"] & {
  networkId: string;
};
export type Requires<C extends Config> = "requires" extends keyof C
  ? C["requires"]
  : {};
export type Produces<C extends Config> = C["produces"];

export type Entry<C extends Config> = C["entry"];
export type Result<C extends Config> = C["result"];

export type ArtifactNetwork<C extends Config> = NetworkObject & Requires<C>;
export type Artifact<C extends Config> = ContractObject &
  C["artifact"] & {
    db: {
      contract: IdObject<"contracts">;
      callBytecode: IdObject<"bytecodes">;
      createBytecode: IdObject<"bytecodes">;
    };
    networks?: {
      [networkId: string]: ArtifactNetwork<C>;
    };
  };

export type Input<C extends Config> = ArtifactNetwork<C>;
export type Output<C extends Config> = Input<C> & Produces<C>;

export type Structure<C extends Config> = {
  network: Network<C>;
  artifacts: (ContractObject &
    Artifact<C> & {
      db: {
        contract: IdObject<"contracts">;
        callBytecode: IdObject<"bytecodes">;
        createBytecode: IdObject<"bytecodes">;
      };
      networks?: {
        [networkId: string]: _;
      };
    })[];
};

export type Breadcrumb<_C extends Config> = {
  artifactIndex: number;
};

export type Batch<C extends Config> = {
  structure: Structure<C>;
  breadcrumb: Breadcrumb<C>;
  input: Input<C>;
  output: Output<C>;
  entry: Entry<C>;
  result: Result<C>;
};

export type Options<C extends Config> = Omit<
  Base.Options<Batch<C>>,
  "iterate" | "find" | "initialize" | "merge"
>;

export const configure = <C extends Config>(
  options: Options<C>
): (<I extends Base.Input<Batch<C>>, O extends Base.Output<Batch<C>>>(
  inputs: Base.Inputs<Batch<C>, I>
) => Process<Base.Outputs<Batch<C>, I & O>>) =>
  Base.configure<Batch<C>>({
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
