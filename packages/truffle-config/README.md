# truffle-config
Utility for interacting with truffle-config.js files

### Usage

 ```javascript
const TruffleConfig = require("truffle-config");

// instantiate a default TruffleConfig object
const newConfig = TruffleConfig.default();

// create a custom TruffleConfig object
const customConfig = new TruffleConfig("/truffleDirPath", "/currentWorkingDirPath", networkObj);

// find a config file and return a new TruffleConfig object using config file settings (cwd)
const truffleConfig = TruffleConfig.detect();

// find a config file and return a new TruffleConfig object from a custom working dir
const truffleConfig = TruffleConfig.detect({ workingDirectory: "./some/Path" });

// find and return a new TruffleConfig object from a custom named config
const customTruffleConfig = TruffleConfig.detect({}, "./customConfig.js");
 ```
