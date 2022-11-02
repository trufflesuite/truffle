import { Stack } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Simulate from "src/components/composed/RPCs/RPC/Details/Expanded/Simulate";
import DecodedParams from "src/components/composed/RPCs/RPC/Details/Expanded/DecodedParams";
import RawParams from "src/components/composed/RPCs/RPC/Details/Expanded/RawParams";
import type { DecodableRpcMethod } from "src/utils/constants";
import type { Decoding } from "src/utils/dash";

type ExpandedProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  showDecoding: boolean;
  decoding: Decoding;
  decodingSucceeded: boolean;
};

function Expanded({
  lifecycle,
  showDecoding,
  decoding,
  decodingSucceeded
}: ExpandedProps): JSX.Element {
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

export default Expanded;
