import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";

function Layout(): JSX.Element {
  return (
    <AppShell>
      <nav>nav</nav>
      <Outlet />
    </AppShell>
  );
}

export default Layout;
