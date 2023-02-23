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
  const { session, sources } = await createSession(
    transactionHash,
    providedProvider,
    compilations
  );

  callbacks?.onFetch?.();
  // await fetchCompilationsAndAddToSession(session, networkName);

  callbacks?.onStart?.();
  await session.startFullMode();

  callbacks?.onReady?.();
  return { session, sources };
}

async function createSession(
  transactionHash: string,
  providedProvider: any,
  compilations: Compilation[]
): Promise<{ session: Session; sources: Source[] }> {
  const bugger = await forTx(transactionHash, {
    provider: provider({ fork: { provider: providedProvider } }),
    compilations: Codec.Compilations.Utils.shimCompilations(compilations),
    lightMode: true
  });
  const affectedInstances = bugger.view($.session.info.affectedInstances);
  console.log("the instances -- %o", affectedInstances);
  const sources = await getTransactionSourcesBeforeStarting(bugger);
  // we need to transform these into the format dashboard uses
  const transformedSources = Object.values(sources).flatMap(
    ({ id, sourcePath, source: contents, language }: any) =>
      language === "Solidity" ? [{ id, sourcePath, contents, language }] : []
  );
  await bugger.startFullMode();
  return {
    sources: transformedSources,
    session: bugger
  };
}

async function fetchCompilationsAndAddToSession(
  session: Session,
  networkName: string
) {
  const $ = session.selectors;

  const host = window.location.hostname;
  const port =
    process.env.NODE_ENV === "development" ? 24012 : window.location.port;
  const fetchAndCompileEndpoint = `http://${host}:${port}/fetch-and-compile`;
  const instances = session.view($.session.info.affectedInstances);
  // @ts-ignore
  const addresses = Object.entries(instances)
    .filter(([_, { contractName }]: any) => contractName === undefined)
    .map(([address, _]) => address);

  for (const address of addresses) {
    const fetchResult = await fetch(
      `${fetchAndCompileEndpoint}?address=${address}&network=${networkName}`
    );
    const { compilations } = await fetchResult.json();
    const shimmedCompilations = Codec.Compilations.Utils.shimCompilations(
      compilations,
      `externalFor(${address})Via(Etherscan)`
    );

    await session.addExternalCompilations(shimmedCompilations);
  }
}
