import { forTx } from "@truffle/debugger";
import { provider as ganacheProvider } from "ganache";
import * as Codec from "@truffle/codec";
import type { Session, Source } from "src/components/composed/Debugger/utils";
import { SessionStatus } from "src/components/composed/Debugger/utils";
import type { Compilation } from "@truffle/compile-common";
import { getTransactionSourcesBeforeStarting } from "@truffle/debug-utils";

export async function forkNetworkWithTxAndInitDebugger({
  tx,
  operations,
  setStatus,
  etherscanApiKey
}: any) {
  const { method, params } = tx.message.payload;
  const ganacheOptions = {
    fork: {
      // @ts-ignore
      provider: window.ethereum
    },
    wallet: {
      unlockedAccounts: [params[0].from]
    }
  };
  // @ts-ignore
  const forkedProvider = ganacheProvider(ganacheOptions);
  const networkId = await forkedProvider.request({
    method: "net_version",
    params: []
  });

  const result = await forkedProvider.request({ method, params });
  return initDebugger({
    ganacheOptions: {
      ...ganacheOptions,
      fork: {
        provider: forkedProvider
      }
    },
    operations,
    setStatus,
    txHash: result,
    etherscanApiKey,
    networkId
  });
}

export async function initDebugger({
  ganacheOptions,
  operations,
  setStatus,
  txHash,
  etherscanApiKey,
  networkId
}: any) {
  const compilations = await operations.getCompilations();
  const testTxHash = txHash
    ? txHash
    : // : "0xf5ad7387297428dd152997aab72c190954bcce692daf022bb63ab9aa5f199c33"; // cross contract goerli text tx hash (link verified)
      "0x667c69bc27c0e26cf1133b954bdccd2648afcae34dbebfbf5c45e4b62a32e422"; // local MetaCoin deployment
  // "0xfb09532437064597ac2a07f62440dd45e3806d6299e4fc86da6231ab2856f021"; // cross contract goerli test tx hash (dai unverified)
  // "0x8d093f67b6501ff576f259a683ac3ac0a0adb3280b66e272ebbaf691242d99b1";
  // "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389"; //goerli tx
  // "0x2650974eb6390dc787df16ab86308822855f907e7463107248cfd5e424923176"
  // "0xab2cba8e3e57a173a125d3f77a9a0a485809b8a7098b540a13593631909ccf00"; //dai tx

  const { session, sources, unknownAddresses } = await setupSession({
    ganacheOptions,
    txHash: testTxHash,
    compilations,
    callbacks: {
      onInit: () => setStatus(SessionStatus.Initializing),
      onFetch: () => setStatus(SessionStatus.Fetching),
      onStart: () => setStatus(SessionStatus.Starting),
      onReady: () => setStatus(SessionStatus.Ready)
    },
    etherscanApiKey,
    networkId
  });
  operations.setDebuggerSessionData({ sources, unknownAddresses, session });
}

type SetupSessionArgs = {
  txHash: string;
  compilations: Compilation[];
  ganacheOptions: any;
  callbacks?: {
    onInit?: () => void;
    onFetch?: () => void;
    onStart?: () => void;
    onReady?: () => void;
  };
  etherscanApiKey: string;
  networkId: string;
};

export async function setupSession({
  txHash,
  ganacheOptions,
  compilations,
  callbacks,
  etherscanApiKey,
  networkId
}: SetupSessionArgs): Promise<{
  session: Session;
  sources: Source[];
  unknownAddresses: string[];
}> {
  callbacks?.onInit?.();
  const { session, sources, unrecognizedAddresses } = await createSession({
    txHash,
    ganacheOptions,
    compilations,
    etherscanApiKey,
    networkId
  });

  callbacks?.onFetch?.();
  callbacks?.onStart?.();
  await session.startFullMode();

  callbacks?.onReady?.();

  return { session, sources, unknownAddresses: unrecognizedAddresses };
}

type CreateSessionArgs = {
  txHash: string;
  compilations: Compilation[];
  ganacheOptions: any;
  etherscanApiKey?: string;
  networkId: string;
};

async function createSession({
  txHash,
  compilations,
  ganacheOptions,
  etherscanApiKey,
  networkId
}: CreateSessionArgs): Promise<{
  session: Session;
  sources: Source[];
  networkId: string;
  unrecognizedAddresses: string[];
}> {
  let session;
  try {
    session = await forTx(txHash, {
      provider: ganacheProvider(ganacheOptions),
      compilations: Codec.Compilations.Utils.shimCompilations(compilations),
      lightMode: true
    });
  } catch (error) {
    // @ts-ignore
    if (!error.message.includes("Unknown transaction")) {
      throw error;
    }
    throw new Error(
      `The transaction hash isn't recognized on the network you are connected` +
        ` to. Please ensure you are on the appropriate network for ` +
        `transaction hash ${txHash}.`
    );
  }

  const $ = session.selectors;
  const affectedInstances: { [address: string]: any } = session.view(
    $.session.info.affectedInstances
  );

  let unrecognizedAddresses: string[] = [];
  for (const [address, value] of Object.entries(affectedInstances)) {
    if (value.contractName === undefined) {
      unrecognizedAddresses.push(address);
    }
  }
  if (unrecognizedAddresses.length > 0 && networkId) {
    await fetchCompilationsAndAddToSession({
      session,
      networkId,
      addresses: unrecognizedAddresses,
      etherscanApiKey
    });
  }
  const sources = await getTransactionSourcesBeforeStarting(session);
  // we need to transform these into the format dashboard uses
  const transformedSources = Object.values(sources).flatMap(
    ({ id, sourcePath, source: contents, language }: any) =>
      language === "Solidity" ? [{ id, sourcePath, contents, language }] : []
  );
  return {
    sources: transformedSources,
    session,
    networkId,
    unrecognizedAddresses
  };
}

type FetchCompilationsAndAddToSessionArgs = {
  session: Session;
  networkId: string;
  addresses: string[];
  etherscanApiKey?: string;
};

async function fetchCompilationsAndAddToSession({
  session,
  networkId,
  addresses,
  etherscanApiKey
}: FetchCompilationsAndAddToSessionArgs): Promise<{
  unknownAddresses: string[];
}> {
  const host = window.location.hostname;
  const port =
    process.env.NODE_ENV === "development" ? 24012 : window.location.port;
  const fetchAndCompileEndpoint = `http://${host}:${port}/fetch-and-compile`;

  let unknownAddresses = [];
  for (const address of addresses) {
    let url = `${fetchAndCompileEndpoint}?address=${address}&networkId=${networkId}`;
    if (etherscanApiKey) {
      url = url + `&etherscanApiKey=${etherscanApiKey}`;
    }
    const fetchResult = await fetch(url);
    const { compilations } = await fetchResult.json();
    if (compilations.length === 0) {
      unknownAddresses.push(address);
      continue;
    }
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(Etherscan)`
    );

    await session.addExternalCompilations(shimmedCompilations);
  }
  return { unknownAddresses };
}
