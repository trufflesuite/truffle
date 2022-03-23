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

function artifactsExist(artifacts: Object[]) {
  return Array.isArray(artifacts) && artifacts.length > 0;
}

function SendTransactionForm({
  artifacts = mockArtifacts,
  requests,
  setRequests
}: Props) {
  const { chainId } = useWeb3React<providers.Web3Provider>();
  const [contracts, setContracts] = useState([]);
  const [transactionRequest, setTransactionRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (artifactsExist(artifacts)) {
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
              setTransactionRequest={setTransactionRequest}
              setErrorMessage={setErrorMessage}
            />
          )
        }
        footer={
          <Footer
            requests={requests}
            setRequests={setRequests}
            transactionRequest={transactionRequest}
            errorMessage={errorMessage}
          />
        }
      />
    )
  );
}

function Body({
  contracts,
  chainId,
  setTransactionRequest,
  setErrorMessage
}: {
  contracts: ContractData[];
  chainId: number;
  setTransactionRequest: Function;
  setErrorMessage: Function;
}) {
  const [currentContract, setCurrentContract] = useState(contracts[0]);
  const [contractInstance, setContractInstance] = useState(
    createContractInstance(contracts[0])
  );
  const [contractFunction, setContractFunction] = useState(contracts[0].abi[0]);
  const [functionParams, setFunctionParameters] = useState([""]);

  useEffect(() => {
    setContractInstance(createContractInstance(currentContract));
    createTransactionRequest();
  }, [currentContract, contractFunction, functionParams]);

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
    const contract = contracts.filter(contract => {
      return contract.contractName === contractName;
    })[0];
    setCurrentContract(contract);
    setContractFunction(contract.abi[0]);
    setFunctionParameters([""]);
  }

  function changeABIFunction(e: any) {
    const methodName = e.target.value;

    setContractFunction(
      currentContract.abi.filter((method: any) => {
        return method.name === methodName;
      })[0]
    );
    setFunctionParameters([""]);
  }

  function setFunctionParameter(value: string, index: number) {
    let newParams = [...functionParams];
    newParams[index] = value;

    setFunctionParameters(newParams);
  }

  function validateTransactionRequest() {
    return (
      !contractInstance ||
      !contractFunction ||
      (contractFunction.inputs.length === functionParams.length &&
        functionParams[0] !== "")
    );
  }

  async function createTransactionRequest() {
    setErrorMessage(null);

    if (!validateTransactionRequest()) {
      setTransactionRequest(null);
      return;
    }

    try {
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
      setTransactionRequest(request);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErrorMessage(e.message);
      }
      setTransactionRequest(null);
    }
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
        setFunctionParameters={setFunctionParameter}
      />
    </div>
  );
}

function Footer({
  requests,
  setRequests,
  transactionRequest,
  errorMessage
}: {
  requests: DashboardProviderMessage[];
  setRequests: (
    requests:
      | DashboardProviderMessage[]
      | ((requests: DashboardProviderMessage[]) => DashboardProviderMessage[])
  ) => void;
  transactionRequest: DashboardProviderMessage | null;
  errorMessage: string | null;
}) {
  function sendTransaction() {
    if (!transactionRequest) {
      return;
    }

    const newRequests = [...requests, transactionRequest];

    setRequests(newRequests);
  }

  return (
    <div className="text-center">
      <Button
        onClick={sendTransaction}
        text={"Send Transaction"}
        disabled={!transactionRequest}
      />
      <p className={"text-red-600"}>{errorMessage}</p>
    </div>
  );
}

export default SendTransactionForm;
