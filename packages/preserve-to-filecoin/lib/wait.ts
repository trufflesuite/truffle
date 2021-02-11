import CID from "cids";
import * as Preserve from "@truffle/preserve";
import { dealstates, terminalStates, DealState } from "./dealstates";
import { LotusClient } from "filecoin.js";
import delay from "delay";

export interface WaitOptions {
  client: LotusClient;
  dealCid: CID;
  controls: Preserve.Controls;
}

export async function* wait(options: WaitOptions): Preserve.Process<void> {
  const { client, dealCid, controls } = options;
  const { step } = controls;

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

export async function getDealState(
  dealCid: CID,
  client: LotusClient
): Promise<DealState> {
  const clientDeals = await client.client.listDeals();

  const [deal] = clientDeals.filter(d => {
    return d.ProposalCid["/"] == dealCid.toString();
  });

  return dealstates[deal.State];
}

async function waitForDealToFinish(
  dealCid: CID,
  client: LotusClient
): Promise<"Active"> {
  const maxRetries = 600;
  const intervalSeconds = 1;

  for (let retries = 0; retries < maxRetries; retries++) {
    await delay(intervalSeconds * 1000);

    // TODO: Maybe report on the current state while waiting.
    const state = await getDealState(dealCid, client);

    if (state === "Active") return state;

    if (terminalStates.includes(state)) {
      throw new Error(`Deal failed with state: ${state}`);
    }
  }

  throw new Error(
    `Could not finish deal within ${maxRetries * intervalSeconds} seconds`
  );
}
