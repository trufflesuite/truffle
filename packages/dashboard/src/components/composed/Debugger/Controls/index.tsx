import { useState } from "react";
import {
  Play,
  SkipForward,
  FastForward,
  Download,
  Upload,
  RotateCcw
} from "react-feather";
import { Group } from "@mantine/core";
import { selectors as $ } from "@truffle/debugger";
import ControlButton from "src/components/composed/Debugger/Controls/ControlButton";
import type { Session } from "src/utils/debugger";

interface ControlsProps {
  session: Session;
  stepEffect: () => void;
}

function Controls({ session, stepEffect }: ControlsProps): JSX.Element {
  const [stepping, setStepping] = useState(false);
  const atStart = session.view($.trace.index) === 0;
  const atEnd = session.view($.trace.finished);

  const status = stepping
    ? "stepping..."
    : atStart
    ? "transaction start"
    : atEnd
    ? "transaction end"
    : "transaction in progress";

  const controlButtonProps = {
    stepEffect,
    stepping,
    setStepping
  };

  return (
    <Group>
      <ControlButton
        {...controlButtonProps}
        icon={Play}
        step={() => session.continueUntilBreakpoint()}
        disabled={atEnd}
      />
      <ControlButton
        {...controlButtonProps}
        icon={SkipForward}
        step={() => session.stepNext()}
        disabled={atEnd}
      />
      <ControlButton
        {...controlButtonProps}
        icon={FastForward}
        step={() => session.stepOver()}
        disabled={atEnd}
      />
      <ControlButton
        {...controlButtonProps}
        icon={Download}
        step={() => session.stepInto()}
        disabled={atEnd}
      />
      <ControlButton
        {...controlButtonProps}
        icon={Upload}
        step={() => session.stepOut()}
        disabled={atEnd}
      />
      <ControlButton
        {...controlButtonProps}
        icon={RotateCcw}
        step={() => session.reset()}
        disabled={atStart}
      />
      {status}
    </Group>
  );
}

export default Controls;
