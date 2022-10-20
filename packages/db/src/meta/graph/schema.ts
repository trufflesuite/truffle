import { logger } from "@truffle/db/logger";
const debug = logger("db:meta:graph:schema");

import gql from "graphql-tag";
import type * as graphql from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import type { IResolvers } from "@graphql-tools/utils";

import type {
  Collections,
  CollectionName,
  MutableCollectionName
} from "@truffle/db/meta/collections";
import * as Id from "@truffle/db/meta/id";
import type { Context, Definition, Definitions } from "./types";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const { typeDefs, resolvers } = new DefinitionsSchema({ definitions });
  return makeExecutableSchema({ typeDefs, resolvers });
};

class DefinitionsSchema<C extends Collections> {
  private definitions: Definitions<C>;
  private collections: CollectionSchemas<C>;
  private generateId: Id.GenerateId<C>;

  constructor(options: { definitions: Definitions<C> }) {
    this.definitions = options.definitions;
    this.generateId = Id.forDefinitions(options.definitions);

    // @ts-ignore
    this.collections = Object.keys(options.definitions)
      .map((resource: CollectionName<C>) => ({
        [resource]: this.createSchema(resource)
      }))
      .reduce((a, b) => ({ ...a, ...b }), {}) as CollectionSchemas<C>;
  }

  get typeDefs(): graphql.DocumentNode[] {
    const log = debug.extend("typeDefs");
    log("Generating...");

    const common = gql`
      type Query
      type Mutation

      interface Resource {
        id: ID!
        type: String!
      }

      interface Named {
        id: ID!
        type: String!
        name: String!
      }

      input ResourceReferenceInput {
        id: ID!
      }

      input ResourceNameInput {
        name: String!
      }

      input TypedResourceReferenceInput {
        id: ID!
        type: String!
      }

      input QueryFilter {
        ids: [ID]!
      }
    `;

    const result = Object.values(this.collections)
      .map(schema => schema.typeDefs)
      .reduce((a, b) => [...a, ...b], [common]);

    log("Generated.");
    return result;
  }

  get resolvers() {
    const log = debug.extend("resolvers");
    log("Generating...");

    const common = {
      Query: {},
      Mutation: {},

      // HACK bit messy to put this here
      Named: {
        __resolveType: obj => {
          if (obj.networkId) {
            return "Network";
          } else if (obj.abi) {
            return "Contract";
          } else {
            return null;
          }
        }
      }
    };

    const result = Object.values(this.collections).reduce(
      (a, { resolvers: b }) => ({
        ...a,
        ...b,
        Query: {
          ...a.Query,
          ...b.Query
        },
        Mutation: {
          ...a.Mutation,
          ...b.Mutation
        }
      }),
      common
    );

    log("Generated.");
    return result;
  }

  private createSchema<N extends CollectionName<C>>(
    resource: N
  ): DefinitionSchema<C, N> {
    debug("Creating DefinitonSchema for %s...", resource);

    const generateId: Id.SpecificGenerateId<C, N> = input =>
      this.generateId<N>(resource, input);

    const definition = this.definitions[resource];
    if (definition.mutable) {
      const result = new MutableDefinitionSchema<C, any>({
        resource,
        definition,
        generateId
      });

      debug("Created MutableDefinitonSchema for %s.", resource);
      return result;
    }

    const result = new ImmutableDefinitionSchema({
      resource,
      definition,
      generateId
    });

    debug("Created ImmutableDefinitionSchema for %s.", resource);
    return result;
  }
}

abstract class DefinitionSchema<
  C extends Collections,
  N extends CollectionName<C>
> {
  protected resource: N;
  protected definition: Definition<C, N>;
  protected generateId: Id.SpecificGenerateId<C, N>;

  constructor(options: {
    resource: N;
    definition: Definition<C, N>;
    generateId: Id.SpecificGenerateId<C, N>;
  }) {
    this.resource = options.resource;
    this.definition = options.definition;
    this.generateId = options.generateId;
  }

  get typeDefs() {
    const log = debug.extend(`${this.resource}:typeDefs`);
    log("Generating...");

    const { typeDefs } = this.definition;

    const { resource, resources, Resource, resourcesMutate, ResourcesMutate } =
      this.definition.names;

    const result = [
      gql`
      ${typeDefs}

      extend type ${Resource} {
        id: ID!
        type: String!
      }

      extend type Query {
        ${resources}(filter: QueryFilter): [${Resource}]!
        ${resource}(id: ID!): ${Resource}
        ${resource}Id(input: ${Resource}Input!): ID!
      }

      input ${ResourcesMutate}Input {
        ${resources}: [${Resource}Input]!
      }

      type ${ResourcesMutate}Payload {
        ${resources}: [${Resource}]!
      }

      extend type Mutation {
        ${resourcesMutate}(
          input: ${ResourcesMutate}Input!
        ): ${ResourcesMutate}Payload!
      }
    `
    ];

    log("Generated.");
    return result;
  }

  get resolvers(): IResolvers<any, Context<C>> {
    const log = debug.extend(`${this.resource}:resolvers`);
    log("Generating...");

    // setup loggers for specific resolvers
    const logGet = log.extend("get");
    const logAll = log.extend("all");
    const logFilter = log.extend("filter");

    const { resource, resources, Resource } = this.definition.names;

    const { resolvers = {} } = this.definition;

    const result = {
      ...resolvers,

      [Resource]: {
        ...(resolvers[Resource] as any),

        type: () => Resource
      },

      Query: {
        [resource]: {
          resolve: async (_, { id }, { workspace }) => {
            logGet("Getting id: %s...", id);

            const result = await workspace.get(resources, id);

            logGet("Got id: %s.", id);
            return result;
          }
        },
        [resources]: {
          resolve: async (_, { filter }, { workspace }) => {
            if (filter) {
              logFilter("Filtering for ids: %o...", filter.ids);

              const results = await workspace.find(
                resources,
                filter.ids.map(id => ({ id }))
              );

              logFilter("Filtered for ids: %o", filter.ids);
              return results;
            } else {
              logAll("Fetching all...");

              const result = await workspace.all(resources);

              logAll("Fetched all.");
              return result;
            }
          }
        },
        [`${resource}Id`]: {
          resolve: (_, { input }) => {
            debug("resolving %O id", Resource);
            return this.generateId(input);
          }
        }
      }
    };

    log("Generated.");
    return result;
  }
}

class ImmutableDefinitionSchema<
  C extends Collections,
  N extends CollectionName<C>
> extends DefinitionSchema<C, N> {
  override get resolvers() {
    const log = debug.extend(`${this.resource}:resolvers`);
    log("Generating...");

    const logMutate = log.extend("add");

    const { resources, resourcesMutate } = this.definition.names;

    const result = {
      ...super.resolvers,

      Mutation: {
        [resourcesMutate]: async (_, { input }, { workspace }) => {
          logMutate("Mutating...");

          const result = await workspace.add(resources, input);

          logMutate("Mutated.");
          return result;
        }
      }
    };

    log("Generated.");
    return result;
  }
}

class MutableDefinitionSchema<
  C extends Collections,
  M extends MutableCollectionName<C>
> extends DefinitionSchema<C, M> {
  override get resolvers() {
    const log = debug.extend(`${this.resource}:resolvers`);
    log("Generating...");

    const logMutate = log.extend("assign");

    const { resources, resourcesMutate } = this.definition.names;

    const result = {
      ...super.resolvers,

      Mutation: {
        [resourcesMutate]: async (_, { input }, { workspace }) => {
          logMutate("Mutating...");

          const result = await workspace.update(resources, input);

          logMutate("Mutated.");
          return result;
        }
      }
    };

    log("Generated.");
    return result;
  }
}

type CollectionSchemas<C extends Collections> = {
  [N in CollectionName<C>]: DefinitionSchema<C, N>;
};
