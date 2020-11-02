import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:contracts");

import { Load } from "@truffle/db/loaders/types";
import { toIdObject, IdObject } from "@truffle/db/meta";

import { GetContract } from "./get.graphql";

export { FindContracts } from "./find.graphql";

import { AddContracts } from "./add.graphql";
export { AddContracts };

export function* generateContractsLoad(
  inputs: DataModel.ContractInput[]
): Load<IdObject<DataModel.Contract>[], { graphql: "contractsAdd" }> {
  const result = yield {
    type: "graphql",
    request: AddContracts,
    variables: { contracts: inputs }
  };

  const { contracts } = result.data.contractsAdd;

  return contracts.map(toIdObject);
}

export function* generateContractGet({
  id
}: IdObject<DataModel.Contract>): Load<
  DataModel.Contract | undefined,
  { graphql: "contract" }
> {
  debug("Generating contract get...");

  const response = yield {
    type: "graphql",
    request: GetContract,
    variables: {
      id
    }
  };

  const contract = response.data.contract;

  debug("Generated contract get.");
  return contract;
}
