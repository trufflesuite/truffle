import { Link } from "react-router-dom";
import { UnstyledButton, Text } from "@mantine/core";

type NavBtnProps = {
  to: string;
  label?: string;
};

function NavBtn({ to, label }: NavBtnProps): JSX.Element {
  return (
    <UnstyledButton
      component={Link}
      to={to}
      px="lg"
      py="md"
      sx={theme => ({
        display: "block",
        borderRadius: theme.radius.sm,
        "&:hover": {
          backgroundColor:
            theme.colorScheme === "dark"
              ? theme.colors.dark[6]
              : theme.colors.gray[1]
        }
      })}
    >
      <Text>{label}</Text>
    </UnstyledButton>
  );
}

export default NavBtn;
