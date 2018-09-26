const inquirer = require('inquirer');
const sinon = require('sinon');
const assert = require('assert');
const sandbox = sinon.createSandbox();
const promptMocks = require('./helpers/promptMocks.js');

// prompt questions
const questions = [
  {
    type: 'confirm',
    name: 'overwrite',
    message: `Overwrite {file}?`,
    default: false
  }
];

// bare box example
const tmpDir = [
  'contracts',
  'migrations',
  'test',
  'truffle-config.js'
];

// target directory example
const destination = [
  'contracts',
  'package.json',
  '.git',
  'node_modules'
];

describe('mock init/unbox prompt', () => {

  afterEach(() => {
    sandbox.restore();
  });

  it('...prompt questions formatted correctly', () => {
    const inquirerPromptStub = sandbox.stub(inquirer, 'prompt').onCall(0).resolves();

    return inquirer.prompt(questions)
      .then(answer => {
        assert.strictEqual(inquirerPromptStub.getCall(0).args[0], questions);
      });
  });

  it('...default response is false (do not overwrite)', async () => {
    const inquirerPromptStub = sandbox.stub(inquirer, 'prompt').onCall(0).resolves();

    const expectedDefault = false;

    return inquirer.prompt(questions)
      .then(answer => {
        assert.strictEqual(inquirerPromptStub.getCall(0).args[0][0].default, expectedDefault);
      });
  });
});

describe('mock copyTempIntoDestination', () => {

  it(`...can use force flag to copy box contents into target directory without prompt`, () => {
    const result = promptMocks.mockCopyTempIntoDestination(tmpDir, destination, true);

    let newContents = tmpDir.filter(
      (file) => !destination.includes(file)
    );

    let afterForce = [...newContents, ...destination];
    assert.deepEqual(result, afterForce);
  });

  it('...can use init/unbox prompt to overwrite all redundant files/folders', () => {
    const result = promptMocks.mockCopyTempIntoDestination(tmpDir, destination, false, true);

    let newContents = tmpDir.filter(
      (file) => !destination.includes(file)
    );

    let afterOverwriteAll = [...newContents, ...destination];
    assert.deepEqual(result, afterOverwriteAll);
  });

  it('...can use init/unbox prompt to not overwrite any redundant files/folders', () => {
    const result = promptMocks.mockCopyTempIntoDestination(tmpDir, destination, false, false);

    let newContents = tmpDir.filter(
      (file) => !destination.includes(file)
    );

    let afterNoOverwrite = [...newContents, ...destination];
    assert.deepEqual(result, afterNoOverwrite);
  });
});

describe('mock promptOverwrites', () => {

  let collisions = [
    "migrations"
  ];

  it('...can choose to overwrite redundant files/folders', () => {
    const result = promptMocks.mockPromptOverwrites(collisions, true);
    assert.deepEqual(result, collisions);
  });

  it('...can choose to not overwrite redundant files/folders', () => {
    const result = promptMocks.mockPromptOverwrites(collisions, false);
    assert.deepEqual(result, []);
  });
});
