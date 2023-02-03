import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import { lowlight } from "lowlight/lib/core";
import { solidity } from "highlightjs-solidity";
import { selectors as $ } from "@truffle/debugger";
import type { Session, Source } from "src/utils/debugger";

export function getSources(session: Session) {
  const sourcesView = session.view($.sourcemapping.views.sources);
  return Object.values(sourcesView).flatMap(
    ({ id, sourcePath, source: contents, language }: any) =>
      language === "Solidity" ? [{ id, sourcePath, contents, language }] : []
  );
}

export function getCurrentSourceRange(session: Session) {
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

lowlight.registerLanguage("solidity", solidity);
const processor = unified().use(rehypeStringify);

export function highlightSourceContent(source: Source) {
  const highlighted = lowlight.highlight("solidity", source.contents);
  return processor.stringify(highlighted);
}
