import { Container, Divider, createStyles } from "@mantine/core";
import type { CardState } from "src/components/common/Card";

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
    containerBright: {
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

interface DetailsContainerProps {
  state: CardState;
  children?: React.ReactNode;
}

export default function DetailsContainer({
  state,
  children
}: DetailsContainerProps): JSX.Element {
  const { classes } = useStyles();

  return state.open ? (
    <Container
      p={0}
      className={`${classes.container} ${
        state.bright.details ? classes.containerBright : ""
      }`}
    >
      <Divider className={classes.divider} />
      {children}
    </Container>
  ) : (
    <></>
  );
}
