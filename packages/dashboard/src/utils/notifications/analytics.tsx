import { Stack, Group, Button, Text, Anchor } from "@mantine/core";
import type { NotificationProps } from "@mantine/notifications";

type NotificationPropsWithId = NotificationProps & { id: string };

export const analyticsNotificationId = "analytics";

const baseNotification = {
  autoClose: false,
  disallowClose: true,
  id: analyticsNotificationId
};

export const analyticsNotifications: Record<
  "ask" | "ask-again" | "thank",
  (enable?: () => void, disable?: () => void) => NotificationPropsWithId
> = {
  "ask": (enable, disable) => ({
    ...baseNotification,
    title: "Help improve Truffle",
    message: (
      <Stack>
        <Text>
          You can help us improve Truffle by allowing us to track how you use
          our tools. Would you like to share anonymous telemetry data? View the
          Truffle Analytics policy&nbsp;
          <Anchor href="https://trufflesuite.com/analytics" target="_blank">
            here
          </Anchor>
          .
        </Text>
        <Group grow>
          <Button onClick={disable} color="gray" variant="light">
            Dismiss
          </Button>
          <Button onClick={enable} variant="outline">
            Enable
          </Button>
        </Group>
      </Stack>
    ),
    color: "yellow"
  }),
  "ask-again": (enable, disable) => ({
    ...baseNotification,
    title: "Telemetry is currently disabled",
    message: (
      <Stack>
        <Text>
          Would you consider enabling it? It helps us make Truffle a better
          experience for you.
        </Text>
        <Group grow>
          <Button onClick={disable} color="gray" variant="light">
            No
          </Button>
          <Button onClick={enable} variant="outline">
            Enable
          </Button>
        </Group>
      </Stack>
    ),
    color: "yellow"
  }),
  "thank": () => ({
    ...baseNotification,
    title: "Telemetry is now enabled",
    message: "Thank you!",
    autoClose: 1500
  })
};
