const fs = require("fs");
const log = console.log;

// ----------------------- Utils -----------------------------
function processErr(err, output) {
  if (err) {
    log(output);
    throw new Error(err);
  }
}

function waitSecond() {
  return new Promise((resolve, _reject) => setTimeout(() => resolve(), 1250));
}

function getSource(key) {
  return fs.readFileSync(mapping[key].sourcePath);
}

function getArtifactStats() {
  const stats = {};
  names.forEach(key => {
    const mDate = fs.statSync(mapping[key].artifactPath).mtime.getTime();
    stats[key] = mDate;
  });
  return stats;
}

function touchSource(key) {
  const source = getSource(key);
  fs.writeFileSync(mapping[key].sourcePath, source);
}

module.exports = {
  processErr,
  waitSecond,
  getSource,
  getArtifactStats,
  touchSource
};
