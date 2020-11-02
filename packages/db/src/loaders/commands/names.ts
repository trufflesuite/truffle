import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:commands:names");

import gql from "graphql-tag";
import { singular } from "pluralize";
import pascalCase from "pascal-case";

import { generateProjectNamesAssign } from "@truffle/db/loaders/resources/projects";

import { generate } from "@truffle/db/generate";
import { generateNameRecordsLoad } from "@truffle/db/loaders/resources/nameRecords";
import { Process } from "@truffle/db/resources";
import { IdObject } from "@truffle/db/meta";

/**
 * generator function to load nameRecords and project names into Truffle DB
 */
export function* generateNamesLoad(
  project: IdObject<DataModel.Project>,
  assignments: {
    [collectionName: string]: IdObject[];
  }
): Process<DataModel.NameRecord[]> {
  let getCurrent = function* (name, type) {
    const {
      resolve: [nameRecord]
    } = yield* generate.get(
      "projects",
      project.id,
      gql`
      fragment Resolve_${name}_${type} on Project {
        resolve(type: "${type}", name: "${name}") {
          id
          resource {
            id
            name
          }
        }
      }
    `
    );

    return nameRecord;
  };

  const loadedNameRecords = [];
  for (const [collectionName, resources] of Object.entries(assignments)) {
    const type = singular(pascalCase(collectionName));

    const nameRecords = yield* generateNameRecordsLoad(
      resources,
      type,
      getCurrent
    );

    loadedNameRecords.push(...nameRecords);
    yield* generateProjectNamesAssign(project, nameRecords);
  }

  return loadedNameRecords;
}
