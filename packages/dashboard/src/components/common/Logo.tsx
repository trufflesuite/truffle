import { Group } from "@mantine/core";
import type { MantineSize } from "@mantine/core";
import LogoImg from "src/components/common/LogoImg";
import LogoText from "src/components/common/LogoText";

type LogoProps = {
  size?: MantineSize;
};

function Logo({ size }: LogoProps): JSX.Element {
  size = size || "sm";

  return (
    <Group position="center" spacing={size}>
      <LogoImg size={size} />
      <LogoText size={size} />
    </Group>
  );
}

export default Logo;
