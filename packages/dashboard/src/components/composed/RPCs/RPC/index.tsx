import { useEffect, useState } from "react";
import { Text, Code, createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { showNotification, updateNotification } from "@mantine/notifications";
import type { ReceivedMessageLifecycle } from "@truffle/dashboard-message-bus-client";
import type { DashboardProviderMessage } from "@truffle/dashboard-message-bus-common";
import * as Codec from "@truffle/codec";
import inspect from "object-inspect";
import Overview from "src/components/composed/RPCs/RPC/Overview";
import Details from "src/components/composed/RPCs/RPC/Details";
import { useDash } from "src/hooks";

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

type RPCProps = {
  lifecycle: ReceivedMessageLifecycle<DashboardProviderMessage>;
};

function RPC({ lifecycle }: RPCProps): JSX.Element {
  const { decoder } = useDash()!.state;
  const [decodingInspected, setDecodingInspected] = useState("");
  const [decodingSucceeded, setDecodingSucceeded] = useState(true);
  const [clicked, clickedHandlers] = useDisclosure(false);
  const [overviewBackHovered, overviewBackHoveredHandlers] =
    useDisclosure(false);
  const [rejectButtonHovered, rejectButtonHoveredHandlers] =
    useDisclosure(false);
  const [confirmButtonHovered, confirmButtonHoveredHandlers] =
    useDisclosure(false);
  const [collapsedDetailsHovered, collapsedDetailsHoveredHandlers] =
    useDisclosure(false);
  const { classes } = useStyles();

  const detailsView = clicked ? "expanded" : "collapsed";

  const isSendTransaction =
    lifecycle.message.payload.method === "eth_sendTransaction";

  useEffect(() => {
    const decode = async () => {
      const params = lifecycle.message.payload.params[0];
      const res = await decoder!.decodeTransaction({
        from: params.from,
        to: params.to || null,
        input: params.data,
        value: params.value,
        blockNumber: null,
        nonce: params.nonce,
        gas: params.gas,
        gasPrice: params.gasPrice
      });
      const resInspected = inspect(
        new Codec.Export.CalldataDecodingInspector(res),
        { quoteStyle: "double" }
      );
      const failed =
        /^(Created|Receiving) contract could not be identified\.$/.test(
          resInspected
        );
      setDecodingInspected(resInspected);
      setDecodingSucceeded(!failed);

      const id = `decode-transaction-${lifecycle.message.payload.id}`;
      if (failed) {
        showNotification({
          id,
          title: "Cannot decode transaction",
          message: (
            <Text>
              Try running&nbsp;
              <Code color="truffle-teal">truffle compile --all</Code>
              &nbsp;in your Truffle project.
            </Text>
          ),
          autoClose: false,
          color: "yellow"
        });
      } else {
        updateNotification({
          id,
          title: "Transaction decoded",
          message: "",
          autoClose: 2000,
          color: "truffle-teal"
        });
      }
    };

    if (isSendTransaction) decode();
  }, [decoder, isSendTransaction, lifecycle.message.payload]);

  return (
    <div className={classes.container}>
      <Overview
        lifecycle={lifecycle}
        showDecoding={isSendTransaction}
        decodingInspected={decodingInspected}
        decodingSucceeded={decodingSucceeded}
        active={
          clicked ||
          overviewBackHovered ||
          rejectButtonHovered ||
          confirmButtonHovered
        }
        onBackClick={clickedHandlers.toggle}
        onBackEnter={overviewBackHoveredHandlers.open}
        onBackLeave={overviewBackHoveredHandlers.close}
        onRejectButtonEnter={rejectButtonHoveredHandlers.open}
        onRejectButtonLeave={rejectButtonHoveredHandlers.close}
        onConfirmButtonEnter={confirmButtonHoveredHandlers.open}
        onConfirmButtonLeave={confirmButtonHoveredHandlers.close}
      />
      <Details
        lifecycle={lifecycle}
        showDecoding={isSendTransaction}
        decodingInspected={decodingInspected}
        decodingSucceeded={decodingSucceeded}
        view={detailsView}
        hoverState={{
          overviewBackHovered,
          rejectButtonHovered,
          confirmButtonHovered,
          collapsedDetailsHovered
        }}
        onCollapsedClick={clickedHandlers.toggle}
        onCollapsedEnter={collapsedDetailsHoveredHandlers.open}
        onCollapsedLeave={collapsedDetailsHoveredHandlers.close}
      />
    </div>
  );
}

export default RPC;
