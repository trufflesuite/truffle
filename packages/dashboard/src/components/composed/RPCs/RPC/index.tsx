import { createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import Overview from "src/components/composed/RPCs/RPC/Overview";
import Details from "src/components/composed/RPCs/RPC/Details";

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
  const [clicked, clickedHandlers] = useDisclosure(false);
  const [overviewBackHovered, overviewBackHoveredHandlers] =
    useDisclosure(false);
  const [rejectButtonHovered, rejectButtonHoveredHandlers] =
    useDisclosure(false);
  const [confirmButtonHovered, confirmButtonHoveredHandlers] =
    useDisclosure(false);
  const [detailsHovered, detailsHoveredHandlers] = useDisclosure(false);
  const { classes } = useStyles();

  const detailsView = clicked ? "expanded" : "collapsed";

  return (
    <div className={classes.container}>
      <Overview
        lifecycle={lifecycle}
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
        view={detailsView}
        hoverState={{
          overviewBackHovered,
          rejectButtonHovered,
          confirmButtonHovered,
          detailsHovered
        }}
        onCollapsedClick={clickedHandlers.open}
        onEnter={detailsHoveredHandlers.open}
        onLeave={detailsHoveredHandlers.close}
      />
    </div>
  );
}

export default RPC;
