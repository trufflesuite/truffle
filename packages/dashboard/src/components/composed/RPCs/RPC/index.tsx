import { useEffect, useState } from "react";
import { createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  showNotification,
  updateNotification,
  hideNotification
} from "@mantine/notifications";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Overview from "src/components/composed/RPCs/RPC/Overview";
import Details from "src/components/composed/RPCs/RPC/Details";
import { useDash } from "src/hooks";
import { messageIsDecodable, decodeMessage, Decoding } from "src/utils/dash";
import { decodeNotifications } from "src/utils/notifications";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, radius, fn } = theme;
  return {
    container: {
      width: "60%",
      minWidth: 590,
      maxWidth: 920,
      borderRadius: radius.sm,
      outline:
        colorScheme === "dark"
          ? `0.5px solid ${colors["truffle-brown"][5]}`
          : `0.5px solid ${fn.rgba(colors["truffle-beige"][5], 0.45)}`
    }
  };
});

type RPCProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
};

function RPC({ lifecycle }: RPCProps): JSX.Element {
  const { decoder } = useDash()!.state;
  const [decoding, setDecoding] = useState<Decoding>("");
  const [decodingSucceeded, setDecodingSucceeded] = useState(true);
  const [clicked, clickedHandlers] = useDisclosure(false);
  const [overviewBackHovered, overviewBackHoveredHandlers] =
    useDisclosure(false);
  const [rejectButtonHovered, rejectButtonHoveredHandlers] =
    useDisclosure(false);
  const [confirmButtonHovered, confirmButtonHoveredHandlers] =
    useDisclosure(false);
  const [collapsedDetailsHovered, collapsedDetailsHoveredHandlers] =
    useDisclosure(false);
  const { classes } = useStyles();

  const decodable = messageIsDecodable(lifecycle.message);
  const decodeNotificationId = `decode-rpc-request-${lifecycle.message.payload.id}`;

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
    <div className={classes.container}>
      <Overview
        lifecycle={lifecycle}
        showDecoding={decodable}
        decoding={decoding}
        decodingSucceeded={decodingSucceeded}
        active={
          clicked ||
          overviewBackHovered ||
          rejectButtonHovered ||
          confirmButtonHovered
        }
        onBackClick={clickedHandlers.toggle}
        onBackEnter={overviewBackHoveredHandlers.open}
        onBackLeave={overviewBackHoveredHandlers.close}
        onRejectButtonEnter={rejectButtonHoveredHandlers.open}
        onRejectButtonLeave={rejectButtonHoveredHandlers.close}
        onConfirmButtonEnter={confirmButtonHoveredHandlers.open}
        onConfirmButtonLeave={confirmButtonHoveredHandlers.close}
      />
      <Details
        lifecycle={lifecycle}
        showDecoding={decodable}
        decoding={decoding}
        decodingSucceeded={decodingSucceeded}
        view={clicked ? "expanded" : "collapsed"}
        hoverState={{
          overviewBackHovered,
          rejectButtonHovered,
          confirmButtonHovered,
          collapsedDetailsHovered
        }}
        onCollapsedClick={clickedHandlers.toggle}
        onCollapsedEnter={collapsedDetailsHoveredHandlers.open}
        onCollapsedLeave={collapsedDetailsHoveredHandlers.close}
      />
    </div>
  );
}

export default RPC;
