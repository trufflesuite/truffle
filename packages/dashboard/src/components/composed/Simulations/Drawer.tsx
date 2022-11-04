import { Link } from "react-router-dom";
import {
  Stack,
  NavLink,
  CloseButton,
  Button,
  createStyles
} from "@mantine/core";
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

  const handleNavLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    simulationId: number
  ) => {
    const targetIsNavLink = ["root", "body", "label"].some(part =>
      (e.target as HTMLElement).classList.contains(`mantine-NavLink-${part}`)
    );
    if (!targetIsNavLink) {
      e.preventDefault();
      operations.deleteSimulation(simulationId);
    }
  };

  const simulations = Array.from(state.simulations, ([id, data]) => (
    <NavLink
      key={`simulation-${id}`}
      component={Link}
      to={`/simulations#${id}`}
      onClick={(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) =>
        handleNavLinkClick(e, id)
      }
      label={data.label}
      rightSection={<CloseButton title="Remove simulation" color="red" />}
    />
  ));

  return (
    <Stack className={classes.container} spacing={0} p={0}>
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
