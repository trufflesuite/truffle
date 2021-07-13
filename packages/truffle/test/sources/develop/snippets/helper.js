const main = () => {
  console.log("Snippet Loaded");

  // todo: might need to allow some time for io flush
  setTimeout(() => process.exit(0), 0);
}

main();
