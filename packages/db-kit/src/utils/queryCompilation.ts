import gql from "graphql-tag";
import { Db, Resources, Process } from "@truffle/db";

export interface QueryCompilationOptions {
  db: Db;
  project: Resources.IdObject<"projects">;
  address: string;
  network: Pick<Resources.Input<"networks">, "name">;
}

export async function queryCompilation({
  db,
  project,
  address,
  network
}: QueryCompilationOptions): Promise<
  Resources.Resource<"compilations"> | undefined
> {
  const ContractInstanceForAddress = gql`
    query ContractInstanceForAddress(
      $projectId: ID!
      $network: ResourceNameInput!
      $address: Address!
    ) {
      project(id: $projectId) {
        contractInstance(address: $address, network: $network) {
          contract {
            compilation {
              id

              compiler {
                name
                version
              }

              sourceMaps {
                bytecode {
                  id
                }
                data
              }

              immutableReferences {
                bytecode {
                  id
                }
                astNode
                length
                offsets
              }

              contracts {
                name

                abi {
                  json
                }

                createBytecode {
                  id
                  bytes
                  linkReferences {
                    name
                    length
                    offsets
                  }
                }
                callBytecode {
                  id
                  bytes
                  linkReferences {
                    name
                    length
                    offsets
                  }
                }
                processedSource {
                  source {
                    id
                  }
                }
              }

              processedSources {
                ast {
                  json
                }
                source {
                  id
                  contents
                  sourcePath
                }
                language
              }
            }
          }
        }
      }
    }
  `;

  const {
    data: {
      project: { contractInstance }
    }
  } = (await db.execute(ContractInstanceForAddress, {
    projectId: project.id,
    address,
    network
  })) as { data: Process.Query<"project"> };

  return contractInstance?.contract?.compilation;
}
