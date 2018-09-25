const inquirer = require('inquirer');
const sinon = require('sinon');
const assert = require('assert');
const sandbox = sinon.createSandbox();

const questions = [
  {
    type: 'confirm',
    name: 'overwrite',
    message: `Overwrite {file}?`,
    default: false
  }
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
