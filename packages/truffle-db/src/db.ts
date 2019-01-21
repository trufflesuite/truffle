import { graphql } from "graphql";
import { schema } from "truffle-db/data";

export { schema };

export default class TruffleDB {
  async query (query: string): Promise<any> {
    return await graphql(schema, query);
  }
}
