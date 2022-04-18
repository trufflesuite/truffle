module.exports = function (shell) {
  return async _ => {
    const template = require("../../templates")[shell];
    if (template === undefined) {
      const TaskError = require("../../../../errors/taskerror");
      throw new TaskError();
    }

    const completion = template.replace(/{{app_name}}/g, "truffle");
    console.log(completion.replace(/{{app_path}}/g, process.argv[1]));
  };
};
