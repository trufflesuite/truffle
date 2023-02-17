import { forTx } from "@truffle/debugger";
import * as Codec from "@truffle/codec";
import { provider } from "ganache";
import type { Session } from "src/utils/debugger";
import type { Compilation } from "@truffle/compile-common";

export async function setupSession(
  transactionHash: string,
  networkName: string,
  compilations: Compilation[],
  callbacks?: {
    onInit?: () => void;
    onFetch?: () => void;
    onStart?: () => void;
    onReady?: () => void;
  }
): Promise<Session> {
  callbacks?.onInit?.();
  const session = await createSession(
    transactionHash,
    networkName,
    compilations
  );

  callbacks?.onFetch?.();
  // await fetchCompilationsAndAddToSession(session, networkName);

  callbacks?.onStart?.();
  await session.startFullMode();

  callbacks?.onReady?.();
  return session;
}

async function createSession(
  transactionHash: string,
  networkName: any,
  compilations: Compilation[]
): Promise<Session> {
  console.log("tx hash - %o", transactionHash);
  return forTx(transactionHash, {
    provider: provider({ fork: { network: networkName } }),
    compilations: Codec.Compilations.Utils.shimCompilations(compilations),
    lightMode: true
  });
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
  console.log("the addresses -- %o", instances);
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
