import gql from "graphql-tag";
import { WorkspaceClient } from './utils';

describe("ContractNames", () => {
  test("can be queried", async () => {
    const wsClient = new WorkspaceClient();

    const result = await wsClient.execute(GetContractNames);
    expect(result).toHaveProperty("contractNames");

    const { contractNames } = result;
    expect(contractNames).toEqual([]);
  });
});


export const GetContractNames = gql`
  query GetContractNames {
    contractNames
  }
`;
