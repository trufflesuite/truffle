import { useEffect, useState } from "react";
import { createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { showNotification, updateNotification } from "@mantine/notifications";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Overview from "src/components/composed/RPCs/RPC/Overview";
import Details from "src/components/composed/RPCs/RPC/Details";
import { useDash } from "src/hooks";
import { messageIsDecodable, decodeMessage } from "src/utils/dash";
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
  const [decodingInspected, setDecodingInspected] = useState("");
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

  const detailsView = clicked ? "expanded" : "collapsed";

  const decodable = messageIsDecodable(lifecycle.message);

  useEffect(() => {
    const decode = async () => {
      const { method, resultInspected, failed } = await decodeMessage(
        lifecycle,
        decoder!
      );

      setDecodingInspected(resultInspected);
      setDecodingSucceeded(!failed);

      const id = `decode-rpc-request-${lifecycle.message.payload.id}`;
      if (failed) {
        showNotification({ ...decodeNotifications[method]["fail"], id });
      } else {
        updateNotification({ ...decodeNotifications[method]["success"], id });
      }
    };

    if (decodable) decode();
  }, [decoder, decodable, lifecycle]);

  return (
    <div className={classes.container}>
      <Overview
        lifecycle={lifecycle}
        showDecoding={decodable}
        decodingInspected={decodingInspected}
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
        decodingInspected={decodingInspected}
        decodingSucceeded={decodingSucceeded}
        view={detailsView}
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
