const path = require("path");
const fse = require("fs-extra");
const { promptOverwrites } = require("./promptOverwrites");

const copyFiles = async (destination, options) => {
  fse.ensureDirSync(destination);
  const { force, logger } = options;
  const sourcePath = path.resolve(
    path.join(
      options.truffle_directory,
      "../",
      "core",
      "lib",
      "commands",
      "init",
      "source"
    )
  );
  const projectFiles = fse.readdirSync(sourcePath);
  const destinationContents = fse.readdirSync(destination);

  const newContents = projectFiles.filter(
    (filename) => !destinationContents.includes(filename)
  );

  const contentCollisions = projectFiles.filter((filename) =>
    destinationContents.includes(filename)
  );

  let shouldCopy;
  if (force) {
    shouldCopy = boxContents;
  } else {
    const overwriteContents = await promptOverwrites(contentCollisions, logger);
    shouldCopy = [...newContents, ...overwriteContents];
  }

  for (const file of shouldCopy) {
    fse.copySync(sourcePath, path.join(destination, file));
  }
};

module.exports = { copyFiles };
