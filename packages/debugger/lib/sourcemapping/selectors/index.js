import debugModule from "debug";
const debug = debugModule("debugger:sourcemapping:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import SourceMapUtils from "@truffle/source-map-utils";
import * as Codec from "@truffle/codec";

import semver from "semver";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";

function contextRequiresPhantomStackframes(context, data) {
  debug("context: %O", context);
  debug("data: %O", data);
  const selector = data
    .slice(0, 2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE)
    .padEnd(2 + 2 * Codec.Evm.Utils.SELECTOR_SIZE, "00");
  const hasFallbackOrReceive = (context.abi || []).some(
    abiEntry => abiEntry.type === "fallback" || abiEntry.type === "receive"
  );
  return (
    context.primaryLanguage === "Solidity" && //do not use phantom frames for Yul or Vyper!
    context.compiler !== undefined && //(do NOT just put context.compiler here,
    //we need this to be a boolean, not undefined, because it gets put in the state)
    context.compiler.name === "solc" && //this check is possibly redundant now but I'll keep it in
    semver.satisfies(context.compiler.version, ">=0.5.1", {
      includePrerelease: true
    }) &&
    !context.isConstructor && //constructors should not get a phantom stackframe!
    (!hasFallbackOrReceive || //if there's no fallback or receive, we don't apply the
      //fallback/receive check on the next line; this is to solve a problem with libraries,
      //because libraries don't always have a reliable ABI we can use for our purposes here.
      //fortunately, since libraries don't have fallbacks or receives, the condition isn't
      //relevant to them anyway!
      (context.abi || []).some(
        abiEntry =>
          abiEntry.type === "function" &&
          Codec.AbiData.Utils.abiSelector(abiEntry) === selector //fallback & receive should not get phantom
      ))
  );
}

//function to create selectors that need both a current and next version
function createMultistepSelectors(stepSelector) {
  return {
    /**
     * .instruction
     */
    instruction: createLeaf(
      ["/current/instructionAtProgramCounter", stepSelector.programCounter],
      //HACK: we use sourcemapping.current.instructionAtProgramCounter
      //even if we're looking at sourcemapping.next.
      //This is harmless... so long as the current instruction isn't a context
      //change.  So, don't use sourcemapping.next when it is.

      (map, pc) => map[pc] || {}
    ),

    /**
     * .modifierDepth
     */
    modifierDepth: createLeaf(
      ["./instruction"],
      instruction => instruction.modifierDepth
    ),

    /**
     * .source
     */
    source: createLeaf(
      //HACK: same hack as with instruction (we use current sources).
      //but I don't need to give the same warning twice.
      ["/current/sources", "./instruction"],

      (sources, { file: index }) => (sources ? sources[index] || {} : {})
    ),

    /**
     * HACK... you get the idea
     */
    findOverlappingRange: createLeaf(
      ["./source", "/current/overlapFunctions"],
      ({ index }, functions) => (functions || {})[index]
    ),

    /**
     * .sourceRange
     */
    sourceRange: createLeaf(["./instruction"], SourceMapUtils.getSourceRange),

    /**
     * .pointerAndNode
     */
    pointerAndNode: createLeaf(
      ["./findOverlappingRange", "./sourceRange"],

      (findOverlappingRange, range) =>
        findOverlappingRange
          ? SourceMapUtils.findRange(
              findOverlappingRange,
              range.start,
              range.length
            )
          : null
    ),

    /**
     * .pointer
     */
    pointer: createLeaf(
      ["./pointerAndNode"],

      pointerAndNode => (pointerAndNode ? pointerAndNode.pointer : null)
    ),

    /**
     * .node
     */
    node: createLeaf(
      ["./source", "./pointerAndNode"],

      ({ ast }, pointerAndNode) => (pointerAndNode ? pointerAndNode.node : ast)
    )
  };
}

let sourcemapping = createSelectorTree({
  /**
   * sourcemapping.state
   */
  state: state => state.sourcemapping,

  /**
   * sourcemapping.info
   */
  info: {
    /**
     * sourcemapping.info.sources
     */
    sources: createLeaf(["/state"], state => state.info.sources)
  },

  /**
   * sourcemapping.transaction
   */
  transaction: {
    /**
     * sourcemapping.transaction.bottomStackframeRequiresPhantomFrame
     */
    bottomStackframeRequiresPhantomFrame: createLeaf(
      [
        evm.transaction.startingContext,
        evm.current.callstack //only getting bottom frame so this is tx-level in this context
      ],
      (context, callstack) =>
        contextRequiresPhantomStackframes(context, callstack[0].data)
    )
  },

  /**
   * sourcemapping.current
   */
  current: {
    /**
     * sourcemapping.current.sourceIds
     * like sourcemapping.current.sources, but just has the IDs, not the sources
     */
    sourceIds: createLeaf(
      ["/info/sources", evm.current.context],
      (sources, context) => {
        if (!context) {
          debug("no context");
          return null; //no tx loaded, return null
        }

        const { compilationId, context: contextHash } = context;
        debug("compilationId: %o", compilationId);

        let userSources = [];
        let internalSources = [];

        if (compilationId && sources.byCompilationId[compilationId]) {
          userSources = sources.byCompilationId[compilationId].byIndex;
        }

        if (sources.byContext[contextHash]) {
          internalSources = sources.byContext[contextHash].byIndex;
        }

        //we assign to [] rather than {} because we want the result to be an array
        return Object.assign([], userSources, internalSources);
      }
    ),

    /**
     * sourcemapping.current.sources
     * This takes the place of the old sourcemapping.info.sources,
     * returning only the sources for the current compilation and context.
     */
    sources: createLeaf(
      ["/views/sources", "/current/sourceIds"],
      (allSources, ids) => (ids ? ids.map(id => allSources[id]) : null)
    ),

    /**
     * sourcemapping.current.sourceMap
     */
    sourceMap: createLeaf(
      [evm.current.context],

      context => (context ? context.sourceMap : null) //null when no tx loaded
    ),

    /**
     * sourcemapping.current.humanReadableSourceMap
     */
    humanReadableSourceMap: createLeaf(["./sourceMap"], sourceMap =>
      sourceMap ? SourceMapUtils.getHumanReadableSourceMap(sourceMap) : null
    ),

    /**
     * sourcemapping.current.functionDepthStack
     */
    functionDepthStack: state => state.sourcemapping.proc.functionDepthStack,

    /**
     * sourcemapping.current.nextFrameIsPhantom
     */
    nextFrameIsPhantom: state => state.sourcemapping.proc.nextFrameIsPhantom,

    /**
     * sourcemapping.current.functionDepth
     */
    functionDepth: createLeaf(
      ["./functionDepthStack"],
      stack => stack[stack.length - 1]
    ),

    /**
     * sourcemapping.current.callRequiresPhantomFrame
     */
    callRequiresPhantomFrame: createLeaf(
      [evm.current.step.callContext, evm.current.step.callData],
      contextRequiresPhantomStackframes
    ),

    /**
     * sourcemapping.current.instructions
     */
    instructions: createLeaf(
      ["./sources", evm.current.context, "./humanReadableSourceMap"],

      (sources, context, sourceMap) => {
        if (!context) {
          return [];
        }

        debug("sources before processing: %O", sources);
        return SourceMapUtils.getProcessedInstructionsForBinary(
          (sources || []).map(source => (source ? source.source : undefined)),
          context.binary,
          sourceMap
        );
      }
    ),

    /**
     * sourcemapping.current.instructionAtProgramCounter
     */
    instructionAtProgramCounter: createLeaf(
      ["./instructions"],

      instructions =>
        Object.assign(
          {},
          ...instructions.map(instruction => ({
            [instruction.pc]: instruction
          }))
        )
    ),

    ...createMultistepSelectors(evm.current.step),

    /**
     * sourcemapping.current.isSourceRangeFinalRaw
     * the old version; doesn't account for internal-source problems
     */
    isSourceRangeFinalRaw: createLeaf(
      [
        "./instructionAtProgramCounter",
        evm.current.step.programCounter,
        evm.next.step.programCounter,
        evm.current.step.isContextChange
      ],

      (map, current, next, changesContext) => {
        if (changesContext || !map[next]) {
          return true;
        }

        current = map[current];
        next = map[next];

        return (
          current.start != next.start ||
          current.length != next.length ||
          current.file != next.file
        );
      }
    ),

    /**
     * sourcemapping.current.isSourceRangeFinal
     * if there's no context change, then don't return final
     * on jumping from a user source to an internal source
     */
    isSourceRangeFinal: createLeaf(
      [
        "./isSourceRangeFinalRaw",
        "./source",
        "/next/source",
        evm.current.step.isContextChange
      ],

      (isFinal, currentSource, nextSource, changesContext) => {
        return (
          changesContext ||
          (isFinal && (currentSource.internal || !nextSource.internal))
        );
      }
    ),

    /*
     * sourcemapping.current.functionsByProgramCounter
     */
    functionsByProgramCounter: createLeaf(
      [
        "./instructions",
        "./sources",
        "./overlapFunctions",
        evm.current.context
      ],
      (instructions, sources, functions, { compilationId }) =>
        //note: we can skip an explicit null check on sources here because
        //if sources is null then instructions = [] so the problematic map
        //never occurs
        SourceMapUtils.getFunctionsByProgramCounter(
          instructions,
          sources.map(({ ast }) => ast),
          functions,
          compilationId
        )
    ),

    /**
     * sourcemapping.current.isMultiline
     */
    isMultiline: createLeaf(
      ["./sourceRange"],

      ({ lines }) => lines.start.line != lines.end.line
    ),

    /**
     * sourcemapping.current.willJump
     */
    willJump: createLeaf([evm.current.step.isJump], isJump => isJump),

    /**
     * sourcemapping.current.jumpDirection
     */
    jumpDirection: createLeaf(["./instruction"], (i = {}) => i.jump || "-"),

    /**
     * sourcemapping.current.willCall
     * note: includes creations, does *not* include instareturns
     */
    willCall: createLeaf(
      [
        evm.current.step.isCall,
        evm.current.step.isCreate,
        evm.current.step.isInstantCallOrCreate
      ],
      (isCall, isCreate, isInstant) => (isCall || isCreate) && !isInstant
    ),

    /**
     * sourcemapping.current.willReturn
     *
     * covers both normal returns & failures
     */
    willReturn: createLeaf(
      [evm.current.step.isHalting],
      isHalting => isHalting
    ),

    /**
     * sourcemapping.current.nextUserStep
     * returns the next trace step after this one which is sourcemapped to
     * a user source (not -1 or an internal source)
     * HACK: this assumes we're not about to change context! don't use this if
     * we are!
     * ALSO, this may return undefined, so be prepared for that
     */
    nextUserStep: createLeaf(
      [
        "./instructionAtProgramCounter",
        "/current/sources",
        trace.steps,
        trace.index
      ],
      (map, sources, steps, index) =>
        steps
          .slice(index + 1)
          .find(
            ({ pc }) =>
              map[pc] &&
              map[pc].file !== -1 &&
              !(sources[map[pc].file] && sources[map[pc].file].internal)
          )
    ),

    /**
     * sourcemapping.current.overlapFunctions
     * like sourcemapping.views.overlapFunctions, but just returns
     * an array appropriate to the current context (like sourcemapping.current.sources)
     */
    overlapFunctions: createLeaf(
      ["/views/overlapFunctions", "/current/sourceIds"],
      (functions, ids) => (ids ? ids.map(id => functions[id]) : null)
    )
  },

  /**
   * sourcemapping.next
   * HACK WARNING: do not use these selectors when the current instruction is a
   * context change! (evm call or evm return)
   */
  next: createMultistepSelectors(evm.next.step),

  /**
   * sourcemapping.views
   */
  views: {
    /**
     * sourcemapping.views.sources
     * just the byId part of sourcemapping.info.sources
     * (effectively flattening them)
     */
    sources: createLeaf(["/info/sources"], sources => sources.byId),

    /**
     * sourcemapping.views.overlapFunctions
     * organized by source ID
     */
    overlapFunctions: createLeaf(["/views/sources"], sources =>
      Object.assign(
        {},
        ...Object.entries(sources).map(([id, { ast }]) => ({
          [id]: SourceMapUtils.makeOverlapFunction(ast)
        }))
      )
    )
  }
});

export default sourcemapping;
