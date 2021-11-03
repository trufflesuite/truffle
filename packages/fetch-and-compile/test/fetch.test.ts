import assert from "assert";
import { describe, it } from "mocha";
import Config from "@truffle/config";
import { fetchAndCompile } from "../lib/index";
  describe("fetches contract on mainnet and checks for verification",  () => {
    const config = Config.default().merge({
        networks: {
          mainnet: {
            url: 'https://mainnet.infura.io/v3/',
            network_id: 1
          }
        }, ​
        network: "mainnet",   ​
        // etherscan: {
        //   apiKey: process.env.ETHERSCAN_KEY
        // }
      });
      it('resolves with verified contract', () => {
        return fetchAndCompile('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',config).then(result => {
          let contractName = result.sourceInfo.contractName
          console.log(contractName)
          assert.notEqual(contractName, undefined)
        })
      })
    });
    describe("fetches contract on arbitrum and checks for verification",  () => {
      const config = Config.default().merge({
          networks: {
            arbitrum: {
              url: 'https://arbitrum-mainnet.infura.io/v3/',
              network_id: 42161
            }
          }, ​
          network: "arbitrum",   ​
          // etherscan: {
          //   apiKey: process.env.ETHERSCAN_KEY
          // }
        });
        it('resolves with verified contract', () => {
          return fetchAndCompile('0xBf00759D7E329d7A7fa1D4DCdC914C53d1d2db86',config).then(result => {
            let contractName = result.sourceInfo.contractName
            console.log(contractName)
            assert.notEqual(contractName, undefined)
          })
        })
      });
      describe("fetches contract on polygon and checks for verification",  () => {
        const config = Config.default().merge({
            networks: {
              polygon: {
                url: 'https://polygon-mainnet.infura.io/v3/',
                network_id: 137
              }
            }, ​
            network: "polygon",   ​
            etherscan: {
              apiKey: ''
            }
          });
          it('resolves with verified contract', () => {
            return fetchAndCompile('0xBB6828C8228E5C641Eb6d89Ca22e09E6311CA398',config).then(result => {
              let contractName = result.sourceInfo.contractName
              console.log(contractName)
              assert.notEqual(contractName, undefined)
            })
          })
        });