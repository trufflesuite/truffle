var fs = require("fs");
var path = require("path");

var Provision = {
  asString(config) {
    var provider = "";
    if (config.app.resolved.provider != null) {
      provider = fs.readFileSync(path.join(config.working_dir, config.app.resolved.provider), "utf8");
    }

    provider = provider.replace(/"/g, '\\"');

    // Double stringify. We'll parse in the inserter code.
    var contracts = JSON.stringify(JSON.stringify(config.contracts.classes, null, 2));
    var inserter_code = fs.readFileSync(config.frontend.contract_inserter_filename, "utf8");
    inserter_code = inserter_code.replace(/\{\{CONTRACTS\}\}/g, contracts);
    inserter_code = inserter_code.replace(/\{\{HOST\}\}/g, config.app.resolved.rpc.host || "");
    inserter_code = inserter_code.replace(/\{\{PORT\}\}/g, config.app.resolved.rpc.port || "");
    inserter_code = inserter_code.replace(/\{\{PROVIDER\}\}/g, provider);

    return inserter_code;
  },

  // Provision the contracts just like the frontend, but returned the
  // provisioned code as its own module. This uses some Module trickery.
  asModule(config) {
    var code = Provision.asString(config);
    var Module = module.constructor;
    var m = new Module();
    m._compile(code);
    return m.exports;
  }
}

module.exports = Provision;
