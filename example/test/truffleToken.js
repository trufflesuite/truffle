contract('TruffleToken', function(accounts) {
  it("should put 10000 TruffleTokens in the first account", function(done) {
    var truf = TruffleToken.deployed();

    var account_one = accounts[0];
    var _initialAmount = 10000;
    var _tokenName = 'TruffleToken';
    var _decimalUnits = 3;
    var _tokenSynmbol = 'TRF'

    truf.initiateToken(_initialAmount, _tokenName, _decimalUnits, _tokenSynmbol, {from: account_one})

    truf.balanceOf.call(account_one).then(function(balance) {
      assert.equal(balance.valueOf(), 10000, "10000 wasn't in the first account");
    }).then(done).catch(done);
  });
  it("should call a function that depends on a linked library  ", function(done){
    var truf = TruffleToken.deployed();
    var account_one = accounts[0];
    var trufflesBalance;
    var trufflesEthBalance;

    truf.balanceOf.call(account_one).then(function(outCoinBalance){
      trufflesBalance = outCoinBalance.toNumber();
      return truf.getBalanceInEth.call(account_one);
    }).then(function(outCoinBalanceEth){
      trufflesEthBalance = outCoinBalanceEth.toNumber();
      
    }).then(function(){
      assert.equal(trufflesEthBalance,2*trufflesBalance,"Library function returned unexpeced function, linkage may be broken");
      
    }).then(done).catch(done);
  });
  it("should send coin correctly", function(done) {
    var truf = TruffleToken.deployed();

    // Get initial balances of first and second account.
    var account_one = accounts[0];
    var account_two = accounts[1];

    var account_one_starting_balance;
    var account_two_starting_balance;
    var account_one_ending_balance;
    var account_two_ending_balance;

    var _value = 10;

    truf.balanceOf.call(account_one).then(function(balance) {
      account_one_starting_balance = balance.toNumber();
      return truf.balanceOf.call(account_two);
    }).then(function(balance) {
      account_two_starting_balance = balance.toNumber();
      return truf.transfer(account_two, _value, {from: account_one});
    }).then(function() {
      return truf.balanceOf.call(account_one);
    }).then(function(balance) {
      account_one_ending_balance = balance.toNumber();
      return truf.balanceOf.call(account_two);
    }).then(function(balance) {
      account_two_ending_balance = balance.toNumber();

      assert.equal(account_one_ending_balance, account_one_starting_balance - _value, "Amount wasn't correctly taken from the sender");
      assert.equal(account_two_ending_balance, account_two_starting_balance + _value, "Amount wasn't correctly sent to the receiver");
    }).then(done).catch(done);
  });
});
