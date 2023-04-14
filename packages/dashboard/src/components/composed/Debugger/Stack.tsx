import { useEffect, useState } from "react";
import type { Session } from "src/utils/debugger";

type StackArgs = {
  session: Session;
  currentStep: string;
};

function Stack({ session, currentStep }: StackArgs): JSX.Element | null {
  const [output, setOutput] = useState<JSX.Element[] | null>(null);
  // when the debugger step changes, update variables
  useEffect(() => {
    async function getStack() {
      const stack = session.view(
        session.selectors.stacktrace.current.callstack
      );
      if (!stack) return;
      const entries = stack.map((stackItem: any, index: number) => {
        const functionNameDisplay =
          stackItem.functionName === undefined
            ? "unknown function"
            : stackItem.functionName;
        return (
          <div className="truffle-debugger-stack-item" key={index}>
            {stackItem.contractName} at {functionNameDisplay} (address{" "}
            {stackItem.address})
          </div>
        );
      });
      setOutput(entries);
    }
    getStack();
  }, [currentStep, session]);

  return (
    <div className="truffle-debugger-stack-container">
      <div className="truffle-debugger-stack">
        <div className="truffle-debugger-section-header">Stack</div>
        <pre>{output ? output : ""}</pre>
      </div>
    </div>
  );
}

export default Stack;
