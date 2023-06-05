import type { NotificationProps } from "@mantine/notifications";

export const frameWalletNotificationId = "frame-wallet";

export const frameWalletNotifications: Record<"no-account", NotificationProps> =
  {
    "no-account": {
      id: frameWalletNotificationId,
      autoClose: false,
      color: "yellow",
      title: "Frame wallet not ready",
      message: "Connect a Frame account to continue"
    }
  };
