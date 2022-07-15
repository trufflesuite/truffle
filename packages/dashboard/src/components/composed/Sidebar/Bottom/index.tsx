import { Navbar } from "@mantine/core";
import MenuBtn from "src/components/composed/Sidebar/Bottom/MenuBtn";

function Bottom(): JSX.Element {
  return (
    <Navbar.Section py="xl">
      <MenuBtn />
    </Navbar.Section>
  );
}

export default Bottom;
