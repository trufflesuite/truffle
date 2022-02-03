import { logger } from "@truffle/db/logger";
const debug = logger("db:network:test:diagrams");

import gql from "graphql-tag";

import * as Process from "@truffle/db/process";
import type { Db, Resource } from "@truffle/db/resources";


interface GenerateGenealogiesDiagramOptions {
  db: Db;
}


export const generateGenealogiesDiagram = async ({
  db
}: GenerateGenealogiesDiagramOptions) => {
  const { run } = Process.Run.forDb(db);
  let lines = [
    "digraph G {",
  ];

  // @ts-ignore
  const networks: Resource<"networks">[] = await run(
    Process.resources.all,
    "networks",
    gql`
      fragment NetworkForDiagram on Network {
        id
        name
        networkId
        historicBlock {
          hash
          height
        }
      }
    `
  );

  const nodes = networks.map(
    ({
      id,
      name,
      historicBlock: {
        height,
        // hash
      }
    }) => `"${id}" [ label = "${name}:${height}" ];`);
  lines = [...lines, ...nodes];


  // debug("networks %o", networks);

  // @ts-ignore
  const networkGenealogies: Resource<"networkGenealogies">[] = await run(
    Process.resources.all,
    "networkGenealogies",
    gql`
      fragment NetworkGenealogyForDiagram on NetworkGenealogy {
        ancestor {
          id
        }
        descendant {
          id
        }
      }
    `
  );

  const edges = networkGenealogies
    .filter(
      (networkGenealogy): networkGenealogy is Resource<"networkGenealogies"> & {
        ancestor: { id: string };
        descendant: { id: string };
      } => !!networkGenealogy.ancestor && !!networkGenealogy.descendant
    )
    .map(
      ({
        ancestor,
        descendant
      }) => `"${ancestor.id}" -> "${descendant.id}";`
    );

  lines = [...lines, ...edges];

  // debug("networkGenealogies %o", networkGenealogies);

  lines = [...lines, "}"];

  debug("lines %s", lines.join("\n"));

}
