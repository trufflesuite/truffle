module.exports = {
  networks: {
    funTimeNetwork: {
      host: "127.0.0.1",
      port: 5555,
      network_id: "*",
      confirmations: 2
    },
    crazyTimeNetwork: {
      network_id: "*",
      confirmations: 2,
      provider: () => "http://localhost:5555"
    },
    dashboard: {
      network_id: "*",
      confirmations: 2
    }
  }
};
