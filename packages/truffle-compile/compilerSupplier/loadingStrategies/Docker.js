const request = require("request-promise");
const LoadingStrategy = require("./LoadingStrategy");

class Docker extends LoadingStrategy {
  load() {
    return this.getBuilt("docker");
  }

  getDockerTags() {
    return request(this.config.dockerTagsUrl)
      .then(list => JSON.parse(list).results.map(item => item.name))
      .catch(err => {
        throw self.errors("noRequest", this.config.dockerTagsUrl, err);
      });
  }
}

module.exports = Docker;
