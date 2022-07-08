import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import { useDash } from "src/contexts/DashContext";
import Sidebar from "src/components/composed/Sidebar";
import Notice from "src/components/composed/Notice";

function Layout(): JSX.Element {
  const {
    state: { notice }
  } = useDash()!;

  return (
    <AppShell navbar={<Sidebar />}>
      {notice.show ? <Notice contentType={notice.type!} /> : <Outlet />}
    </AppShell>
  );
}

export default Layout;
