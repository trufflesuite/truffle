import { logger } from "@truffle/db/logger";
const debug = logger("db:loaders:resources:projects");

export { AddProjects } from "./add.graphql";
export { ResolveProjectName } from "./resolve.graphql";
export { AssignProjectNames } from "./assign.graphql";
