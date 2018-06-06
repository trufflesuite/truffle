const ganache = require("ganache-cli");
const contract = require("truffle-contract");
const Web3 = require("web3");
const assert = require("assert");

const Deployer = require("../index");
const Reporter = require("./helpers/reporter")
const utils = require('./helpers/utils');

describe("Deployer (sync)", function() {
  let owner
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
    const accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    await utils.compile();

    Example =       utils.getContract('Example', provider, networkId, owner);
    ExampleRevert = utils.getContract('ExampleRevert', provider, networkId, owner);
    UsesExample =   utils.getContract('UsesExample', provider, networkId, owner);
    UsesLibrary =   utils.getContract('UsesLibrary', provider, networkId, owner);
    IsLibrary =     utils.getContract('IsLibrary', provider, networkId, owner);
    Abstract =      utils.getContract('Abstract', provider, networkId, owner);

    options = {
      contracts: [ Example, ExampleRevert, UsesExample, IsLibrary, UsesLibrary, Abstract ],
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
    deployer.finish()
  });

  it("deploy()", async function() {
    const migrate = function(){
      deployer.deploy(Example);
    };

    migrate();

    await deployer.start();

    assert(Example.address !== null);
    assert(Example.transactionHash !== null);

    const example = await Example.deployed();
    const id = await example.id();

    assert(id === 'Example' );

    assert(output.includes('Example'));
    assert(output.includes('Deploying'));
    assert(output.includes('transaction hash'));
    assert(output.includes('address'));
    assert(output.includes('gas usage'));
  });

  it('deploy().then', async function(){
    function migrate(){
      deployer
        .deploy(Example)
        .then(() => deployer.deploy(UsesExample, Example.address));
    };

    migrate();
    await deployer.start();

    const example =       await Example.deployed();
    const usesExample =   await UsesExample.deployed();
    const exampleId =     await example.id();
    const usesExampleId = await usesExample.id();
    const other =         await usesExample.other();

    assert(Example.address !== null);
    assert(exampleId === 'Example' );
    assert(usesExampleId === 'UsesExample' );
    assert(other === Example.address);

    assert(output.includes('Replacing'))
    assert(output.includes('Deploying'));
    assert(output.includes('Example'));
    assert(output.includes('UsesExample'));
  });

  it('deploy([contract, [contract, args], ...])', async function(){
    const deployArgs = [Example, [UsesExample, utils.zeroAddress]]

    function migrate(){
      deployer.deploy(deployArgs);
    };

    migrate();
    await deployer.start();

    const example =       await Example.deployed();
    const usesExample =   await UsesExample.deployed();
    const exampleId =     await example.id();
    const usesExampleId = await usesExample.id();
    const other =         await usesExample.other();

    assert(Example.address !== null);
    assert(exampleId === 'Example' );
    assert(usesExampleId === 'UsesExample' );
    assert(other === utils.zeroAddress);

    assert(output.includes('Deploying Batch'))
    assert(output.includes('Example'));
    assert(output.includes('UsesExample'));
  });

  it('deployer.then', async function(){
    function migrate(){
      deployer.then(async function(){
        const example = await deployer.deploy(Example);
        await deployer.deploy(UsesExample, example.address);
      })
    };

    migrate();
    await deployer.start();

    const example =       await Example.deployed();
    const usesExample =   await UsesExample.deployed();
    const exampleId =     await example.id();
    const usesExampleId = await usesExample.id();
    const other =         await usesExample.other();

    assert(Example.address !== null);
    assert(exampleId === 'Example' );
    assert(usesExampleId === 'UsesExample' );
    assert(other === Example.address);

    assert(output.includes('Replacing'))
    assert(output.includes('Example'));
    assert(output.includes('UsesExample'));
  });

  it('deployer.link', async function(){
    const migrate = function(){
      deployer.deploy(IsLibrary);
      deployer.link(IsLibrary, UsesLibrary);
      deployer.deploy(UsesLibrary);
    };

    migrate();

    await deployer.start();

    assert(UsesLibrary.address !== null);
    assert(IsLibrary.address !== null);

    const usesLibrary = await UsesLibrary.deployed();
    await usesLibrary.fireIsLibraryEvent(5);
    await usesLibrary.fireUsesLibraryEvent(7);

    eventOptions = {fromBlock: 0, toBlock: 'latest'};
    const events = await usesLibrary.getPastEvents("allEvents", eventOptions);

    assert(events[0].args.eventID === '5');
    assert(events[1].args.eventID === '7');

    assert(output.includes('Deploying'));
    assert(output.includes('Linking'));
    assert(output.includes('IsLibrary'));
    assert(output.includes('UsesLibrary'));
  });

  it('waits for confirmations', async function(){
    this.timeout(5000);
    const startBlock = await web3.eth.getBlockNumber();

    utils.startAutoMine(web3, 500);

    const migrate = function(){
      deployer.deploy(IsLibrary);
      deployer.deploy(Example);
    };

    migrate();

    deployer.confirmationsRequired = 2;
    await deployer.start();

    utils.stopAutoMine();

    const isLibrary = await IsLibrary.deployed();
    const example = await Example.deployed();

    const libReceipt = await web3.eth.getTransactionReceipt(IsLibrary.transactionHash);
    const exampleReceipt = await web3.eth.getTransactionReceipt(Example.transactionHash);

    // The first confirmation is the block that accepts the tx. Then we wait two more.
    // Then Example is deployed in the consequent block.
    assert(libReceipt.blockNumber === startBlock + 1);
    assert(exampleReceipt.blockNumber === (libReceipt.blockNumber + 3))

    deployer.confirmationsRequired = 0;
  });
});
