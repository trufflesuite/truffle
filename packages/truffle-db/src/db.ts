import { graphql } from "graphql";
import { schema } from "truffle-db/data";
import { IProject } from "truffle-db/data/interface";

import { models } from "truffle-db/artifacts";

export { schema };

export default class TruffleDB {
  context: any;

  constructor (artifacts: models.ITruffleResolver) {
    this.context = new models.Context(artifacts);
  }

  async query (query: string): Promise<any> {
    return await graphql(schema, query);
  }
}
