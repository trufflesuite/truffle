import { Navbar, Badge } from "@mantine/core";
import { Zap, Archive, Aperture } from "react-feather";
import NavButton from "src/components/composed/Sidebar/Middle/NavButton";

function Middle(): JSX.Element {
  const featherIconProps = { size: 18 };

  const comingSoonBadge = (
    <Badge
      variant="gradient"
      gradient={{ from: "truffle-teal", to: "pink" }}
      sx={{ opacity: 0.4 }}
    >
      coming soon
    </Badge>
  );

  return (
    <Navbar.Section grow py="sm">
      <NavButton
        label="Signature Requests"
        to="/rpcs"
        icon={<Zap {...featherIconProps} />}
      />
      <NavButton
        label="Contracts"
        to="/contracts"
        icon={<Archive {...featherIconProps} />}
        badge={comingSoonBadge}
        disabled={true}
      />
      {process.env.NODE_ENV === "development" && (
        <NavButton
          label="Colors"
          to="/colors"
          icon={<Aperture {...featherIconProps} />}
        />
      )}
    </Navbar.Section>
  );
}

export default Middle;
