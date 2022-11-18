import React from "react";
import { Container, createStyles } from "@mantine/core";
import { useSetState } from "@mantine/hooks";
import OverviewContainer from "src/components/common/Card/OverviewContainer";
import IconBar from "src/components/common/Card/IconBar";
import DetailsContainer from "src/components/common/Card/DetailsContainer";
import type { IconProps } from "src/components/common/Card/IconBar/Icon";

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

export interface CardState {
  bright: {
    overview: boolean;
    details: boolean;
    iconBar: boolean;
  };
  open: boolean;
}

export type CardSetState = (
  statePartial:
    | Partial<CardState>
    | ((currentState: CardState) => Partial<CardState>)
) => void;

const brightPropKey = "bright";
type BrightPropKey = typeof brightPropKey;

interface CardProps<T, U> {
  overviewComponent?: React.FunctionComponent<T>;
  overviewProps?: Omit<T, BrightPropKey>;
  detailsComponent?: React.FunctionComponent<U>;
  detailsProps?: Omit<U, BrightPropKey>;
  extraIcons?: IconProps[];
}

function createChildWithBrightProp(
  value: boolean,
  props: any,
  component?: React.FunctionComponent<any>
) {
  if (component) {
    return React.createElement(component, {
      ...props,
      [brightPropKey]: value
    });
  }
}

export default function Card<T, U>({
  overviewComponent,
  overviewProps,
  detailsComponent,
  detailsProps,
  extraIcons
}: CardProps<T, U>): JSX.Element {
  const { classes } = useStyles();
  const [state, setState] = useSetState<CardState>({
    bright: {
      overview: false,
      details: false,
      iconBar: false
    },
    open: false
  });

  const overview = createChildWithBrightProp(
    state.bright.overview,
    overviewProps,
    overviewComponent
  );
  const details = createChildWithBrightProp(
    state.bright.details,
    detailsProps,
    detailsComponent
  );

  return (
    <Container className={classes.container} p={0}>
      <OverviewContainer state={state} setState={setState}>
        {overview}
      </OverviewContainer>
      <IconBar state={state} setState={setState} extraIcons={extraIcons} />
      <DetailsContainer state={state}>{details}</DetailsContainer>
    </Container>
  );
}
