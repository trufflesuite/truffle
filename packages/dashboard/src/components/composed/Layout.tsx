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

const ARBITRARY_ANALYTICS_NEXT_ASK_THRESHOLD_IN_DAYS = 365;

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

  // Analytics notifications
  useEffect(() => {
    // Don't ask if...
    if (
      // There's currently a fullscreen notice
      notice.show ||
      // Analytics is already enabled
      analyticsConfig.enableAnalytics ||
      // Analytics config info is not in state yet
      analyticsConfig.analyticsMessageDateTime === null
    )
      return;

    const askAfter = new Date(analyticsConfig.analyticsMessageDateTime);
    askAfter.setDate(
      askAfter.getDate() + ARBITRARY_ANALYTICS_NEXT_ASK_THRESHOLD_IN_DAYS
    );

    const shouldAsk = !analyticsConfig.analyticsSet;
    const shouldAskAgain = new Date() > askAfter;

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
