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
        return (
          <div className="truffle-debugger-stack-item" key={index}>
            {stackItem.contractName} at {stackItem.functionName} (address{" "}
            {stackItem.address})
          </div>
        );
      });
      setOutput(entries);
    }
    getStack();
  }, [currentStep, session]);

  return (
    <div className="truffle-debugger-variables">
      <h2>stack</h2>
      <pre>{output ? output : ""}</pre>
    </div>
  );
}

export default Stack;
