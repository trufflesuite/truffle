import { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { useMantineTheme } from "@mantine/core";
import {
  showNotification,
  updateNotification,
  hideNotification
} from "@mantine/notifications";
import { X, Check } from "react-feather";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Card from "src/components/common/Card";
import Overview from "src/components/composed/RPCs/RPC/Overview";
import Details from "src/components/composed/RPCs/RPC/Details";
import { useDash } from "src/hooks";
import { messageIsDecodable, decodeMessage, Decoding } from "src/utils/dash";
import { decodeNotifications } from "src/utils/notifications";

type RPCProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
};

export default function RPC({ lifecycle }: RPCProps): JSX.Element {
  const { decoder } = useDash()!.state;
  const [decoding, setDecoding] = useState<Decoding>("");
  const [decodingSucceeded, setDecodingSucceeded] = useState(true);
  const decodable = messageIsDecodable(lifecycle.message);
  const decodeNotificationId = `decode-rpc-request-${lifecycle.message.payload.id}`;
  const [rejectHovered, rejectHoveredHandlers] = useDisclosure(false);
  const [confirmHovered, confirmHoveredHandlers] = useDisclosure(false);
  const { colors } = useMantineTheme();

  useEffect(() => {
    const decode = async () => {
      const { method, result, failed } = await decodeMessage(
        lifecycle,
        decoder!
      );

      setDecoding(result);
      setDecodingSucceeded(!failed);

      if (failed) {
        showNotification({
          ...decodeNotifications[method]["fail"],
          id: decodeNotificationId
        });
      } else {
        updateNotification({
          ...decodeNotifications[method]["success"],
          id: decodeNotificationId
        });
      }
    };

    if (decodable) decode();
  }, [lifecycle, decoder, decodable, decodeNotificationId]);

  useEffect(
    () => () => void hideNotification(decodeNotificationId),
    [decodeNotificationId]
  );

  return (
    <Card
      overviewComponent={Overview}
      overviewProps={{
        lifecycle,
        showDecoding: decodable,
        decoding,
        decodingSucceeded,
        handleRejectEnter: rejectHoveredHandlers.open,
        handleRejectLeave: rejectHoveredHandlers.close,
        handleConfirmEnter: confirmHoveredHandlers.open,
        handleConfirmLeave: confirmHoveredHandlers.close
      }}
      detailsComponent={Details}
      detailsProps={{
        lifecycle,
        showDecoding: decodable,
        decoding,
        decodingSucceeded
      }}
      extraIcons={[
        {
          component: X,
          show: rejectHovered,
          color: colors.red[6]
        },
        {
          component: Check,
          show: confirmHovered,
          color: colors.green[8]
        }
      ]}
    />
  );
}
