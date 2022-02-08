<div id="top"></div>

<br />
<div align="center">

<h3 align="center">TruffleDB</h3>

  <p align="center">
    Organize your Blockchain projects before, during, and after deployment
    <br />
    <a href="#examples">View Examples</a>
    ·
    <a href="https://github.com/trufflesuite/truffle/issues">Report Bug</a>
    ·
    <a href="https://github.com/trufflesuite/truffle/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->

  <summary>Table of Contents</summary>

- [Usage](#usage)
- [Model](#model)
  - [Model API](#model-api)
- [Model Instance](model-instance)
  - [Model Instance API](#model-instance-api)
- [Examples](#examples)
  - [Content Addressable Storage ID](#generateid)
  - [Virtuals](#virtuals)
  - [Historical Versioning](#historical-versioning)
- [Roadmap](#roadmap)

## Usage

```sh
$ yarn

$ yarn test

$ yarn nyc
```

```javascript
const TruffleDB = require("@truffle/db");
const db = new TruffleDB();
const { Project } = db.models;

const project = Project.build();

project.name = "Project Name";
await project.save();
```

## Model

A model in TruffleDB is an abstraction representing a namespace in LevelDB. Models are defined as plain JavaScript classes that extend a base `Model` class. The model definition tells Truffle DB the basic details of its represented entity.

A model's class name defines its namespace and its class properties are used to define the JSON object stored in LevelDB. In a relational database, this is equivalent to the table name and table columns.

Model properties can be left undefined, or, provide an object with any combination of `defaultValue`, `required`, or `validation` attributes.

#### `defaultValue`

A newly created instance of the model will set this value for the property.

#### `required`

If this property is `undefined` or `null` the record will not save to the database.

#### `validation`

This function is invoked when the `save` operation is called. It must return `true` or the save operation will error. The validation function will pass its property value to the function as a parameter.

```javascript
const Model = require("../Model");

class Project extends Model {
  name;
  requiredField = {
    defaultValue: "Default Value",
    required: true,
    validation: requiredField => {
      return typeof requiredField === "string";
    }
  };

  someFunction() {}
}

module.exports = Project;
```

Each model provides also static methods for accessing the database - `all`, `build`, `create`, `delete`, `get`, `getMany`, `batchBuild`, `batchCreate`, and `getHistoricalVersions` operations.

## Model API

### `Model.all({options})`

Returns an array of Model Instances for all stored records. `options` is an object supporting the following properties:

- `gt` / `gte` (greater than / greater than equal) defines the lower bound of the key range.
- `lt` / `lte` (lower than / lower than equal) defines the uppoer bound of the key range.
- `reverse` (default: false) returns the entries in reverse order.
- `limit` (default: -1) limits the maximum number of entries returned. -1 implies no limit.

```javascript
const projects = await Project.all();
```

### `Model.build({properties})`

Returns a model instance from an optional properties object. If properties are passed that are not part of the object definition they are ignored. Default values will be set if no matching property is provided.

```javascript
// creates a model instance with default values
const project = await Project.build();

// As above, however name will be set to "test project"
const testProject = await Project.build({ name: "test project" });
```

### `Model.create({properties})`

Identical to `model.build` except that `create` will also invoke the `save` method on the model instance. `create` is subject to the same validation rules defined on the model definition - if a definition contains a required field without a default value, or, if a default value does not satisfy the validation function `create` will fail.

```javascript
const project = await Project.create({
  requiredField: "I have to be a string to pass validation"
});

// Project's model defintion has a validation function for the 'requiredField'
// if 'requiredField' is not a string the save will fail with an error.
const thisWillThrow = await Project.create();
```

### `Model.delete(key)`

Deletes a record from the database matching the key.

```javascript
const project = await Project.create({
  id: 10,
  name: "Memento Mori!",
  requiredField: "String!"
});

await Project.delete(project.id);
```

### `Model.get(key)`

Returns a model instance if the key is found. Returns `undefined` if not.

```javascript
const project = await Project.get(1234);
```

### `Model.getMany([keys])`

Returns an array of model instances for an array of keys. Duplicate keys will return duplicate instances. Keys that are not found return `undefined`.

```javascript
const projectIds = [1, 2, 3, 4, 5, 6];
const projects = await Project.getMany(projectIds);
```

### `Model.batchBuild([projectProperties])`

As `Model.build` but for an array of project properties. Returns an array of Model instances.

```javascript
const projectData = [
  { id: 1, name: "project1" },
  { id: 2, name: "project2" },
  { id: 3, name: "project3" },
  { id: 4, name: "project4" },
  { id: 5, name: "project5" }
];

const projects = await Project.batchBuild(projectData);
```

### `Model.batchCreate([projectProperties])`

```javascript
const projectData = [
  { id: 1, name: "project1", requiredField: "rofl" },
  { id: 2, name: "project2", requiredField: "copter" },
  { id: 3, name: "project3", requiredField: "woosh" },
  { id: 4, name: "project4", requiredField: "woosh" },
  { id: 5, name: "project5", requiredField: "woosh" }
];

const projects = await Project.batchCreate(projectData);
```

### `Model.getHistoricalVersions(key, [limit], [reverse])`

```javascript
const project = await Project.create({ id: 1, name: "project1" });

project.name = "new version";
await project.save();

const historicalData = await Project.getHistoricalVersions(1);
/*
historicalData = [
  { id: 1, name: "project1" },
  {id: 1, name: "new version"}
]
*/
```

<p align="right">(<a href="#top">back to top</a>)</p>

## Model Instance

A model instance is a Data Access Object representing a stored record of the Model. Model instances are created through a factory pattern by invoking the Model's `build` or `create` functions and should **never** be created by instantiating the model using `new`.

A model instance can be changed by directly changing the class properties. Changes will not persist to the database without invoking the `save`. Every model instance is aware of it's own version history and may call the `getHistoricalVersions` method as on a Model without a key parameter.

## Model Instance API

### `instance.save()`

```javascript
const project = Project.build({ id: 0, requiredField: "some value" });

project.name = "Project Mayhem";

await project.save();
```

Save will attempt to persist the current object properties to the database. Any properties that were set that do not exist on the model definition will be ignored. `save` will check for required fields and run any validation functions that were defined for the model.

### `instance.getHistoricalVersions([limit], [reverse])`

```javascript
const project = await Project.create({ id: 1, name: "project1" });

project.name = "new version";
await project.save();

const historicalData = await project.getHistoricalVersions();
/*
historicalData = [
  { id: 1, name: "project1" },
  {id: 1, name: "new version"}
]
*/
```

## Model Instance Hooks

### `beforeSave()`

The `beforeSave` hook is a lifecycle event that can be defined on the Model definition. This function will execute before every save operation.

### `afterSave()`

As `beforeSave` but executes after the `save` operation.

## Examples

### `GenerateId`

You can use the `beforeSave` hook and a custom function definition on the model to create a generative ID based on model properties. The following example computes an `id` for each model instance that is the `sha3` hash recipe of fields on the object. If the id changes, it removes the old record from the database.

```javascript
const Model = require("../Model");
const { soliditySha3 } = require("web3-utils");

class GenerateID extends Model {
  fieldA = {
    defaultValue: "fieldA",
    required: true
  };
  fieldB = {
    defaultValue: "fieldB",
    required: true
  };
  fieldC = {
    defaultValue: "fieldC",
    required: true
  };

  async beforeSave() {
    const newId = this.generateID();

    // Key exists in db, but data fields have changed so remove old key
    // This could also become a batch operation and would then be atomic
    if (this.id && this.id !== newId) {
      await GenerateID.delete(this.id);
    }
    this.id = newId;
  }

  generateID() {
    return soliditySha3(this.fieldA + this.fieldB + this.fieldC);
  }
}

module.exports = GenerateID;
```

### Virtuals

JavaScript class getters and setters can be used as virtual fields for a Model Instance.

```javascript
class Virtual extends Model {
  firstName = {
    defaultValue: "First"
  };

  lastName = {
    defaultValue: "Last"
  };

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(fullName) {
    if (fullName.indexOf(" ") >= 0) {
      const name = fullName.split(" ");
      this.firstName = name[0];
      this.lastName = name[1];
    }
  }
}
```

### Historical Versioning

Both Models and Model Instances are aware of data histories. Every time a `save` operation is performed, the existing data is snapshotted into the version history. Models require a records key and may query any historic version. Model Instances are only aware of their own historic data.

Records that are deleted will persist in the historical database and cannot be deleted. Keys that are re-used will continue appending to the same history. Both functions accept a `limit` and a `reverse` parameter.

#### Model

```javascript
const project = await Project.create({ id: 1, name: "project1" });

project.name = "new version";
await project.save();

const historicalData = await Project.getHistoricalVersions(1);
/*
historicalData = [
  { id: 1, name: "project1" },
  {id: 1, name: "new version"}
]
*/
```

#### Model Instance

```javascript
const project = await Project.create({ id: 1, name: "project1" });

project.name = "new version";
await project.save();

const historicalData = await project.getHistoricalVersions();
/*
historicalData = [
  { id: 1, name: "project1" },
  {id: 1, name: "new version"}
]
*/
```

_For more examples, please refer to the Unit Tests in the `tests` directory_

<p align="right">(<a href="#top">back to top</a>)</p>

## Roadmap

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3
  - [ ] Nested Feature

<p align="right">(<a href="#top">back to top</a>)</p>
