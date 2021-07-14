const main = () => {
  console.log("Snippet Loaded");

  // todo: might need to allow some time for io flush
  setTimeout(() => process.exit(0), 0);
}

// N.B. this is not how this feature is intended to be used. This module is
// constructed to verify that truffle develop requires a specified module.
main();
