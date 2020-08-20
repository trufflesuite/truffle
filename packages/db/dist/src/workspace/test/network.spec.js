"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const network_graphql_1 = require("./network.graphql");
describe("Network", () => {
  const wsClient = new utils_1.WorkspaceClient();
  const expectedHash =
    "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6";
  const expectedId = utils_1.generateId({
    networkId: Object.keys(utils_1.Migrations.networks)[0],
    historicBlock: {
      height: 1,
      hash: expectedHash
    }
  });
  const variables = {
    name: "ganache",
    networkId: Object.keys(utils_1.Migrations.networks)[0],
    height: 1,
    hash: expectedHash
  };
  let addNetworksResult;
  beforeEach(() =>
    __awaiter(void 0, void 0, void 0, function* () {
      addNetworksResult = yield wsClient.execute(
        network_graphql_1.AddNetworks,
        {
          name: "ganache",
          networkId: variables.networkId,
          height: variables.height,
          hash: variables.hash
        }
      );
    })
  );
  test("can be added", () => {
    expect(addNetworksResult).toHaveProperty("networksAdd");
    const { networksAdd } = addNetworksResult;
    expect(networksAdd).toHaveProperty("networks");
    const { networks } = networksAdd;
    expect(networks).toHaveLength(1);
    const network = networks[0];
    expect(network).toHaveProperty("id");
    const { id } = network;
    expect(id).toEqual(expectedId);
  });
  test("can be queried", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const getNetworkResult = yield wsClient.execute(
        network_graphql_1.GetNetwork,
        {
          id: expectedId
        }
      );
      expect(getNetworkResult).toHaveProperty("network");
      const { network } = getNetworkResult;
      expect(network).toHaveProperty("id");
      expect(network).toHaveProperty("networkId");
      const { id, networkId } = network;
      expect(id).toEqual(expectedId);
      expect(networkId).toEqual(variables.networkId);
    }));
  test("can retrieve all networks", () =>
    __awaiter(void 0, void 0, void 0, function* () {
      const getAllNetworksResult = yield wsClient.execute(
        network_graphql_1.GetAllNetworks,
        {}
      );
      expect(getAllNetworksResult).toHaveProperty("networks");
      const { networks } = getAllNetworksResult;
      expect(Array.isArray(networks)).toBeTruthy;
      const network = networks[0];
      expect(network).toHaveProperty("networkId");
      const { id, networkId } = network;
      expect(id).toEqual(expectedId);
      expect(networkId).toEqual(variables.networkId);
    }));
});
//# sourceMappingURL=network.spec.js.map
