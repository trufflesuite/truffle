import { Navbar } from "@mantine/core";
import MenuButton from "src/components/composed/Sidebar/Bottom/MenuButton";

function Bottom(): JSX.Element {
  return (
    <Navbar.Section py="xl">
      <MenuButton />
    </Navbar.Section>
  );
}

export default Bottom;
