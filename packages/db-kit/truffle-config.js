const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonic = "decide dwarf critic orphan crime sock cricket federal strong history exhibit flip charge balcony select";

module.exports = {
   db: {
     enabled: true,
     saveLocally: true,       
   },
   networks: {
       mainnet: {
         provider: function() {
           return new HDWalletProvider(mnemonic, "https://mainnet.infura.io/v3/8567fe8ead044ec0920c8441dce83afa");
         },
         network_id: 1
       }
     },
   compilers: {
     solc: {
       version: "^0.8.0"
     }
   }
 };
