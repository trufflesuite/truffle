import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import Sidebar from "src/components/composed/Sidebar";

function Layout(): JSX.Element {
  return (
    <AppShell navbar={<Sidebar />}>
      <Outlet />
    </AppShell>
  );
}

export default Layout;
