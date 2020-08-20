"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProjectNamesAssign = exports.generateProjectNameResolve = exports.generateProjectLoad = exports.ResolveProjectName = exports.AssignProjectNames = exports.AddProjects = void 0;
const add_graphql_1 = require("./add.graphql");
Object.defineProperty(exports, "AddProjects", {
  enumerable: true,
  get: function () {
    return add_graphql_1.AddProjects;
  }
});
const assign_graphql_1 = require("./assign.graphql");
Object.defineProperty(exports, "AssignProjectNames", {
  enumerable: true,
  get: function () {
    return assign_graphql_1.AssignProjectNames;
  }
});
const resolve_graphql_1 = require("./resolve.graphql");
Object.defineProperty(exports, "ResolveProjectName", {
  enumerable: true,
  get: function () {
    return resolve_graphql_1.ResolveProjectName;
  }
});
function* generateProjectLoad(directory) {
  const result = yield {
    request: add_graphql_1.AddProjects,
    variables: {
      projects: [{ directory }]
    }
  };
  return result.data.workspace.projectsAdd.projects[0];
}
exports.generateProjectLoad = generateProjectLoad;
function* generateProjectNameResolve(project, name, type) {
  const result = yield {
    request: resolve_graphql_1.ResolveProjectName,
    variables: {
      projectId: project.id,
      name,
      type
    }
  };
  return result.data.workspace.project.resolve[0];
}
exports.generateProjectNameResolve = generateProjectNameResolve;
function* generateProjectNamesAssign(project, nameRecords) {
  const projectNames = nameRecords.map(({ id, name, type }) => ({
    project,
    nameRecord: { id },
    name,
    type
  }));
  yield {
    request: assign_graphql_1.AssignProjectNames,
    variables: { projectNames }
  };
}
exports.generateProjectNamesAssign = generateProjectNamesAssign;
//# sourceMappingURL=index.js.map
