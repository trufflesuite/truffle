import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:loaders");

import gql from "graphql-tag";
import * as graphql from "graphql";
import pascalCase from "pascal-case";
import { singular } from "pluralize";

import {
  CollectionName,
  Collections,
  Input,
  Resource,
  IdObject,
  toIdObject
} from "@truffle/db/meta";

import { Definitions, Load } from "./types";

export interface LoadersOptions<C extends Collections> {
  definitions: Definitions<C>;
}

export const forDefinitions = <C extends Collections>(
  definitions: Definitions<C>
): Loaders<C> => {
  return new Loaders({ definitions });
};

export class Loaders<C extends Collections> {
  private definitions: Definitions<C>;

  constructor(options: LoadersOptions<C>) {
    this.definitions = options.definitions;
  }

  *load<N extends CollectionName<C>>(
    collectionName: N,
    inputs: Input<C, N>[]
  ): Load<IdObject<Resource<C, N>>[]> {
    const { Resource, Resources, resources, resourcesMutate } = this.names(
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
  }

  *get<N extends CollectionName<C>>(
    collectionName: N,
    id: string,
    document: graphql.DocumentNode
  ): Load<Resource<C, N>> {
    debug("get");
    const { Resource, resource } = this.names(collectionName);

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
  }

  *find<N extends CollectionName<C>>(
    collectionName: N,
    ids: string[],
    document: graphql.DocumentNode
  ): Load<Resource<C, N>[]> {
    debug("find collectionName %o", collectionName);
    const { Resource, Resources, resources } = this.names(collectionName);

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
  }

  *all<N extends CollectionName<C>>(
    collectionName: N,
    document: graphql.DocumentNode
  ): Load<Resource<C, N>[]> {
    const { Resource, Resources, resources } = this.names(collectionName);

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

  private names<N extends CollectionName<C>>(collectionName: N) {
    const { mutable } = this.definitions[collectionName];

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
  }
}
