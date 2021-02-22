import { logger } from "@truffle/db/logger";
const debug = logger("db:resources:projects:resolveContractInstances");

import gql from "graphql-tag";
import { delegateToSchema } from "graphql-tools";
import type * as graphql from "graphql";
import type {
  DataModel,
  NamedCollectionName,
  IdObject,
  SavedInput,
  Workspace
} from "@truffle/db/resources/types";
import { resolveNameRecords } from "./resolveNameRecords";

/**
 * For given contract and/or network names, find all contract instances
 * matching either/both of those filters.
 *
 * Returns contract instances for the most current contract according to that
 * contract's name record history - i.e., if a contract has been revised since
 * being deployed to mainnet, this function will return the contract instance
 * for that past revision.
 */
export async function resolveContractInstances(
  project: IdObject<"projects">,
  inputs: {
    contract?: DataModel.ResourceNameInput;
    address?: string;
    network?: DataModel.ResourceNameInput;
  },
  context: {
    workspace: Workspace;
  },
  info: graphql.GraphQLResolveInfo
): Promise<SavedInput<"contractInstances">[]> {
  const { workspace } = context;

  const contractNameRecords = await resolveNameRecords(
    project,
    { ...inputs.contract, type: "Contract" },
    { workspace }
  );

  const contractInstances: SavedInput<"contractInstances">[] = [];
  debug("inputs %O", inputs);

  for await (const { skip, contracts } of findResourcesHistories({
    collectionName: "contracts",
    nameRecords: contractNameRecords,
    workspace
  })) {
    let stepContractInstances = (
      await workspace.find("contractInstances", {
        selector: {
          "contract.id": {
            $in: contracts
              .filter(
                (contract): contract is IdObject<"contracts"> => !!contract
              )
              .map(({ id }) => id)
          }
        }
      })
    ).filter(
      (contractInstance): contractInstance is SavedInput<"contractInstances"> =>
        !!contractInstance
    );

    if (inputs.network) {
      const ancestors = await filterProjectNetworkAncestors({
        project,
        network: inputs.network,
        candidates: stepContractInstances.map(
          ({ network }) => network as IdObject<"networks">
        ),
        workspace,
        info
      });

      const ancestorIds = new Set([...ancestors.map(({ id }) => id)]);
      stepContractInstances = stepContractInstances.filter(
        ({ network }) => network && ancestorIds.has(network.id)
      );
    }

    const byContractId = stepContractInstances
      .filter(
        (
          contractInstance
        ): contractInstance is SavedInput<"contractInstances"> & {
          contract: IdObject<"contracts">;
        } => !!contractInstance.contract
      )
      .reduce(
        (byContractId, contractInstance) => ({
          ...byContractId,
          [contractInstance.contract.id]: contractInstance
        }),
        {}
      );

    const found = contracts
      .map((contract, index) =>
        contract && contract.id in byContractId ? index : undefined
      )
      .filter((index): index is number => typeof index === "number");

    debug("skipping found indexes: %O", found);
    skip(...found);

    contractInstances.push(...stepContractInstances);
  }

  if (!inputs.address) {
    return contractInstances;
  } else {
    return contractInstances.filter(
      contractInstance => contractInstance.address === inputs.address
    );
  }
}

/**
 * Steps backwards through name record history for a given set of name records,
 * yielding an array of past resources in a breadth-first search manner.
 *
 * At each step, yields a [somewhat HACKy] `skip` function, to omit specific
 * indexes from further consideration.
 *
 * Returns when all name records histories have been exhausted.
 */
async function* findResourcesHistories<
  N extends NamedCollectionName,
  ResourceHistoryStep extends {
    [K in "skip" | N]: "skip" extends K
      ? (...indexes: number[]) => void
      : (IdObject<N> | undefined)[];
  }
>(options: {
  collectionName: N;
  nameRecords: (SavedInput<"nameRecords"> | undefined)[];
  workspace: Workspace;
}): AsyncIterable<ResourceHistoryStep> {
  const { collectionName, workspace } = options;
  let { nameRecords } = options;

  do {
    const skip = (...indexes: number[]) => {
      for (const index of indexes) {
        if (typeof index === "number") {
          nameRecords[index] = undefined;
        }
      }
    };

    yield {
      skip,
      [collectionName]: nameRecords.map(nameRecord =>
        nameRecord && nameRecord.resource
          ? ({ id: nameRecord.resource.id } as IdObject<N>)
          : undefined
      )
    } as ResourceHistoryStep;

    // preserving order, iterate to next set of previous records
    nameRecords = await workspace.find(
      "nameRecords",
      nameRecords.map(nameRecord =>
        nameRecord && nameRecord.previous
          ? (nameRecord.previous as IdObject<"nameRecords">)
          : undefined
      )
    );
  } while (nameRecords.find(nameRecord => nameRecord));
}

/**
 * Given a list of candidate networks, returns a subset list that are each
 * ancestor to the network currently known to a project as a given name.
 */
async function filterProjectNetworkAncestors(options: {
  project: IdObject<"projects">;
  network: DataModel.ResourceNameInput;
  candidates: IdObject<"networks">[];
  workspace: Workspace;
  info: graphql.GraphQLResolveInfo;
}): Promise<IdObject<"networks">[]> {
  const {
    project,
    network,
    candidates: candidateReferences,
    workspace,
    info
  } = options;

  // short-circuit early to avoid extra queries and to avoid index lookup guard
  if (candidateReferences.length === 0) {
    return [];
  }

  const candidates = (
    await workspace.find("networks", candidateReferences)
  ).filter((network): network is SavedInput<"networks"> => !!network);

  // find earliest among candidates to specify minimumHeight to ancestors query
  const earliestCandidate = candidates
    .slice(1)
    .reduce(
      (earliest, network) =>
        earliest.historicBlock.height < network.historicBlock.height
          ? earliest
          : network,
      candidates[0]
    );

  // query ancestors for project network name
  const { network: { ancestors = [] } = {} } = await delegateToSchema({
    schema: info.schema,
    operation: "query",
    fieldName: "project",
    returnType: info.schema.getType("Project") as graphql.GraphQLOutputType,
    args: project,
    info,
    context: { workspace },
    selectionSet: extractSelectionSet(gql`{
      network(name: "${network.name}") {
        ancestors(
          includeSelf: true
          minimumHeight: ${earliestCandidate.historicBlock.height}
        ) {
          id
        }
      }
    }`)
  });

  // filter candidates
  const ancestorIds = new Set([...ancestors.map(({ id }) => id)]);
  return candidates.filter(
    (candidate): candidate is IdObject<"networks"> =>
      candidate && ancestorIds.has(candidate.id)
  );
}

/**
 * Converts a normal gql`` expression into its (preconditional) subset
 * selection set.
 *
 * (To make it easier to construct `delegateToSchema` calls)
 */
function extractSelectionSet(document) {
  return document.definitions
    .map(({ selectionSet }) => selectionSet)
    .find(selectionSet => selectionSet);
}
