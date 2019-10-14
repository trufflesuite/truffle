import { WorkspaceClient } from './utils';
import { Query } from './queries';

const { GetContractNames } = Query;

describe("ContractNames", () => {
  it("queries contract names", async () => {
    const client = new WorkspaceClient();

    const data = await client.execute(GetContractNames);
    expect(data).toHaveProperty("contractNames");

    const { contractNames } = data;
    expect(contractNames).toEqual([]);
  });
});


