import { Stack } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import DecodedParams from "src/components/composed/RPCs/RPC/Details/Expanded/DecodedParams";
import RawParams from "src/components/composed/RPCs/RPC/Details/Expanded/RawParams";
import type { DECODABLE_RPC_METHOD } from "src/utils/constants";

type ExpandedProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  showDecoding: boolean;
  decodingInspected: string;
  decodingSucceeded: boolean;
};

function Expanded({
  lifecycle,
  showDecoding,
  decodingInspected,
  decodingSucceeded
}: ExpandedProps): JSX.Element {
  const { params, method } = lifecycle.message.payload;

  return (
    <Stack spacing="md" px="xl" pt="sm" pb="xl">
      {showDecoding && (
        <DecodedParams
          decodingInspected={decodingInspected}
          decodingSucceeded={decodingSucceeded}
          method={method as DECODABLE_RPC_METHOD}
        />
      )}
      <RawParams data={params} />
    </Stack>
  );
}

export default Expanded;
