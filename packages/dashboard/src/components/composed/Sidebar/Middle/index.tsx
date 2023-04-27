import { Navbar, Indicator } from "@mantine/core";
import { Zap, Crosshair, Aperture } from "react-feather";
import NavButton from "src/components/composed/Sidebar/Middle/NavButton";
import { useDash } from "src/hooks";

function Middle(): JSX.Element {
  const {
    state: { providerMessages }
  } = useDash()!;
  const numRequests = providerMessages.size;
  const featherIconProps = { size: 18 };

  return (
    <Navbar.Section grow py="sm">
      <NavButton
        label="Signature requests"
        to="/rpcs"
        icon={
          <Indicator
            label={numRequests > 99 ? "99+" : numRequests}
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
