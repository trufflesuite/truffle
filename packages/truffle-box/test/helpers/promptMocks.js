// mocks for current init/unbox collision prompts

function mockCopyTempIntoDestination(tmpDir, destination, force, overwriteAll) {
  // mock readdirSync
  const boxContents = tmpDir;
  const destinationContents = destination;

  const newContents = boxContents.filter(
    (filename) => !destinationContents.includes(filename)
  );

  const contentCollisions = boxContents.filter(
    (filename) => destinationContents.includes(filename)
  );

  let shouldCopy;
  let overwriteContents;
  if (force) {
    shouldCopy = boxContents;
   
    // mock overwrite
    shouldCopy = boxContents.filter(
      (filename) => !destinationContents.includes(filename)
    );
  } else {
    // for now assume either all files overwritten or none
    if (overwriteAll) {
      overwriteContents = mockPromptOverwrites(contentCollisions, overwriteAll);
      shouldCopy = [...newContents, ...overwriteContents];

      // overwrite
      shouldCopy = shouldCopy.filter(
        (filename) => !overwriteContents.includes(filename)
      );
    } else {
      overwriteContents = mockPromptOverwrites(contentCollisions, false);
      shouldCopy = [...newContents, ...overwriteContents];
    }
  }

  // mock copySync 
  return [...shouldCopy, ...destinationContents];
};

function mockPromptOverwrites(contentCollisions, overwriteAll) {
  let overwriteContents = [];
  
  for (let file of contentCollisions) {
    // assume either all files overwritten or none
    if (overwriteAll) {
      overwriteContents.push(file);
    }
  }
    
  return overwriteContents;
};

module.exports = {
  mockCopyTempIntoDestination,
  mockPromptOverwrites
}
