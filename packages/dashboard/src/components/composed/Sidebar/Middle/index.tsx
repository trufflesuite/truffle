import { Navbar, Badge, Indicator } from "@mantine/core";
import { Zap, Crosshair, Archive, Aperture } from "react-feather";
import NavButton from "src/components/composed/Sidebar/Middle/NavButton";
import { useDash } from "src/hooks";

function Middle(): JSX.Element {
  const {
    state: { providerMessages }
  } = useDash()!;
  const numRequests = providerMessages.size;
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
        label="Signature requests"
        to="/rpcs"
        icon={
          <Indicator
            label={numRequests > 99 ? "99+" : numRequests}
            disabled={numRequests === 0}
            radius="sm"
            size={16}
            offset={-5}
            color="teal"
            inline
            sx={{ transform: "translateY(3.2px)" }}
          >
            <Zap {...featherIconProps} />
          </Indicator>
        }
      />
      <NavButton
        label="Debugger"
        to="/debugger"
        icon={<Crosshair {...featherIconProps} />}
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
