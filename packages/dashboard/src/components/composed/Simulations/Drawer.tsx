import { Link } from "react-router-dom";
import { Stack, Button, UnstyledButton, createStyles } from "@mantine/core";
import { useDash } from "src/hooks";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  container: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)"
  }
}));

export default function Drawer(): JSX.Element {
  const { state, operations } = useDash()!;
  const { classes } = useStyles();

  const simulations = Array.from(state.simulations, ([key, data]) => (
    <UnstyledButton
      key={`simulation-${key}`}
      component={Link}
      to={`/simulations#${key}`}
    >
      {data.label}
    </UnstyledButton>
  ));

  return (
    <Stack className={classes.container} p={0}>
      {simulations}
      <Button
        onClick={operations.addSimulation}
        color="truffle-beige"
        variant="light"
      >
        New simulation
      </Button>
    </Stack>
  );
}
