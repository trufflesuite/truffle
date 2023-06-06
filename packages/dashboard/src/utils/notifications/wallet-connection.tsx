import { Text, Code } from "@mantine/core";
import type { NotificationProps } from "@mantine/notifications";

export const walletConnectionNotificationId = "wallet-connection";

const baseNotification = {
  id: walletConnectionNotificationId,
  autoClose: false,
  color: "yellow"
};

export const walletConnectionNotifications = {
  "no-frame-account": () => ({
    ...baseNotification,
    title: "Frame wallet not ready",
    message: "Connect a Frame account to continue"
  }),
  "no-frame-permission": () => ({
    ...baseNotification,
    title: "Connection denied",
    message: (
      <Text>
        Allow connection to {window.location.host}, under
        <Code>DAPPS</Code> in your active Frame account
      </Text>
    )
  }),
  "general": (message: string) => ({
    ...baseNotification,
    title: "Cannot connect to wallet",
    message
  })
} satisfies Record<string, (message: string) => NotificationProps>;
