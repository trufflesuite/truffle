import { forTx } from "@truffle/debugger";
import { provider } from "ganache";
import * as Codec from "@truffle/codec";
import type { Session, Source } from "src/utils/debugger";
import { SessionStatus } from "src/utils/debugger";
import type { Compilation } from "@truffle/compile-common";
import { getTransactionSourcesBeforeStarting } from "@truffle/debug-utils";

export async function initDebugger({
  operations,
  setUnknownAddresses,
  setStatus
}: any) {
  const compilations = await operations.getCompilations();
  const testTxHash =
    // "0xf5ad7387297428dd152997aab72c190954bcce692daf022bb63ab9aa5f199c33"; // cross contract goerli text tx hash (link verified)
    // "0xfb09532437064597ac2a07f62440dd45e3806d6299e4fc86da6231ab2856f021"; // cross contract goerli test tx hash (dai unverified)
    // "0x8d093f67b6501ff576f259a683ac3ac0a0adb3280b66e272ebbaf691242d99b1";
    "0xdadd2f626c81322ec8a2a20dec71c780f630ef1fab7393c675a8843365477389"; //goerli tx
  // "0x2650974eb6390dc787df16ab86308822855f907e7463107248cfd5e424923176"
  // "0xab2cba8e3e57a173a125d3f77a9a0a485809b8a7098b540a13593631909ccf00"; //dai tx
  const provider = window.ethereum;
  if (!provider) {
    throw new Error(
      "There was no provider found in the browser. Ensure you have " +
        "MetaMask connected to the current page."
    );
  }
  const { session, sources, unknownAddresses } = await setupSession(
    testTxHash,
    provider,
    compilations,
    {
      onInit: () => setStatus(SessionStatus.Initializing),
      onFetch: () => setStatus(SessionStatus.Fetching),
      onStart: () => setStatus(SessionStatus.Starting),
      onReady: () => setStatus(SessionStatus.Ready)
    }
  );
  if (unknownAddresses.length > 0) {
    setUnknownAddresses(unknownAddresses);
  }
  operations.setDebuggerSessionData({ sources, session });
}

export async function setupSession(
  transactionHash: string,
  providedProvider: any,
  compilations: Compilation[],
  callbacks?: {
    onInit?: () => void;
    onFetch?: () => void;
    onStart?: () => void;
    onReady?: () => void;
  }
): Promise<{
  session: Session;
  sources: Source[];
  unknownAddresses: string[];
}> {
  callbacks?.onInit?.();
  const { session, sources, networkId, unrecognizedAddresses } =
    await createSession(transactionHash, providedProvider, compilations);

  callbacks?.onFetch?.();
  const { unknownAddresses } = await fetchCompilationsAndAddToSession(
    session,
    networkId,
    unrecognizedAddresses
  );

  callbacks?.onStart?.();
  await session.startFullMode();

  const $ = session.selectors;
  // @ts-ignore
  window.dollar = $;
  // @ts-ignore
  window.bugger = session;
  callbacks?.onReady?.();
  return { session, sources, unknownAddresses };
}

async function createSession(
  transactionHash: string,
  providedProvider: any,
  compilations: Compilation[]
): Promise<{
  session: Session;
  sources: Source[];
  networkId: string;
  unrecognizedAddresses: string[];
}> {
  let bugger;
  try {
    bugger = await forTx(transactionHash, {
      provider: provider({ fork: { provider: providedProvider } }),
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
        `to. Please ensure you are on the appropriate network for ` +
        `transaction hash ${transactionHash}.`
    );
  }

  const $ = bugger.selectors;
  const affectedInstances: { [address: string]: any } = bugger.view(
    $.session.info.affectedInstances
  );
  const networkId = await providedProvider.request({
    method: "net_version",
    params: []
  });

  let unrecognizedAddresses: string[] = [];
  for (const [address, value] of Object.entries(affectedInstances)) {
    if (value.contractName === undefined) {
      unrecognizedAddresses.push(address);
    }
  }
  if (unrecognizedAddresses.length > 0 && networkId) {
    await fetchCompilationsAndAddToSession(
      bugger,
      networkId,
      unrecognizedAddresses
    );
  }
  const sources = await getTransactionSourcesBeforeStarting(bugger);
  // we need to transform these into the format dashboard uses
  const transformedSources = Object.values(sources).flatMap(
    ({ id, sourcePath, source: contents, language }: any) =>
      language === "Solidity" ? [{ id, sourcePath, contents, language }] : []
  );
  return {
    sources: transformedSources,
    session: bugger,
    networkId,
    unrecognizedAddresses
  };
}

async function fetchCompilationsAndAddToSession(
  session: Session,
  networkId: string,
  addresses: string[]
): Promise<{ unknownAddresses: string[] }> {
  const host = window.location.hostname;
  const port =
    process.env.NODE_ENV === "development" ? 24012 : window.location.port;
  const fetchAndCompileEndpoint = `http://${host}:${port}/fetch-and-compile`;

  let unknownAddresses = [];
  for (const address of addresses) {
    const fetchResult = await fetch(
      `${fetchAndCompileEndpoint}?address=${address}&networkId=${networkId}`
    );
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
