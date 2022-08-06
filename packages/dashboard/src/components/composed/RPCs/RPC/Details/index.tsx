import React, { Suspense } from "react";
import { Container, Center, Loader, createStyles } from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type { HoverState } from "src/components/composed/RPCs/RPC/Details/types";
import Collapsed from "src/components/composed/RPCs/RPC/Details/Collapsed";
const Expanded = React.lazy(() =>
  Promise.all([
    import("src/components/composed/RPCs/RPC/Details/Expanded"),
    new Promise(resolve => setTimeout(resolve, 300))
  ]).then(([res]) => res)
);

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colorScheme, colors, radius } = theme;
  return {
    container: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][8]
          : colors["truffle-beige"][4],
      transition: "background-color 0.2s",
      borderRadius: `0 0 ${radius.sm}px ${radius.sm}px`
    },
    containerTinted: {
      backgroundColor:
        colorScheme === "dark"
          ? colors["truffle-brown"][9]
          : colors["truffle-beige"][2]
    }
  };
});

type DetailsProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  view: "expanded" | "collapsed";
  hoverState: HoverState;
  onCollapsedClick: React.MouseEventHandler<HTMLDivElement>;
  onEnter: React.MouseEventHandler<HTMLDivElement>;
  onLeave: React.MouseEventHandler<HTMLDivElement>;
};

function Details({
  lifecycle,
  view,
  hoverState,
  onCollapsedClick,
  onEnter,
  onLeave
}: DetailsProps): JSX.Element {
  const { overviewBackHovered, detailsHovered } = hoverState;
  const hovered = overviewBackHovered || detailsHovered;
  const { classes } = useStyles();

  return (
    <Container
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`${classes.container} ${
        hovered ? classes.containerTinted : ""
      }`}
    >
      {view === "expanded" ? (
        <Suspense
          fallback={
            <Center p="xl">
              <Loader size="lg" variant="dots" />
            </Center>
          }
        >
          <Expanded lifecycle={lifecycle} />
        </Suspense>
      ) : (
        <Collapsed onClick={onCollapsedClick} hoverState={hoverState} />
      )}
    </Container>
  );
}

export default Details;
