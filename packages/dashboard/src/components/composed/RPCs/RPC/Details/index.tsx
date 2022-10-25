import React, { Suspense } from "react";
import {
  Container,
  Center,
  Divider,
  Loader,
  createStyles
} from "@mantine/core";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import type {
  HoverState,
  DetailsView
} from "src/components/composed/RPCs/RPC/Details/types";
import Collapsed from "src/components/composed/RPCs/RPC/Details/Collapsed";
const Expanded = React.lazy(() =>
  Promise.all([
    import("src/components/composed/RPCs/RPC/Details/Expanded"),
    new Promise(resolve => setTimeout(resolve, 300))
  ]).then(([res]) => res)
);

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colorScheme, colors, radius, fn } = theme;
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
    },
    divider: {
      borderWidth: 0.5,
      borderColor:
        colorScheme === "dark"
          ? fn.rgba(colors["truffle-brown"][5], 0.65)
          : fn.rgba(colors["truffle-beige"][5], 0.65)
    }
  };
});

type DetailsProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
  showDecoding: boolean;
  decodingInspected: string;
  decodingSucceeded: boolean;
  view: DetailsView;
  hoverState: HoverState;
  onCollapsedClick: React.MouseEventHandler<HTMLDivElement>;
  onCollapsedEnter: React.MouseEventHandler<HTMLDivElement>;
  onCollapsedLeave: React.MouseEventHandler<HTMLDivElement>;
};

function Details({
  lifecycle,
  showDecoding,
  decodingInspected,
  decodingSucceeded,
  view,
  hoverState,
  onCollapsedClick,
  onCollapsedEnter,
  onCollapsedLeave
}: DetailsProps): JSX.Element {
  const { overviewBackHovered, collapsedDetailsHovered } = hoverState;
  const hovered = overviewBackHovered || collapsedDetailsHovered;
  const { classes } = useStyles();

  return (
    <Container
      px={0}
      className={`${classes.container} ${
        hovered ? classes.containerTinted : ""
      }`}
    >
      <Collapsed
        hoverState={hoverState}
        currentDetailsView={view}
        onClick={onCollapsedClick}
        onEnter={onCollapsedEnter}
        onLeave={onCollapsedLeave}
      />
      {view === "expanded" && (
        <>
          <Divider className={classes.divider} />
          <Suspense
            fallback={
              <Center p="xl">
                <Loader size="lg" variant="dots" />
              </Center>
            }
          >
            <Expanded
              {...{
                lifecycle,
                showDecoding,
                decodingInspected,
                decodingSucceeded
              }}
            />
          </Suspense>
        </>
      )}
    </Container>
  );
}

export default Details;
