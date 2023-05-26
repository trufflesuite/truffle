import { useState } from "react";
import { useDash } from "src/hooks";
import {
  Continue,
  Into,
  Next,
  Out,
  Over,
  Reset
} from "src/components/composed/Debugger/Controls/icons";
import { Group } from "@mantine/core";
import { selectors as $ } from "@truffle/debugger";
import ControlButton from "src/components/composed/Debugger/Controls/ControlButton";
import type { Session } from "src/components/composed/Debugger/utils";

interface ControlsProps {
  session: Session | null;
  stepEffect: () => void;
}

function Controls({ session, stepEffect }: ControlsProps): JSX.Element {
  const [stepping, setStepping] = useState(false);
  const {
    state: {
      debugger: { breakpoints }
    }
  } = useDash()!;
  const atStart =
    session?.view($.trace.index) === 0 ||
    session?.view($.trace.index) === undefined;
  const atEnd = session?.view($.trace.finished);
  const disabled = atEnd || !session;

  const controlButtonProps = {
    stepEffect,
    stepping,
    setStepping
  };

  const atLeastOneBreakpointSet = Object.values(breakpoints).some(
    breakpointSet => {
      return breakpointSet.size > 0;
    }
  );

  return (
    <Group>
      <ControlButton
        {...controlButtonProps}
        icon={Continue}
        // @ts-ignore
        step={() => session.continueUntilBreakpoint()}
        disabled={disabled || !atLeastOneBreakpointSet}
        tooltipLabel="continue until breakpoint"
      />
      <ControlButton
        {...controlButtonProps}
        icon={Next}
        // @ts-ignore
        step={() => session.stepNext()}
        disabled={disabled}
        tooltipLabel="step next"
      />
      <ControlButton
        {...controlButtonProps}
        icon={Over}
        // @ts-ignore
        step={() => session.stepOver()}
        disabled={disabled}
        tooltipLabel="step over"
      />
      <ControlButton
        {...controlButtonProps}
        icon={Into}
        // @ts-ignore
        step={() => session.stepInto()}
        disabled={disabled}
        tooltipLabel="step into"
      />
      <ControlButton
        {...controlButtonProps}
        icon={Out}
        // @ts-ignore
        step={() => session.stepOut()}
        disabled={disabled}
        tooltipLabel="step out"
      />
      <ControlButton
        {...controlButtonProps}
        icon={Reset}
        // @ts-ignore
        step={() => session.reset()}
        disabled={atStart}
        tooltipLabel="reset"
      />
    </Group>
  );
}

export default Controls;
