import { Group, Text, createStyles } from "@mantine/core";
import { Prism } from "@mantine/prism";
import { AlertTriangle } from "react-feather";
import type { DecodableRpcMethod } from "src/utils/constants";

const useStyles = createStyles((theme, _params, _getRef) => ({
  alert: {
    color: theme.colors.orange[6]
  }
}));

type DecodedParamsProps = {
  decodingInspected: string;
  decodingSucceeded: boolean;
  method: DecodableRpcMethod;
};

function DecodedParams({
  decodingInspected,
  decodingSucceeded,
  method
}: DecodedParamsProps): JSX.Element {
  const { classes } = useStyles();

  const language = method === "eth_sendTransaction" ? "javascript" : "markdown";

  return (
    <>
      <Group spacing={6}>
        <Text size="sm" color="teal" weight={700}>
          Decoded parameters
        </Text>
        {!decodingSucceeded && (
          <AlertTriangle size={16} className={classes.alert} />
        )}
      </Group>
      <Prism language={language} copyLabel="Copy to clipboard">
        {decodingInspected}
      </Prism>
    </>
  );
}

export default DecodedParams;
