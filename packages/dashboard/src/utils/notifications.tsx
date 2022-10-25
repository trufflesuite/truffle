import { Text, Code } from "@mantine/core";
import type { NotificationProps } from "@mantine/notifications";
import type { DecodableRpcMethod } from "src/utils/constants";

export const decodeNotifications: Record<
  DecodableRpcMethod,
  {
    fail: NotificationProps;
    success: NotificationProps;
  }
> = {
  eth_sendTransaction: {
    fail: {
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
    },
    success: {
      title: "Transaction decoded",
      message: "",
      autoClose: 2000,
      color: "truffle-teal"
    }
  },

  personal_sign: {
    fail: {
      title: "Cannot decode sign data",
      message: (
        <Text>
          Verify that the data is a valid hex string prefixed with&nbsp;
          <Code>0x</Code>
        </Text>
      ),
      autoClose: false,
      color: "yellow"
    },
    success: {
      title: "Sign data decoded",
      message: "",
      autoClose: 2000,
      color: "truffle-teal"
    }
  }
};
