
module.exports = {
  /**
   * @param  {String} e.g. "newHeads"
   * @return {Promise} subscription enabled on resolution
   */
  subscribe: function(contract, topic, id){
    return new Promise((accept, reject) => {
        contract.web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "eth_subscribe",
          params: [topic],
          id: id
        },
        (err, result) => (err) ? reject(err) : accept(result));
    })
  },

  /**
   * @param  {Number} id of subscription to cancel
   * @return {Promise} subscription cancelled on resolution
   */
  unsubscribe: function(contract, id){
    return new Promise((accept, reject) => {
        contract.web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "eth_unsubscribe",
          params: [id],
        },
        (err, result) => (err) ? reject(err) : accept(result));
    })
  }
}