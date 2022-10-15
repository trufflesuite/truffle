import { useEffect, useState } from "react";
import { createStyles } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
  const [_decoding, setDecoding] = useState<Codec.CalldataDecoding>();
  const [decodingInspected, setDecodingInspected] = useState<string>();
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
      if (res.kind !== "unknown") {
        setDecoding(res);
        const resInspected = inspect(
          new Codec.Export.CalldataDecodingInspector(res),
          { quoteStyle: "double" }
        );
        setDecodingInspected(resInspected);
      }
    };

    decode();
  }, [lifecycle.message.payload.params, decoder]);

  return (
    <div className={classes.container}>
      <Overview
        lifecycle={lifecycle}
        decodingInspected={decodingInspected}
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
        decodingInspected={decodingInspected}
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
