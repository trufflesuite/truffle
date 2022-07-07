import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import Sidebar from "src/components/Sidebar";

function Layout(): JSX.Element {
  return (
    <AppShell navbar={<Sidebar />}>
      <Outlet />
    </AppShell>
  );
}

export default Layout;
