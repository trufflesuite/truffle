import type { providers } from "ethers";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import {
  INTERACTIVE_RPC_METHODS,
  UNSUPPORTED_RPC_METHODS,
  unsupportedMessageResponse
} from "src/utils/constants";
import type { UNSUPPORTED_RPC_METHOD } from "src/utils/constants";

export function messageNeedsInteraction(message: DashboardProviderMessage) {
  return (INTERACTIVE_RPC_METHODS as ReadonlyArray<string>).includes(
    message.payload.method
  );
}

export function messageIsUnsupported(message: DashboardProviderMessage) {
  return (UNSUPPORTED_RPC_METHODS as ReadonlyArray<string>).includes(
    message.payload.method
  );
}

export function rejectMessage(
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>,
  reason?: "UNSUPPORTED" | "USER"
) {
  const { jsonrpc, id } = lifecycle.message.payload;
  let message = "Message rejected";
  switch (reason) {
    case "UNSUPPORTED":
      message = unsupportedMessageResponse.get(
        lifecycle.message.payload.method as UNSUPPORTED_RPC_METHOD
      )!;
      break;
    case "USER":
      message = "Message rejected by user";
      break;
    default:
      console.warn("Message rejected without explicit reason");
      break;
  }
  const error = { code: 4001, message };
  const payload = { jsonrpc, id, error };
  lifecycle.respond({ payload });
}

export async function confirmMessage(
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>,
  provider: providers.JsonRpcProvider
) {
  const { jsonrpc, id, method, params } = lifecycle.message.payload;
  let payload: any = { jsonrpc, id };
  try {
    const result = await provider.send(method, params);
    payload["result"] = result;
  } catch (err) {
    console.error(err);
    payload["error"] = err;
  }
  try {
    await lifecycle.respond({ payload });
  } catch (err: any) {
    // TODO: Fix message bus client, do not send duplicate messages
    const muteErrPattern =
      /A response has already been sent for message id.*of type "provider"./;
    if (!muteErrPattern.test(err.message)) {
      console.error(err);
    }
  }
  return payload;
}
