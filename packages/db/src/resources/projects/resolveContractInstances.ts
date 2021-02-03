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

  for await (const { skip, contracts } of findResourcesHistories<"contracts">({
    collectionName: "contracts",
    nameRecords: contractNameRecords,
    workspace
  })) {
    let stepContractInstances = await workspace.find("contractInstances", {
      selector: {
        "contract.id": { $in: contracts.map(({ id }) => id) }
      }
    });

    if (inputs.network) {
      const ancestors = await filterProjectNetworkAncestors({
        project,
        network: inputs.network,
        candidates: stepContractInstances.map(({ network }) => network),
        workspace,
        info
      });

      const ancestorIds = new Set([...ancestors.map(({ id }) => id)]);
      stepContractInstances = stepContractInstances.filter(({ network }) =>
        ancestorIds.has(network.id)
      );
    }

    const byContractId = stepContractInstances.reduce(
      (byContractId, contractInstance) => ({
        ...byContractId,
        [contractInstance.contract.id]: contractInstance
      }),
      {}
    );

    const found = contracts.map(({ id }, index) =>
      id in byContractId ? index : undefined
    );

    debug("skipping found indexes: %O", found);
    skip(...found);

    contractInstances.push(...stepContractInstances);
  }

  return contractInstances;
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
async function* findResourcesHistories<N extends NamedCollectionName>(options: {
  collectionName: N;
  nameRecords: (SavedInput<"nameRecords"> | undefined)[];
  workspace: Workspace;
}): AsyncIterable<
  {
    [K in "skip" | N]: "skip" extends K
      ? (...indexes: number[]) => void
      : (IdObject<N> | undefined)[];
  }
> {
  const { collectionName, workspace } = options;
  let { nameRecords } = options;

  do {
    const skip = (...indexes: (number | undefined)[]) => {
      for (const index of indexes) {
        if (typeof index === "number") {
          nameRecords[index] = undefined;
        }
      }
    };

    // @ts-ignore
    yield {
      skip,
      [collectionName]: nameRecords.map(nameRecord =>
        nameRecord && nameRecord.resource
          ? ({ id: nameRecord.resource.id } as IdObject<N>)
          : undefined
      )
    };

    // preserving order, iterate to next set of previous records
    nameRecords = await workspace.find(
      "nameRecords",
      nameRecords.map(nameRecord =>
        nameRecord && nameRecord.previous ? nameRecord.previous : undefined
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
  const { project, network, workspace, info } = options;

  // short-circuit early to avoid extra queries and to avoid index lookup guard
  if (options.candidates.length === 0) {
    return [];
  }

  const candidates = await workspace.find("networks", options.candidates);

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
  // @ts-ignore for the stubs
  return candidates.filter(({ id }) => ancestorIds.has(id));
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
