/**
 * @category Internal boilerplate
 * @packageDocumentation
 */
import { logger } from "@truffle/db/logger";
const debug = logger("db:project:assignNames:batch");

import { _ } from "hkts/src";

import { IdObject } from "@truffle/db/resources";
import { Process } from "@truffle/db/process";
import * as Base from "@truffle/db/project/batch";

export type Config = {
  assignment: {};
  properties: {};
  entry?: any;
  result?: any;
};

export type Assignment<C extends Config> =
  & { resource: IdObject }
  & C["assignment"];
export type Properties<C extends Config> = C["properties"];

export type Structure<_C extends Config> = {
  project: IdObject<"projects">;
  collectionName: string;
  assignments: _[];
};

export type Breadcrumb<_C extends Config> = {
  assignmentIndex: number;
};

export type Input<C extends Config> = Assignment<C>;
export type Output<C extends Config> = Input<C> & Properties<C>;

export type Entry<C extends Config> = C["entry"];
export type Result<C extends Config> = C["result"];

export type Batch<C extends Config> = {
  structure: Structure<C>;
  breadcrumb: Breadcrumb<C>;
  input: Input<C>;
  output: Output<C>;
  entry: Entry<C>;
  result: Result<C>;
};

export type Options<C extends Config> = Omit<
  Base.Options<Batch<C>>,
  "iterate" | "find" | "initialize" | "merge"
>;

export const configure = <C extends Config>(options: Options<C>) => {
  const processCollection = configureForCollection(options);

  return function* <I extends Input<C>, O extends Output<C>>(options: {
    project: IdObject<"projects">;
    assignments: {
      [collectionName: string]: I[];
    };
  }): Process<{
    project: IdObject<"projects">;
    assignments: {
      [collectionName: string]: (I & O)[];
    };
  }> {
    const { project } = options;

    const result = {
      project,
      assignments: {}
    };
    for (const [collectionName, assignments] of Object.entries(
      options.assignments
    )) {
      debug("collectionName %o", collectionName);
      const outputs = yield* processCollection({
        project,
        collectionName,
        assignments
      });
      debug("outputs %o", outputs);

      result.assignments[collectionName] = outputs.assignments;
    }
    debug("result %o", result);

    return result;
  };
};

const configureForCollection = <C extends Config>(options: Options<C>) =>
  Base.configure<Batch<C>>({
    *iterate<_I, _O>({ inputs }) {
      for (const [
        assignmentIndex,
        assignment
      ] of inputs.assignments.entries()) {
        yield {
          input: assignment,
          breadcrumb: {
            assignmentIndex
          }
        };
      }
    },

    find<_I, _O>({ inputs, breadcrumb }) {
      const { assignmentIndex } = breadcrumb;

      return inputs.assignments[assignmentIndex];
    },

    initialize<I, O>({ inputs }) {
      return {
        project: inputs.project,
        collectionName: inputs.collectionName,
        assignments: inputs.assignments.map(assignment => assignment as I & O)
      };
    },

    merge<I, O>({ outputs, breadcrumb, output }) {
      const { assignmentIndex } = breadcrumb;

      const assignmentsBefore = outputs.assignments.slice(0, assignmentIndex);
      const assignment: I & O = output;
      const assignmentsAfter = outputs.assignments.slice(assignmentIndex + 1);

      return {
        project: outputs.project,
        collectionName: outputs.collectionName,
        assignments: [...assignmentsBefore, assignment, ...assignmentsAfter]
      };
    },

    ...options
  });
