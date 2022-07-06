import { AppShell } from "@mantine/core";
import { Outlet } from "react-router-dom";
import Nav from "src/components/Nav";

function Layout(): JSX.Element {
  return (
    <AppShell navbar={<Nav />}>
      <Outlet />
    </AppShell>
  );
}

export default Layout;
