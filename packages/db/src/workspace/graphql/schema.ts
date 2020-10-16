import gql from "graphql-tag";
import * as graphql from "graphql";
import { makeExecutableSchema, IResolvers } from "@gnd/graphql-tools";
import pascalCase from "pascal-case";
import { singular } from "pluralize";

import {
  Collections,
  CollectionName,
  MutableCollectionName
} from "@truffle/db/meta";
import { Definition, Definitions } from "./types";
import { schema as rootSchema } from "@truffle/db/schema";
import { resolvers as legacyResolvers } from "./legacy";

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
) => {
  const { typeDefs, resolvers } = new DefinitionsSchema({ definitions });
  return makeExecutableSchema({ typeDefs, resolvers });
};

class DefinitionsSchema<C extends Collections> {
  private definitions: Definitions<C>;
  private collections: CollectionSchemas<C>;

  constructor(options: { definitions: Definitions<C> }) {
    this.definitions = options.definitions;

    this.collections = Object.entries(options.definitions)
      // TODO remove this filter+map once all the resources are setup
      .filter(([_, definition]) => definition.typeDefs)
      .map(([resource]) => resource)

      .map((resource: CollectionName<C>) => ({
        [resource]: this.createSchema(resource)
      }))
      .reduce((a, b) => ({ ...a, ...b }), {}) as CollectionSchemas<C>;
  }

  get typeDefs(): graphql.DocumentNode[] {
    return Object.values(this.collections)
      .map(schema => schema.typeDefs)
      .reduce((a, b) => [...a, ...b], [rootSchema]);
  }

  get resolvers() {
    return Object.values(this.collections).reduce(
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
      legacyResolvers
    );
  }

  private createSchema(
    resource: CollectionName<C>
  ): DefinitionSchema<C, CollectionName<C>> {
    const definition = this.definitions[resource];
    if (definition.mutable) {
      return new MutableDefinitionSchema({
        resource: resource as MutableCollectionName<C>,
        definition
      });
    }

    return new ImmutableDefinitionSchema({
      resource,
      definition
    });
  }
}

abstract class DefinitionSchema<
  C extends Collections,
  N extends CollectionName<C>
> {
  protected resource: N;
  protected definition: Definition<C, N>;

  protected names: {
    resource: string;
    Resource: string;
    resources: N; // sure why not
    Resources: string;
    resourcesMutate: string;
    ResourcesMutate: string;
  };

  constructor(options: { resource: N; definition: Definition<C, N> }) {
    this.resource = options.resource;
    this.definition = options.definition;
  }

  get typeDefs() {
    const { typeDefs } = this.definition;

    const {
      resource,
      resources,
      Resource,
      resourcesMutate,
      ResourcesMutate
    } = this.names;

    return [
      gql`
      ${typeDefs}

      extend type Query {
        ${resources}: [${Resource}]
        ${resource}(id: ID!): ${Resource}
      }

      input ${ResourcesMutate}Input {
        ${resources}: [${Resource}Input!]!
      }

      type ${ResourcesMutate}Payload {
        ${resources}: [${Resource}!]
      }

      extend type Mutation {
        ${resourcesMutate}(
          input: ${ResourcesMutate}Input!
        ): ${ResourcesMutate}Payload
      }
    `
    ];
  }

  get resolvers(): IResolvers {
    const { resource, resources } = this.names;

    const { resolvers = {} } = this.definition;

    return {
      ...resolvers,

      Query: {
        [resource]: {
          resolve: (_, { id }, { workspace }) =>
            workspace.databases.get(resources, id)
        },
        [resources]: {
          resolve: (_, {}, { workspace }) => workspace.databases.all(resources)
        }
      }
    };
  }
}

class ImmutableDefinitionSchema<
  C extends Collections,
  N extends CollectionName<C>
> extends DefinitionSchema<C, N> {
  get names() {
    const resources = this.resource;
    const Resources = pascalCase(resources);

    const resource = singular(resources);
    const Resource = pascalCase(resource);

    const resourcesMutate = `${resources}Add`;

    const ResourcesMutate = pascalCase(resourcesMutate);

    return {
      resource,
      resources,
      Resource,
      Resources,
      resourcesMutate,
      ResourcesMutate
    };
  }

  get resolvers() {
    const { resources, resourcesMutate } = this.names;

    return {
      ...super.resolvers,

      Mutation: {
        [resourcesMutate]: (_, { input }, { workspace }) =>
          workspace.databases.add(resources, input)
      }
    };
  }
}

class MutableDefinitionSchema<
  C extends Collections,
  M extends MutableCollectionName<C>
> extends DefinitionSchema<C, M> {
  get names() {
    const resources = this.resource;
    const Resources = pascalCase(resources);

    const resource = singular(resources);
    const Resource = pascalCase(resource);

    const resourcesMutate = `${resources}Assign`;

    const ResourcesMutate = pascalCase(resourcesMutate);

    return {
      resource,
      resources,
      Resource,
      Resources,
      resourcesMutate,
      ResourcesMutate
    };
  }

  get resolvers() {
    const { resources, resourcesMutate } = this.names;

    return {
      ...super.resolvers,

      Mutation: {
        [resourcesMutate]: (_, { input }, { workspace }) =>
          workspace.databases.update(resources, input)
      }
    };
  }
}

type CollectionSchemas<C extends Collections> = {
  [N in CollectionName<C>]: DefinitionSchema<C, N>;
};
