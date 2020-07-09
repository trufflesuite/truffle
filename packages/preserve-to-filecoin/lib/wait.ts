import CID from "cids";
import * as Preserve from "@truffle/preserve";
import { StorageProposalResult } from "./storage";
import { dealstates, terminalStates } from "./dealstates";

export interface WaitOptions extends Preserve.Controls {
  client: any;
  dealCid: CID;
}

export type Miner = any;

export async function* wait(options: WaitOptions): Preserve.Process<void> {
  const { client, dealCid, step } = options;

  const wait = yield* step({
    message: "Waiting for deal to finish..."
  });

  try {
    await waitForDealToFinish(dealCid, client);
  } catch (error) {
    yield* wait.fail({ error });
    return;
  }

  yield* wait.succeed();
}

export async function getDealState(dealCid: CID, client: any): Promise<string> {
  const clientDeals = await client.clientListDeals();

  const [deal] = clientDeals.filter((d: any) => {
    return d.ProposalCid["/"] == dealCid.toString();
  });

  return dealstates[deal.State];
}

function waitForDealToFinish(dealCid: CID, client: any) {
  var accept: Function, reject: Function;
  var p = new Promise((a, r) => {
    accept = a;
    reject = r;
  });

  var interval = setInterval(async () => {
    const state = await getDealState(dealCid, client);

    if (state == "Active") {
      clearInterval(interval);
      return accept(state);
    } else if (terminalStates.indexOf(state) >= 0) {
      clearInterval(interval);
      return reject(new Error("Deal failed with state: " + state));
    }
  }, 1000);

  return p;
}
