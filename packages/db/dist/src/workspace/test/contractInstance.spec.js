"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const shims_1 = require("@truffle/workflow-compile/shims");
const network_graphql_1 = require("./network.graphql");
const contractInstance_graphql_1 = require("./contractInstance.graphql");
describe("Contract Instance", () => {
    const wsClient = new utils_1.WorkspaceClient();
    let variables;
    let expectedId;
    let addNetworkResult;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        const address = Object.values(utils_1.Migrations.networks)[0]["address"];
        addNetworkResult = yield wsClient.execute(network_graphql_1.AddNetworks, {
            name: "ganache",
            networkId: Object.keys(utils_1.Migrations.networks)[0],
            height: 1,
            hash: "0xcba0b90a5e65512202091c12a2e3b328f374715b9f1c8f32cb4600c726fe2aa6"
        });
        expectedId = utils_1.generateId({
            address: address,
            network: { id: addNetworkResult.networksAdd.networks[0].id }
        });
        let shimmedBytecode = shims_1.shimBytecode(utils_1.Migrations.bytecode);
        variables = [
            {
                address: address,
                network: {
                    id: addNetworkResult.networksAdd.networks[0].id
                },
                contract: {
                    id: utils_1.generateId({
                        name: utils_1.Migrations.contractName,
                        abi: { json: JSON.stringify(utils_1.Migrations.abi) },
                        processedSource: { index: 0 },
                        compilation: {
                            id: "0x7f91bdeb02ae5fd772f829f41face7250ce9eada560e3e7fa7ed791c40d926bd"
                        }
                    })
                },
                creation: {
                    transactionHash: utils_1.Migrations.networks["5777"].transactionHash,
                    constructor: {
                        createBytecode: {
                            bytecode: {
                                id: utils_1.generateId(shimmedBytecode)
                            }
                        }
                    }
                }
            }
        ];
    }));
    test("can be added", () => __awaiter(void 0, void 0, void 0, function* () {
        const addContractInstancesResult = yield wsClient.execute(contractInstance_graphql_1.AddContractInstances, { contractInstances: variables });
        expect(addContractInstancesResult).toHaveProperty("contractInstancesAdd");
        const { contractInstancesAdd } = addContractInstancesResult;
        expect(contractInstancesAdd).toHaveProperty("contractInstances");
        const { contractInstances } = contractInstancesAdd;
        expect(contractInstances[0]).toHaveProperty("address");
        expect(contractInstances[0]).toHaveProperty("network");
        const { address, network } = contractInstances[0];
        expect(address).toEqual(Object.values(utils_1.Migrations.networks)[0]["address"]);
        expect(network).toHaveProperty("networkId");
        const { networkId } = network;
        expect(networkId).toEqual(Object.keys(utils_1.Migrations.networks)[0]);
    }));
    test("can be queried", () => __awaiter(void 0, void 0, void 0, function* () {
        const getContractInstanceResult = yield wsClient.execute(contractInstance_graphql_1.GetContractInstance, { id: expectedId });
        expect(getContractInstanceResult).toHaveProperty("contractInstance");
        const { contractInstance } = getContractInstanceResult;
        expect(contractInstance).toHaveProperty("address");
        expect(contractInstance).toHaveProperty("network");
        const { address, network } = contractInstance;
        expect(address).toEqual(Object.values(utils_1.Migrations.networks)[0]["address"]);
        const { networkId } = network;
        expect(networkId).toEqual(addNetworkResult.networksAdd.networks[0].networkId);
    }));
    test("can retrieve all contractInstances", () => __awaiter(void 0, void 0, void 0, function* () {
        const getAllContractInstancesResult = yield wsClient.execute(contractInstance_graphql_1.GetAllContractInstances, {});
        expect(getAllContractInstancesResult).toHaveProperty("contractInstances");
        const { contractInstances } = getAllContractInstancesResult;
        expect(contractInstances).toHaveProperty("length");
        const firstContractInstance = contractInstances[0];
        expect(firstContractInstance).toHaveProperty("id");
        expect(firstContractInstance).toHaveProperty("address");
        expect(firstContractInstance).toHaveProperty("network");
        expect(firstContractInstance).toHaveProperty("network.name");
        expect(firstContractInstance).toHaveProperty("network.networkId");
        expect(firstContractInstance).toHaveProperty("contract");
    }));
});
//# sourceMappingURL=contractInstance.spec.js.map