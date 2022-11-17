import { Stack } from "@mantine/core";
import type { CalldataDecoding } from "@truffle/codec";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import DecodedParams from "src/components/composed/RPCs/RPC/Details/Expanded/DecodedParams";
import RawParams from "src/components/composed/RPCs/RPC/Details/Expanded/RawParams";
import type { DecodableRpcMethod } from "src/utils/constants";

type ExpandedProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  showDecoding: boolean;
  decoding: CalldataDecoding | string;
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
