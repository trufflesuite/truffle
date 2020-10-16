import gql from "graphql-tag";
import * as graphql from "graphql";
import pascalCase from "pascal-case";
import { singular } from "pluralize";

import { Collections, CollectionName } from "@truffle/db/meta";

export type Definitions<C extends Collections> = {
  [N in CollectionName<C>]: {
    mutable?: boolean;
    typeDefs?: graphql.DocumentNode;
  };
};

export type Definition<
  C extends Collections,
  N extends CollectionName<C>
> = Definitions<C>[N];

export const names = <C extends Collections, N extends CollectionName<C>>(
  collectionName: N,
  definition: Definition<C, N>
) => {
  const resources = collectionName;
  const Resources = pascalCase(resources);

  const resource = singular(collectionName);
  const Resource = pascalCase(resource);

  const resourcesMutate = definition.mutable
    ? `${resources}Assign`
    : `${resources}Add`;

  const ResourcesMutate = pascalCase(resourcesMutate);

  return {
    resource,
    resources,
    Resource,
    Resources,
    resourcesMutate,
    ResourcesMutate
  };
};

export const typeDefs = <C extends Collections, N extends CollectionName<C>>(
  collectionName: N,
  definition: Definition<C, N>
): graphql.DocumentNode => {
  const { typeDefs } = definition;

  const {
    resource,
    resources,
    Resource,
    resourcesMutate,
    ResourcesMutate
  } = names(collectionName, definition);

  return gql`
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
  `;
};

export const resolvers = <C extends Collections, N extends CollectionName<C>>(
  collectionName: N,
  definition: Definition<C, N>
) => {
  const { resource, resources, resourcesMutate } = names(
    collectionName,
    definition
  );

  return {
    Query: {
      [resource]: {
        resolve: (_, { id }, { workspace }) =>
          workspace.databases.get(resources, id)
      },
      [resources]: {
        resolve: (_, {}, { workspace }) => workspace.databases.all(resources)
      }
    },
    Mutation: {
      [resourcesMutate]: definition.mutable
        ? (_, { input }, { workspace }) =>
            workspace.databases.update(resources, input)
        : (_, { input }, { workspace }) =>
            workspace.databases.add(resources, input)
    }
  };
};
