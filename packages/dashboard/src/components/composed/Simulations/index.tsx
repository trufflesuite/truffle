import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Stack, Text, createStyles } from "@mantine/core";
import Drawer from "src/components/composed/Simulations/Drawer";
import { useDash } from "src/hooks";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  container: {
    width: "100%",
    height: "100%"
  }
}));

export default function Simulations(): JSX.Element {
  const { state } = useDash()!;
  const hash = useLocation().hash.slice(1);
  const navigate = useNavigate();
  const [simulationId, setSimulationId] = useState<number>();
  const { classes } = useStyles();

  useEffect(() => {
    if (/^\d*$/.test(hash) && state.simulations.has(parseInt(hash))) {
      setSimulationId(parseInt(hash));
    } else {
      navigate("/simulations");
    }
  }, [hash, state.simulations, navigate]);

  return (
    <Stack className={classes.container}>
      {simulationId === undefined ? (
        <Text>Create / select a simulation</Text>
      ) : (
        <Text>Viewing simulation (id: {simulationId})</Text>
      )}
      <Drawer />
    </Stack>
  );
}
