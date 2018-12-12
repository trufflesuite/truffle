const path = require("path");
const { task, watch, series } = require('gulp');
const Gitdown = require('gitdown');

task('gitdown', () => {
  const gitdown = Gitdown.readFile(path.join(__dirname, "src", "index.md"));
  return gitdown.writeFile('dist.md');
});

task('watch', () => {
  watch('./src', series(['gitdown']));
});


task('default', series('gitdown'));
