// Show errors to the console where fork didn't succeed.
// I forget why we didn't fail outright... maybe these should throw.
var child_process = {
  exec: function() {
    console.error("child_process.exec not implemented");
  },

  execSync: function() {
    console.error("child_process.execSync not implemented");
  },

  fork: function() {
    // throw new Error("child_process.fork not implemented");
    console.error("child_process.fork not implemented");
  }
};

export default child_process;
module.exports = child_process;
