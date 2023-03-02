import { forTx } from "@truffle/debugger";
import { provider } from "ganache";
import * as Codec from "@truffle/codec";
import type { Session, Source } from "src/utils/debugger";
import type { Compilation } from "@truffle/compile-common";
import { getTransactionSourcesBeforeStarting } from "@truffle/debug-utils";

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
