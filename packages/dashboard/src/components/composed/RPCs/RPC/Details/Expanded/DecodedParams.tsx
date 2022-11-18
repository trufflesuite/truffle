import { Group, Text, createStyles } from "@mantine/core";
import { Prism } from "@mantine/prism";
import { AlertTriangle } from "react-feather";
import {
  inspectDecoding,
  getHighlightLanguageForRpcMethod
} from "src/utils/dash";
import type { Decoding } from "src/utils/dash";
import type { DecodableRpcMethod } from "src/utils/constants";

const useStyles = createStyles((theme, _params, _getRef) => ({
  alert: {
    color: theme.colors.orange[6]
  }
}));

type DecodedParamsProps = {
  decoding: Decoding;
  decodingSucceeded: boolean;
  method: DecodableRpcMethod;
};

function DecodedParams({
  decoding,
  decodingSucceeded,
  method
}: DecodedParamsProps): JSX.Element {
  const decodingInspected = inspectDecoding(decoding);
  const { classes } = useStyles();

  const language = getHighlightLanguageForRpcMethod(method);

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
