import type { Session } from "src/components/composed/Debugger/utils";

export function getCurrentSourceRange(session: Session) {
  const { selectors: $ } = session;
  const traceIndex = session.view($.trace.index);
  const { id } = session.view($.sourcemapping.current.source);
  const {
    lines: { start, end }
  } = session.view($.sourcemapping.current.sourceRange);
  return {
    traceIndex,
    source: { id },
    start,
    end
  };
}
