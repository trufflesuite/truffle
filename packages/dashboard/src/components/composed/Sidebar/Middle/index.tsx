import { Navbar } from "@mantine/core";
import NavBtn from "src/components/composed/Sidebar/Middle/NavBtn";

function Middle(): JSX.Element {
  return (
    <Navbar.Section grow py="sm">
      <NavBtn label="Transactions" to="/txs" />
      <NavBtn label="Contracts" to="/contracts" />
    </Navbar.Section>
  );
}

export default Middle;
