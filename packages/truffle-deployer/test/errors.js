const ganache = require("ganache-cli");
const contract = require("truffle-contract");
const Web3 = require("web3");
const assert = require("assert");

const Deployer = require("../index");
const Reporter = require("./helpers/reporter")
const utils = require('./helpers/utils');

describe("Error cases", function() {
  let owner;
  let accounts;
  let options;
  let networkId;
  let deployer;
  let reporter;
  let output = '';
  let Example;
  let UsesExample;
  let IsLibrary;
  let UsesLibrary;

  const provider = ganache.provider({
    vmErrorsOnRPCResponse: false
  });

  const web3 = new Web3(provider);

  beforeEach(async function() {
    networkId = await web3.eth.net.getId();
    accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    await utils.compile();

    Example =       utils.getContract('Example', provider, networkId, owner);
    ExampleRevert = utils.getContract('ExampleRevert', provider, networkId, owner);
    ExampleAssert = utils.getContract('ExampleAssert', provider, networkId, owner);
    UsesExample =   utils.getContract('UsesExample', provider, networkId, owner);
    UsesLibrary =   utils.getContract('UsesLibrary', provider, networkId, owner);
    IsLibrary =     utils.getContract('IsLibrary', provider, networkId, owner);
    Abstract =      utils.getContract('Abstract', provider, networkId, owner);
    Loops =         utils.getContract('Loops', provider, networkId, owner)

    options = {
      contracts: [
        Example,
        ExampleRevert,
        ExampleAssert,
        UsesExample,
        IsLibrary,
        UsesLibrary,
        Abstract,
        Loops
      ],
      network: 'test',
      network_id: networkId,
      provider: provider,
      logger: {
        log:   (val) => { if (val) output += `${val}\n`},
        error: (val) => { if (val) output += `${val}\n`}
      }
    }
    deployer = new Deployer(options);
    reporter = new Reporter(deployer);
  });

  afterEach(() => {
    output = '';
    utils.cleanUp();
    deployer.finish();
  });

  it('library not deployed', async function(){
    const migrate = function(){
      deployer.link(IsLibrary, UsesLibrary);
    };

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch( err ) {
      assert(output.includes('Error'));
      assert(output.includes('IsLibrary'));
    }
  });

  it('contract has no bytecode', async function(){
    const migrate = function(){
      deployer.deploy(Abstract);
    }

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Abstract'));
      assert(output.includes('Error'));
      assert(output.includes('interface'));
    }
  });

  it('OOG (no constructor args)', async function(){
    const migrate = function(){
      deployer.deploy(Example, {gas: 10});
    };

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Example'));
      assert(output.includes('value you set'));
      assert(output.includes('Block limit'));
      assert(output.includes('Gas sent'));
      assert(output.includes('10'));
    }
  });

  it('OOG (w/ constructor args)', async function(){
    const migrate = function(){
      deployer.deploy(UsesExample, utils.zeroAddress, {gas: 10});
    };

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('UsesExample'));
      assert(output.includes('value you set'));
      assert(output.includes('Block limit'));
      assert(output.includes('Gas sent'));
      assert(output.includes('10'));
    }
  });

  it('OOG (w/ estimate, hits block limit)', async function(){
    this.timeout(20000);

    const migrate = function(){
      deployer.deploy(Loops);
    };

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Loops'));
      assert(output.includes('out of gas'));
      assert(output.includes('constructor'));
    }
  });

  it('OOG (w/ param, hits block limit)', async function(){
    this.timeout(20000);

    const migrate = function(){
      deployer.deploy(Loops, {gas: 100000});
    };

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Loops'));
      assert(output.includes('out of gas'));
      assert(output.includes('Gas sent'));
      assert(output.includes('Block limit'));
    }
  });

  it('revert', async function(){
    migrate = function(){
      deployer.deploy(ExampleRevert);
    }

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('revert'));
    }
  });

  it('assert', async function(){
    migrate = function(){
      deployer.deploy(ExampleAssert);
    }

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('invalid opcode'));
    }
  });

  it('exceeds block limit', async function(){
    const block = await web3.eth.getBlock('latest');
    const gas = block.gasLimit + 1000;

    migrate = function(){
      deployer.deploy(Example, {gas: gas});
    }

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Example'));
      assert(output.includes('Block limit'));
      assert(output.includes('Gas sent'))
      assert(output.includes('less gas'));
    }
  })

  it('insufficient funds', async function(){
    const emptyAccount = accounts[7]
    let balance = await web3.eth.getBalance(emptyAccount);
    await web3.eth.sendTransaction({
      to: accounts[0],
      from: emptyAccount,
      value: balance,
      gasPrice: 0
    });

    balance = await web3.eth.getBalance(emptyAccount);
    assert(parseInt(balance) === 0);

    migrate = function(){
      deployer.deploy(Example, {from: emptyAccount});
    }

    migrate();

    try {
      await deployer.start();
      assert.fail();
    } catch(err){
      assert(output.includes('Example'));
      assert(output.includes('insufficient funds'));
      assert(output.includes('Account'))
      assert(output.includes('Balance'));
    }
  })
});
