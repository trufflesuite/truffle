var accounts;
var account = _owner;
var balance;
accounts[1] = _to;

function setStatus(message) {
  var status = document.getElementById("status");
  status.innerHTML = message;
};

function initiateToken() {
  var truf = TruffleToken.deployed();

  var _initialAmount = 10000;
  var _tokenName = 'Truffle Token';
  var _decimalUnits = 2;
  var _tokenSymbol = 'TRFT';

  truf.initiateToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol {from: account})
}

function refreshBalance() {
  var truf = TruffleToken.deployed();

  truf.balanceOf.call(account, {from: account}).then(function(value) {
    var balance_element = document.getElementById("balance");
    balance_element.innerHTML = value.valueOf();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error getting balance; see log.");
  });
};

function transfer() {
  var truf = TruffleToken.deployed();

  var _value = parseInt(document.getElementById("_value").value);
  var _to = document.getElementById("_to").value;

  setStatus("Initiating transaction... (please wait)");

  truf.transfer(_to, _value, {from: account}).then(function() {
    setStatus("Transaction complete!");
    refreshBalance();
  }).catch(function(e) {
    console.log(e);
    setStatus("Error sending coin; see log.");
  });
};

window.onload = function() {
  web3.eth.getAccounts(function(err, accs) {
    if (err != null) {
      alert("There was an error fetching your accounts.");
      return;
    }

    if (accs.length == 0) {
      alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
      return;
    }

    accounts = accs;
    _owner = accounts[0];

    refreshBalance();
  });
}
