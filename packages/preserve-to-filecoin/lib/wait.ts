import type CID from "cids";
import type * as Preserve from "@truffle/preserve";
import { terminalStates, DealState } from "./dealstates";
import type { LotusClient } from "filecoin.js";
import delay from "delay";
import type { DealInfo } from "filecoin.js/builds/dist/providers/Types";

export interface WaitOptions {
  client: LotusClient;
  dealCid: CID;
  controls: Preserve.Controls;
}

export async function* wait(options: WaitOptions): Preserve.Process<void> {
  const { client, dealCid, controls } = options;
  const { step } = controls;

  const task = yield* step({
    message: "Waiting for deal to finish..."
  });

  const state = yield* task.declare({ identifier: "Deal State" });

  try {
    yield* waitForDealToFinish(dealCid, client, state);
    yield* task.succeed();
  } catch (error) {
    yield* task.fail({ error });
  }
}

export async function getDealInfo(
  dealCid: CID,
  client: LotusClient
): Promise<DealInfo> {
  const dealCidParameter = {
    "/": dealCid.toString()
  };

  const dealInfo = await client.client.getDealInfo(dealCidParameter);

  return dealInfo;
}

export async function getDealState(dealInfo: DealInfo, client: LotusClient): Promise<DealState> {
  const dealState = await client.client.getDealStatus(dealInfo.State);

  return dealState as DealState;
}

async function * waitForDealToFinish(
  dealCid: CID,
  client: LotusClient,
  task: Preserve.Control.ValueResolutionController
): Preserve.Process<void> {
  const maxRetries = 600;
  const intervalSeconds = 1;

  for (let retries = 0; retries < maxRetries; retries++) {
    await delay(intervalSeconds * 1000);

    const dealInfo = await getDealInfo(dealCid, client);
    const state = await getDealState(dealInfo, client);

    yield* task.update({ payload: state });

    if (state === "StorageDealActive") {
      yield* task.resolve({
        resolution: state,
        payload: state
      });
      return;
    }

    if (terminalStates.includes(state)) {
      yield* task.resolve({
        resolution: state,
        payload: state
      });
      throw new Error(`Deal failed: ${dealInfo.Message}`);
    }
  }

  throw new Error(
    `Could not finish deal within ${maxRetries * intervalSeconds} seconds`
  );
}
