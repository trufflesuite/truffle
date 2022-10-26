import { Text, Code } from "@mantine/core";
import type { NotificationProps } from "@mantine/notifications";
import type { DecodableRpcMethod } from "src/utils/constants";

const failNotification = {
  autoClose: false,
  color: "yellow"
};

const successNotification = {
  message: "",
  autoClose: 2000,
  color: "truffle-teal"
};

const ethSendTransactionNotification = {
  fail: {
    ...failNotification,
    title: "Cannot decode transaction",
    message: (
      <Text>
        Try running&nbsp;
        <Code color="truffle-teal">truffle compile --all</Code>
        &nbsp;in your Truffle project
      </Text>
    )
  },
  success: {
    ...successNotification,
    title: "Transaction decoded"
  }
};

const personalSignNotification = {
  fail: {
    ...failNotification,
    title: "Cannot decode sign data",
    message: (
      <Text>
        Verify that the data is a valid hex string prefixed with&nbsp;
        <Code>0x</Code>
      </Text>
    )
  },
  success: {
    ...successNotification,
    title: "Sign data decoded"
  }
};

const ethSignTypedDataNotification = {
  fail: {
    ...failNotification,
    title: "Cannot decode typed data",
    message: "Verify that the data is a valid JSON string"
  },
  success: {
    ...successNotification,
    title: "Typed data decoded"
  }
};

export const decodeNotifications: Record<
  DecodableRpcMethod,
  {
    fail: NotificationProps;
    success: NotificationProps;
  }
> = {
  eth_sendTransaction: ethSendTransactionNotification,
  personal_sign: personalSignNotification,
  eth_signTypedData_v3: ethSignTypedDataNotification,
  eth_signTypedData_v4: ethSignTypedDataNotification
};
