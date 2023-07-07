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
  etherscanApiKey,
  setLoggingOutput
}: any) {
  const { method, params } = tx.message.payload;
  const ganacheOptions = {
    fork: {
      provider: window.ethereum as any
    },
    wallet: {
      unlockedAccounts: [params[0].from]
    },
    logging: {
      logger: {
        log: (message: string) => {
          setLoggingOutput(message);
        }
      }
    }
  };

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
    fetchingOptions: {
      etherscanApiKey,
      networkId
    },
    operations,
    setStatus,
    txHash: result
  });
}

export async function initDebugger({
  ganacheOptions,
  operations,
  setStatus,
  txHash,
  fetchingOptions
}: any) {
  const compilations = await operations.getCompilations();

  const { session, sources, unknownAddresses } = await setupSession({
    handleCompilations: operations.handleCompilations,
    ganacheOptions,
    fetchingOptions,
    txHash,
    compilations,
    callbacks: {
      onInit: () => setStatus(SessionStatus.Initializing),
      onFetch: () => setStatus(SessionStatus.Fetching),
      onStart: () => setStatus(SessionStatus.Starting),
      onReady: () => setStatus(SessionStatus.Ready)
    }
  });
  operations.setDebuggerSessionData({ sources, unknownAddresses, session });
}

type FetchingOptions = {
  etherscanApiKey?: string;
  networkId: string;
};

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
  handleCompilations: (
    compilations: Compilation[],
    hashes?: string[]
  ) => Promise<void>;
  fetchingOptions: FetchingOptions;
};

export async function setupSession({
  txHash,
  ganacheOptions,
  compilations,
  callbacks,
  fetchingOptions,
  handleCompilations
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
    fetchingOptions,
    handleCompilations
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
  fetchingOptions: FetchingOptions;
  handleCompilations: (
    compilations: Compilation[],
    hashes?: string[]
  ) => Promise<void>;
};

async function createSession({
  txHash,
  compilations,
  ganacheOptions,
  fetchingOptions,
  handleCompilations
}: CreateSessionArgs): Promise<{
  session: Session;
  sources: Source[];
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
    if (value.contractName === undefined && value.binary !== "0x") {
      unrecognizedAddresses.push(address);
    }
  }
  if (unrecognizedAddresses.length > 0) {
    const { networkId, etherscanApiKey } = fetchingOptions;
    await fetchCompilationsAndAddToSession({
      session,
      networkId,
      addresses: unrecognizedAddresses,
      etherscanApiKey,
      handleCompilations
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
    unrecognizedAddresses
  };
}

type FetchCompilationsAndAddToSessionArgs = {
  session: Session;
  networkId: string;
  addresses: string[];
  etherscanApiKey?: string;
  handleCompilations: (
    compilations: Compilation[],
    hashes?: string[]
  ) => Promise<void>;
};

async function fetchCompilationsAndAddToSession({
  session,
  networkId,
  addresses,
  etherscanApiKey,
  handleCompilations
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
    if (!fetchResult.ok) {
      throw new Error(
        `There was an error fetching the source material for ${address}. ` +
          `Check the Truffle Dashboard server logging for more information.`
      );
    }
    const { compilations, hashes } = await fetchResult.json();
    if (compilations.length === 0) {
      unknownAddresses.push(address);
      continue;
    }

    await handleCompilations(compilations, hashes);
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(Etherscan)`
    );

    await session.addExternalCompilations(shimmedCompilations);
  }
  return { unknownAddresses };
}
