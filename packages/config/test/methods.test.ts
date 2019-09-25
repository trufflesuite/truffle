import fs from 'fs';
import path from 'path';
import assert from 'assert';
import TruffleConfig from '../dist';
import { describe, it } from 'mocha';

const DEFAULT_CONFIG_FILENAME = './test/truffle-config.js';
const BACKUP_CONFIG_FILENAME = './test/truffle.js'; // old config filename

describe('TruffleConfig.detect', () => {
  it('throws if a truffle config isn\'t detected', () => {
    assert.throws(() => {
      TruffleConfig.detect();
    }, 'should have thrown!');
  });
});

before(() => {
  fs.closeSync(fs.openSync('./test/truffle-config.js', 'w'));
  fs.closeSync(fs.openSync('./test/truffle.js', 'w'));
});

after(() => {
  if (fs.existsSync(DEFAULT_CONFIG_FILENAME)) {
    fs.unlinkSync(DEFAULT_CONFIG_FILENAME);
  }

  if (fs.existsSync(BACKUP_CONFIG_FILENAME)) {
    fs.unlinkSync(BACKUP_CONFIG_FILENAME);
  }
});

describe('TruffleConfig.search', () => {
  const options = {
    workingDirectory: `${process.cwd()}/test`
  };

  let loggedStuff = '';

  console.warn = (stringToLog: string) => {
    loggedStuff = loggedStuff + stringToLog;
  };

  it('returns null if passed a file that doesn\'t exist', () => {
    const nonExistentConfig = TruffleConfig.search(options, 'badConfig.js');
    assert.strictEqual(nonExistentConfig, null);
  });

  it('outputs warning and returns truffle-config.js path if both truffle.js and truffle-config.js are found', () => {
    const truffleConfigPath = TruffleConfig.search(options);

    assert.strictEqual(
      path.normalize(truffleConfigPath!),
      path.normalize(`${process.cwd()}/test/truffle-config.js`)
    );

    assert(
      loggedStuff.includes(
        'Warning: Both truffle-config.js and truffle.js were found.'
      )
    );
  });

  it('outputs warning and returns truffle.js path if only truffle.js detected on windows ', () => {
    fs.unlinkSync('./test/truffle-config.js');

    Object.defineProperty(process, 'platform', {
      value: 'win32'
    });

    const truffleConfigPath = TruffleConfig.search(options);

    assert.strictEqual(
      path.normalize(truffleConfigPath!),
      path.normalize(`${process.cwd()}/test/truffle.js`)
    );

    assert(loggedStuff.includes('Warning: Please rename truffle.js'));

    fs.closeSync(fs.openSync('./test/truffle-config.js', 'w'));
  });
});

