import { logger } from "@truffle/db/logger";
const debug = logger("db:process");

import gql from "graphql-tag";
import * as graphql from "graphql";
import pascalCase from "pascal-case";
import { singular } from "pluralize";

import {
  CollectionName,
  Collections,
  Input,
  Resource
} from "@truffle/db/meta/collections";
import { IdObject, toIdObject } from "@truffle/db/meta/ids";
import { Definitions, Process } from "./types";

export interface ResourceProcessorsOptions<C extends Collections> {
  definitions: Definitions<C>;
}

export interface ResourceProcessors<C extends Collections> {
  load: <N extends CollectionName<C>>(
    collectionName: N,
    inputs: Input<C, N>[]
  ) => Process<C, IdObject<Resource<C, N>>[]>;

  get: <N extends CollectionName<C>>(
    collectionName: N,
    id: string,
    document: graphql.DocumentNode
  ) => Process<C, Resource<C, N>>;

  find: <N extends CollectionName<C>>(
    collectionName: N,
    ids: string[],
    document: graphql.DocumentNode
  ) => Process<C, Resource<C, N>[]>;

  all: <N extends CollectionName<C>>(
    collectionName: N,
    document: graphql.DocumentNode
  ) => Process<C, Resource<C, N>[]>;
}

export const resourceProcessorsForDefinitions = <C extends Collections>(
  definitions: Definitions<C>
): ResourceProcessors<C> => {
  const names = <N extends CollectionName<C>>(collectionName: N) => {
    const { mutable } = definitions[collectionName];

    const resources = collectionName;
    const Resources = pascalCase(resources);

    const resource = singular(resources);
    const Resource = pascalCase(resource);

    const Mutate = mutable ? "Assign" : "Add";
    const resourcesMutate = `${resources}${Mutate}`;

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

  return {
    *load<N extends CollectionName<C>>(
      collectionName: N,
      inputs: Input<C, N>[]
    ): Process<C, IdObject<Resource<C, N>>[]> {
      const { Resource, Resources, resources, resourcesMutate } = names(
        collectionName
      );

      const response = yield {
        type: "graphql",
        request: gql`
          mutation Load${Resources}(
            $inputs: [${Resource}Input!]!
          ) {
            ${resourcesMutate}(input: { ${resources}: $inputs }) {
              ${resources} {
                id
              }
            }
          }
        `,
        variables: { inputs }
      };

      debug("response %o", response);
      return response.data[resourcesMutate][resources].map(toIdObject);
    },

    *get<N extends CollectionName<C>>(
      collectionName: N,
      id: string,
      document: graphql.DocumentNode
    ): Process<C, Resource<C, N>> {
      debug("get");
      const { Resource, resource } = names(collectionName);

      const fragments = document.definitions
        .filter(({ kind }) => kind === "FragmentDefinition")
        .filter(
          ({ typeCondition }: graphql.FragmentDefinitionNode) =>
            typeCondition.name.value === Resource
        )
        .map(
          ({ name: { value } }: graphql.FragmentDefinitionNode) => `...${value}`
        )
        .join("\n");

      const response = yield {
        type: "graphql",
        request: gql`
          ${document}
          query Get${Resource}($id: ID!) {
            ${resource}(id: $id) {
              ${fragments}
            }
          }
        `,
        variables: {
          id
        }
      };

      debug("response %o", response);

      return response.data[resource];
    },

    *find<N extends CollectionName<C>>(
      collectionName: N,
      ids: string[],
      document: graphql.DocumentNode
    ): Process<C, Resource<C, N>[]> {
      debug("find collectionName %o, ids: %o", collectionName, ids);
      const { Resource, Resources, resources } = names(collectionName);

      const fragments = document.definitions
        .filter(({ kind }) => kind === "FragmentDefinition")
        .filter(
          ({ typeCondition }: graphql.FragmentDefinitionNode) =>
            typeCondition.name.value === Resource
        )
        .map(
          ({ name: { value } }: graphql.FragmentDefinitionNode) => `...${value}`
        )
        .join("\n");

      const request = gql`
        ${document}
        query Find${Resources}($ids: [ID!]!) {
          ${resources}(filter: { ids: $ids }) {
            ${fragments}
          }
        }
      `;

      debug("request: %s", graphql.print(request));

      const response = yield {
        type: "graphql",
        request,
        variables: {
          ids
        }
      };
      debug("response %o", response);

      return response.data[resources];
    },

    *all<N extends CollectionName<C>>(
      collectionName: N,
      document: graphql.DocumentNode
    ): Process<C, Resource<C, N>[]> {
      const { Resource, Resources, resources } = names(collectionName);

      const fragments = document.definitions
        .filter(({ kind }) => kind === "FragmentDefinition")
        .filter(
          ({ typeCondition }: graphql.FragmentDefinitionNode) =>
            typeCondition.name.value === Resource
        )
        .map(
          ({ name: { value } }: graphql.FragmentDefinitionNode) => `...${value}`
        )
        .join("\n");

      const response = yield {
        type: "graphql",
        request: gql`
          ${document}
          query All${Resources} {
            ${resources} {
              ${fragments}
            }
          }
        `,
        variables: {}
      };

      return response.data[resources];
    }
  };
};
