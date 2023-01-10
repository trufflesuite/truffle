import { useEffect } from "react";
import { AppShell, createStyles } from "@mantine/core";
import {
  showNotification,
  updateNotification,
  hideNotification
} from "@mantine/notifications";
import { Outlet } from "react-router-dom";
import { useDash } from "src/hooks";
import Sidebar from "src/components/composed/Sidebar";
import Notice from "src/components/composed/Notice";
import {
  analyticsNotifications,
  analyticsNotificationId
} from "src/utils/notifications";

const ARBITRARY_ANALYTICS_NEXT_ASK_THRESHOLD = 31544444444; // 365 days

const useStyles = createStyles((_theme, _params, _getRef) => ({
  main: {
    maxHeight: "100vh",
    overflow: "auto"
  }
}));

function Layout(): JSX.Element {
  const {
    state: { notice, analyticsConfig },
    operations: { updateAnalyticsConfig }
  } = useDash()!;
  const { classes } = useStyles();

  useEffect(() => {
    if (notice.show || analyticsConfig.analyticsSet === null) return;

    const shouldAsk =
      !analyticsConfig.enableAnalytics && !analyticsConfig.analyticsSet;
    const shouldAskAgain =
      !analyticsConfig.enableAnalytics &&
      Date.now() - analyticsConfig.analyticsMessageDateTime! >
        ARBITRARY_ANALYTICS_NEXT_ASK_THRESHOLD;

    const analyticsNotificationArgs = [
      () => {
        updateAnalyticsConfig(true);
        updateNotification(analyticsNotifications["thank"]());
      },
      () => {
        updateAnalyticsConfig(false);
        hideNotification(analyticsNotificationId);
      }
    ];

    if (shouldAsk) {
      showNotification(
        analyticsNotifications["ask"](...analyticsNotificationArgs)
      );
    } else if (shouldAskAgain) {
      showNotification(
        analyticsNotifications["ask-again"](...analyticsNotificationArgs)
      );
    }
  }, [notice, analyticsConfig, updateAnalyticsConfig]);

  return (
    <AppShell
      navbar={<Sidebar />}
      fixed={false}
      padding={0}
      classNames={{ main: classes.main }}
    >
      {notice.show ? <Notice contentType={notice.type!} /> : <Outlet />}
    </AppShell>
  );
}

export default Layout;
