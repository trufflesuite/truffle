import { forTx, selectors as $ } from "@truffle/debugger";
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
): Promise<{ session: Session; sources: Source[] }> {
  callbacks?.onInit?.();
  const { session, sources, networkId, unknownAddresses } = await createSession(
    transactionHash,
    providedProvider,
    compilations
  );

  callbacks?.onFetch?.();
  await fetchCompilationsAndAddToSession(session, networkId, unknownAddresses);

  callbacks?.onStart?.();
  await session.startFullMode();

  callbacks?.onReady?.();
  return { session, sources };
}

async function createSession(
  transactionHash: string,
  providedProvider: any,
  compilations: Compilation[]
): Promise<{
  session: Session;
  sources: Source[];
  networkId: string;
  unknownAddresses: string[];
}> {
  const bugger = await forTx(transactionHash, {
    provider: provider({ fork: { provider: providedProvider } }),
    compilations: Codec.Compilations.Utils.shimCompilations(compilations),
    lightMode: true
  });
  const affectedInstances: { [address: string]: any } = bugger.view(
    $.session.info.affectedInstances
  );
  const networkId = await providedProvider.request({
    method: "net_version",
    params: []
  });
  const unknownAddresses: string[] = Object.entries(affectedInstances).reduce(
    (a, item) => {
      if (item[1].contractName === undefined) {
        // @ts-ignore
        a.push(item[0]);
      }
      return a;
    },
    []
  );
  if (unknownAddresses.length > 0 && networkId) {
    await fetchCompilationsAndAddToSession(bugger, networkId, unknownAddresses);
  }
  const sources = await getTransactionSourcesBeforeStarting(bugger);
  // we need to transform these into the format dashboard uses
  const transformedSources = Object.values(sources).flatMap(
    ({ id, sourcePath, source: contents, language }: any) =>
      language === "Solidity" ? [{ id, sourcePath, contents, language }] : []
  );
  await bugger.startFullMode();
  return {
    sources: transformedSources,
    session: bugger,
    networkId,
    unknownAddresses
  };
}

async function fetchCompilationsAndAddToSession(
  session: Session,
  networkId: string,
  addresses: string[]
) {
  const host = window.location.hostname;
  const port =
    process.env.NODE_ENV === "development" ? 24012 : window.location.port;
  const fetchAndCompileEndpoint = `http://${host}:${port}/fetch-and-compile`;

  for (const address of addresses) {
    const fetchResult = await fetch(
      `${fetchAndCompileEndpoint}?address=${address}&networkId=${networkId}`
    );
    const { compilations } = await fetchResult.json();
    if (compilations.length === 0) {
      continue;
    }
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(Etherscan)`
    );

    await session.addExternalCompilations(shimmedCompilations);
  }
}
