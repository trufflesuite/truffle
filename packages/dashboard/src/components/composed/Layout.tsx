import { AppShell, createStyles } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { useDash } from "src/contexts/DashContext";
import Sidebar from "src/components/composed/Sidebar";
import Notice from "src/components/composed/Notice";

const useStyles = createStyles((_theme, _params, _getRef) => ({
  main: {
    maxHeight: "100vh",
    overflow: "auto"
  }
}));

function Layout(): JSX.Element {
  const {
    state: { notice }
  } = useDash()!;
  const { classes } = useStyles();

  return (
    <AppShell
      navbar={<Sidebar />}
      classNames={{ main: classes.main }}
      padding={0}
    >
      {notice.show ? <Notice contentType={notice.type!} /> : <Outlet />}
    </AppShell>
  );
}

export default Layout;
