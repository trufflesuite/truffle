# truffle-config
Utility for interacting with truffle-config.js files

### Usage
 ```javascript
const TruffleConfig = require("truffle-config");
```

#### Instantiate default TruffleConfig object
 ```javascript
const newConfig = TruffleConfig.default();
```

#### Instantiate custom TruffleConfig object
 ```javascript
const customConfig = new TruffleConfig("/truffleDirPath", "/currentWorkingDirPath", networkObj);
```

#### Config.detect()
 ```javascript
// find config file & return new TruffleConfig object with config file settings (cwd)
const truffleConfig = TruffleConfig.detect();

// find config file & return new TruffleConfig object from custom working dir
const truffleConfig = TruffleConfig.detect({ workingDirectory: "./some/Path" });

// find & return new TruffleConfig object from custom named config
const customTruffleConfig = TruffleConfig.detect({}, "./customConfig.js");
 ```
