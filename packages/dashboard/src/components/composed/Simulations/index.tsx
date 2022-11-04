import { useLocation } from "react-router-dom";
import { Stack, Text, createStyles } from "@mantine/core";
import Simulation from "src/components/composed/Simulations/Simulation";
import Drawer from "src/components/composed/Simulations/Drawer";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  container: {
    width: "100%",
    height: "100%"
  }
}));

export default function Simulations(): JSX.Element {
  const hash = useLocation().hash.slice(1);
  const { classes } = useStyles();

  return (
    <Stack className={classes.container}>
      {!hash ? (
        <Text>Create / select a simulation</Text>
      ) : (
        <Simulation id={parseInt(hash) || 0} />
      )}
      <Drawer />
    </Stack>
  );
}
