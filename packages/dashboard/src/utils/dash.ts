import inspect from "object-inspect";
import * as Codec from "@truffle/codec";
import { Buffer } from "buffer";
import type { ProjectDecoder } from "@truffle/decoder";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import {
  decodableRpcMethods,
  interactiveRpcMethods,
  unsupportedRpcMethods,
  unsupportedMessageResponse,
  chainIDtoName
} from "src/utils/constants";
import type {
  DecodableRpcMethod,
  UnsupportedRpcMethod,
  knownChainID
} from "src/utils/constants";

export function messageIsDecodable(message: DashboardProviderMessage) {
  return (decodableRpcMethods as Set<string>).has(message.payload.method);
}

export function messageNeedsInteraction(message: DashboardProviderMessage) {
  return (interactiveRpcMethods as Set<string>).has(message.payload.method);
}

export function messageIsUnsupported(message: DashboardProviderMessage) {
  return (unsupportedRpcMethods as Set<string>).has(message.payload.method);
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
        lifecycle.message.payload.method as UnsupportedRpcMethod
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
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>
) {
  const { jsonrpc, id, method, params } = lifecycle.message.payload;
  let payload: any = { jsonrpc, id };
  try {
    // @ts-ignore
    const result = await window.ethereum.request({ method, params });
    payload["result"] = result;
  } catch (err) {
    console.error(err);
    payload["error"] = err;
  }
  try {
    await lifecycle.respond({ payload });
  } catch (err: any) {
    const muteErrPattern =
      /^A response has already been sent for message id .* of type "provider"\.$/;
    if (!muteErrPattern.test(err.message)) {
      console.error(err);
    }
  }
  return payload;
}

export async function decodeMessage(
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>,
  decoder: ProjectDecoder
) {
  const method = lifecycle.message.payload.method as DecodableRpcMethod;

  switch (method) {
    case "eth_sendTransaction": {
      const params = lifecycle.message.payload.params[0];
      const result = await decoder.decodeTransaction({
        from: params.from,
        to: params.to || null,
        input: params.data,
        value: params.value,
        blockNumber: null,
        nonce: params.nonce,
        gas: params.gas,
        gasPrice: params.gasPrice
      });
      const resultInspected = inspect(
        new Codec.Export.CalldataDecodingInspector(result),
        { quoteStyle: "double" }
      );
      const failed =
        /^(Created|Receiving) contract could not be identified\.$/.test(
          resultInspected
        );
      return { method, result, resultInspected, failed };
    }

    case "personal_sign": {
      const hex = lifecycle.message.payload.params[0];
      const hexIsValid = /^0x[0-9a-f]*$/i.test(hex);
      const utf8 = Buffer.from(hex.slice(2), "hex").toString();
      return {
        method,
        result: utf8,
        resultInspected: utf8,
        failed: !hexIsValid
      };
    }

    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4":
      let typedData = lifecycle.message.payload.params[1];
      let failed = false;
      try {
        typedData = JSON.stringify(JSON.parse(typedData), null, 2);
      } catch (err) {
        failed = true;
      }
      return {
        method,
        result: typedData,
        resultInspected: typedData,
        failed
      };
  }
}

export function getChainNameByID(id: number) {
  return chainIDtoName[id.toString() as knownChainID];
}
