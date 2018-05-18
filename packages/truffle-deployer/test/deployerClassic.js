const ganache = require("ganache-cli");
const contract = require("truffle-contract");
const Web3 = require("web3");
const assert = require("assert");

const Deployer = require("../index");
const utils = require('./utils');

describe("deployer (classic)", function() {
  let owner
  let options;
  let networkId;
  const provider = ganache.provider();
  const web3 = new Web3(provider);

  beforeEach(async function() {
    networkId = await web3.eth.net.getId();
    const accounts = await web3.eth.getAccounts();

    owner = accounts[0];
    options = {
      contracts: null,
      network: 'test',
      network_id: networkId,
      provider: provider
    }

    await utils.compile();
  });

  afterEach(() => utils.cleanUp());

  describe('sync', function(){

    it("deploy()", async function() {
      const Example = utils.getContract('Example', provider, networkId, owner);
      options.contracts = [ Example ];

      const deployer = new Deployer(options);

      const migrate = function(){
        deployer.deploy(Example);
      };

      migrate();

      await deployer.start();

      assert(Example.address !== null);
      assert(Example.transactionHash !== null);

      example = await Example.deployed();
      assert(await example.id() === 'Example' );
    });

    it('deploy().then', async function(){
      const Example = utils.getContract('Example', provider, networkId, owner);
      const UsesExample = utils.getContract('UsesExample', provider, networkId, owner);

      options.contracts = [ Example, UsesExample ];

      const deployer = new Deployer(options);

      const migrate = function(){
        deployer.deploy(Example).then(function() {
          return deployer.deploy(UsesExample, Example.address);
        });
      };

      migrate();
      await deployer.start();

      const example = await Example.deployed();
      const usesExample = await UsesExample.deployed();

      assert(Example.address !== null);

      assert(await example.id() === 'Example' );
      assert(await usesExample.id() === 'UsesExample' );

      assert(await usesExample.other() === Example.address);
    });

    it('deployer.then', async function(){
      const Example = utils.getContract('Example', provider, networkId, owner);
      const UsesExample = utils.getContract('UsesExample', provider, networkId, owner);

      options.contracts = [ Example, UsesExample ];

      const deployer = new Deployer(options);

      const migrate = function(){
        deployer.then(async function(){
          const example = await deployer.deploy(Example);
          await deployer.deploy(UsesExample, example.address);
        })
      };

      migrate();
      await deployer.start();

      const example = await Example.deployed();
      const usesExample = await UsesExample.deployed();

      assert(Example.address !== null);

      assert(await example.id() === 'Example' );
      assert(await usesExample.id() === 'UsesExample' );
      assert(await usesExample.other() === Example.address);
    });

    it('deployer.link', async function(){
      const UsesLibrary = utils.getContract('UsesLibrary', provider, networkId, owner);
      const IsLibrary = utils.getContract('IsLibrary', provider, networkId, owner);
      options.contracts = [ UsesLibrary, IsLibrary ];

      const deployer = new Deployer(options);

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
    });
  });
});
