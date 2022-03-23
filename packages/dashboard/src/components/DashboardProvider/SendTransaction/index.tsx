import { useEffect, useState } from "react";
import { useWeb3React } from "@web3-react/core";
import { providers } from "ethers";
import mockArtifacts from "./mockArtifacts.json";
import Card from "../../common/Card";
import Button from "../../common/Button";
import Select from "../../common/Select";
import ContractMethodParams from "../../common/ContractMethodParams";
import { ethers } from "ethers";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus";

interface Props {
  artifacts?: any;
  requests: DashboardProviderMessage[];
  setRequests: (
    requests:
      | DashboardProviderMessage[]
      | ((requests: DashboardProviderMessage[]) => DashboardProviderMessage[])
  ) => void;
}

interface ContractData {
  contractName: string;
  abi: any;
  networks: { [key: number]: { address: string } };
}

function filterByChainId(chainId: any) {
  return (artifact: { networks: { [key: number]: {} } }) => {
    return chainId && artifact.networks[chainId];
  };
}

function getNameNetworksAbi(
  contracts: [ContractData],
  { contractName, abi, networks }: ContractData
) {
  contracts.push({
    contractName,
    abi: abi.filter((abi: { type: string }) => {
      return abi.type === "function";
    }),
    networks
  });
  return contracts;
}

function SendTransaction({
  artifacts = mockArtifacts,
  requests,
  setRequests
}: Props) {
  const { chainId } = useWeb3React<providers.Web3Provider>();
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    if (Array.isArray(artifacts) && artifacts.length > 0) {
      setContracts(
        artifacts
          .filter(filterByChainId(chainId))
          .reduce(getNameNetworksAbi, [])
      );
    }
  }, [artifacts, chainId]);

  return (
    chainId &&
    artifacts && (
      <Card
        header={"Send Transaction"}
        body={
          contracts.length > 0 && (
            <Body
              contracts={contracts}
              chainId={chainId}
              requests={requests}
              setRequests={setRequests}
            />
          )
        }
        footer={<Footer />}
      />
    )
  );
}

function Body({
  contracts,
  chainId,
  requests,
  setRequests
}: {
  contracts: ContractData[];
  chainId: number;
  requests: DashboardProviderMessage[];
  setRequests: (
    requests:
      | DashboardProviderMessage[]
      | ((requests: DashboardProviderMessage[]) => DashboardProviderMessage[])
  ) => void;
}) {
  const [currentContract, setCurrentContract] = useState(contracts[0]);
  const [contractInstance, setContractInstance] = useState(
    createContractInstance(contracts[0])
  );
  const [contractFunction, setContractFunction] = useState(contracts[0].abi[0]);
  const [functionParams, setFunctionParams] = useState([""]);

  useEffect(() => {
    setContractInstance(createContractInstance(currentContract));
  }, [currentContract]);

  const contractNames = contracts.reduce(
    (contractNames: string[], contract) => {
      contractNames.push(contract.contractName);
      return contractNames;
    },
    []
  );

  const contractAbiNames = currentContract.abi.map((method: any) => {
    return method.name;
  });

  function createContractInstance(contract: ContractData) {
    return new ethers.Contract(
      contract.networks[chainId].address,
      contract.abi,
      new ethers.providers.Web3Provider(
        // @ts-ignore lol
        window.ethereum
      ).getSigner()
    );
  }

  function changeContract(e: any) {
    const contractName = e.target.value;
    setCurrentContract(
      contracts.filter(contract => {
        return contract.contractName === contractName;
      })[0]
    );
  }
  function changeABIFunction(e: any) {
    const methodName = e.target.value;

    setContractFunction(
      currentContract.abi.filter((method: any) => {
        return method.name === methodName;
      })[0]
    );
  }

  async function sendTransaction() {
    const { data, to, from } = await contractInstance.populateTransaction[
      contractFunction.name
    ](...functionParams);

    const request: DashboardProviderMessage = {
      id: 0,
      type: "provider",
      payload: {
        jsonrpc: "2.0",
        method: "eth_sendTransaction",
        params: [{ data, to, from }],
        id: 1
      }
    };

    const newRequests = [...requests, request];
    setRequests(newRequests);
  }

  function setFunctionParameters(value: string, index: number) {
    let newParams = [...functionParams];

    newParams[index] = value;

    setFunctionParams(newParams);
  }

  return (
    <div className="grid grid-cols-1 gap-6  ">
      <Select
        label={"Contracts"}
        options={contractNames}
        onChange={changeContract}
      />
      <Select
        label={"Contract Methods"}
        options={contractAbiNames}
        onChange={changeABIFunction}
      />
      <ContractMethodParams
        parameters={contractFunction.inputs}
        functionParams={functionParams}
        setFunctionParameters={setFunctionParameters}
      />
      <Button onClick={sendTransaction} text={"Send Transaction"} />
    </div>
  );
}

function Footer() {
  return (
    <div className="text-center">
      <Button onClick={() => {}} text={"Send Transaction"} />
    </div>
  );
}

export default SendTransaction;
