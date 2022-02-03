const fs = require("fs");
const jsonToDot = require("json-to-dot");

const networkModelJSON = require("./networkModelJSON.json");

const networks = networkModelJSON.byDescendantIndexThenHeight;

function networksWithoutForks() {
  const networkMap = networks.map((network, networkIndex) => {
    return network.map(block => {
      return {
        name: `${block.name}-${networkIndex}-${block.networkId}-${block.historicBlock.height}-${block.historicBlock.hash}`
      };
    });
  });
  let dotFormatted = {};
  networkMap.forEach(network => {
    network.forEach((node, blockIndex) => {
      if (network[blockIndex + 1]) {
        dotFormatted[node.name] = [network[blockIndex + 1].name];
      } else {
        dotFormatted[node.name] = [node.name];
      }
    });
  }, {});
  return dotFormatted;
}
function _networksWithForks() {
  const networkMap = networks.map(network => {
    return network.map(block => {
      return {
        name: `${block.name}-${block.networkId}-${block.historicBlock.height}-${block.historicBlock.hash}`
      };
    });
  });
  let dotFormatted = {};
  networkMap.forEach(network => {
    network.forEach((node, blockIndex) => {
      if (network[blockIndex + 1]) {
        Array.isArray(dotFormatted[node.name])
          ? dotFormatted[node.name].push(network[blockIndex + 1].name)
          : (dotFormatted[node.name] = [network[blockIndex + 1].name]);
      } else {
        dotFormatted[node.name] = [node.name];
      }
    });
  }, {});
  return dotFormatted;
}

fs.writeFileSync("networkModel.dot", jsonToDot(networksWithoutForks()));
