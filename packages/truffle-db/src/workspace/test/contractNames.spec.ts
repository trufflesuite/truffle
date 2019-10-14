import { WorkspaceClient } from './utils';
import { Query } from './queries';

const { GetContractNames } = Query;

describe("ContractNames", () => {
  test("can be queried", async () => {
    const wsClient = new WorkspaceClient();

    const result = await wsClient.execute(GetContractNames);
    expect(result).toHaveProperty("contractNames");

    const { contractNames } = result;
    expect(contractNames).toEqual([]);
  });
});


