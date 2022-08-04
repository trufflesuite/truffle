module.exports = {
  networks: {
    funTimeNetwork: {
      host: "127.0.0.1",
      port: 5555,
      network_id: "*",
      confirmations: 2,
      customUserProperty: "Fun time"
    },
    crazyTimeNetwork: {
      network_id: "*",
      provider: () => "http://localhost:5555",
      confirmations: 2,
      customUserProperty: "Crazy time"
    },
    dashboard: {
      network_id: "*",
      confirmations: 2,
      customUserProperty: "Dashboard time"
    }
  }
};
