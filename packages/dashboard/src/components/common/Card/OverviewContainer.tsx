import { createStyles } from "@mantine/core";
import { Container } from "@mantine/core";
import type { CardState, CardSetState } from "src/components/common/Card";

const useStyles = createStyles((theme, _params, _getRef) => {
  const { colors, colorScheme, white, radius, fn } = theme;
  return {
    container: {
      backgroundColor:
        colorScheme === "dark"
          ? fn.rgba(colors["truffle-beige"][8], 0.12)
          : colors["truffle-beige"][1],
      transition: "background-color 0.2s",
      borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
      cursor: "pointer"
    },
    containerBright: {
      backgroundColor:
        colorScheme === "dark"
          ? fn.rgba(colors["truffle-beige"][8], 0.2)
          : white
    }
  };
});

interface OverviewContainerProps {
  state: CardState;
  setState: CardSetState;
  children?: React.ReactNode;
}

export default function OverviewContainer({
  state,
  setState,
  children
}: OverviewContainerProps): JSX.Element {
  const { classes } = useStyles();

  const handleClick = () => setState({ open: !state.open });
  const handleMouseEnter = () =>
    setState({ bright: { overview: true, details: true, iconBar: true } });
  const handleMouseLeave = () =>
    setState({
      bright: { overview: state.open, details: false, iconBar: state.open }
    });

  return (
    <Container
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      p={0}
      className={`${classes.container} ${
        state.bright.overview ? classes.containerBright : ""
      }`}
    >
      {children}
    </Container>
  );
}
