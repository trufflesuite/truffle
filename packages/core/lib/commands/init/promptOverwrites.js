const fse = require("fs-extra");
const inquirer = require("inquirer");

const promptOverwrites = async (contentCollisions, logger = console) => {
  const overwriteContents = [];

  for (const file of contentCollisions) {
    logger.log(`${file} already exists in this directory...`);
    const overwriting = [
      {
        type: "confirm",
        name: "overwrite",
        message: `Overwrite ${file}?`,
        default: false
      }
    ];

    const { overwrite } = await inquirer.prompt(overwriting);
    if (overwrite) {
      fse.removeSync(file);
      overwriteContents.push(file);
    }
  }

  return overwriteContents;
};

module.exports = { promptOverwrites };
