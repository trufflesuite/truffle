import { Stack } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Simulate from "src/components/composed/RPCs/RPC/Details/Simulate";
import DecodedParams from "src/components/composed/RPCs/RPC/Details/DecodedParams";
import RawParams from "src/components/composed/RPCs/RPC/Details/RawParams";
import type { DecodableRpcMethod } from "src/utils/constants";
import type { Decoding } from "src/utils/dash";

type DetailsProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  showDecoding: boolean;
  decoding: Decoding;
  decodingSucceeded: boolean;
  bright: boolean;
};

export default function Details({
  lifecycle,
  showDecoding,
  decoding,
  decodingSucceeded,
  bright: _bright
}: DetailsProps): JSX.Element {
  const { params, method } = lifecycle.message.payload;

  return (
    <Stack spacing="md" px="xl" pt="sm" pb="xl">
      {method === "eth_sendTransaction" && (
        <Simulate providerMessageId={lifecycle.message.id} />
      )}
      {showDecoding && (
        <DecodedParams
          decoding={decoding}
          decodingSucceeded={decodingSucceeded}
          method={method as DecodableRpcMethod}
        />
      )}
      <RawParams data={params} />
    </Stack>
  );
}
