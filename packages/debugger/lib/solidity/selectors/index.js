import debugModule from "debug";
const debug = debugModule("debugger:solidity:selectors");

import { createSelectorTree, createLeaf } from "reselect-tree";
import SolidityUtils from "@truffle/solidity-utils";

import semver from "semver";
import flatten from "lodash.flatten";

import evm from "lib/evm/selectors";
import trace from "lib/trace/selectors";

function contextRequiresPhantomStackframes(context) {
  debug("context: %O", context);
  return (
    context.compiler !== undefined && //(do NOT just put context.compiler here,
    //we need this to be a boolean, not undefined, because it gets put in the state)
    semver.satisfies(context.compiler.version, ">=0.5.1", {
      includePrerelease: true
    }) &&
    !context.isConstructor //constructors should not get a phantom stackframe!
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
      //HACK: we use solidity.current.instructionAtProgramCounter
      //even if we're looking at solidity.next.
      //This is harmless... so long as the current instruction isn't a context
      //change.  So, don't use solidity.next when it is.

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

      (sources, { file: id }) => (sources ? sources[id] || {} : {})
    ),

    /**
     * HACK... you get the idea
     */
    findOverlappingRange: createLeaf(
      ["./source", "/current/overlapFunctions"],
      ({ id }, functions) => (functions || {})[id]
    ),

    /**
     * .sourceRange
     */
    sourceRange: createLeaf(["./instruction"], SolidityUtils.getSourceRange),

    /**
     * .pointerAndNode
     */
    pointerAndNode: createLeaf(
      ["./findOverlappingRange", "./sourceRange"],

      (findOverlappingRange, range) =>
        findOverlappingRange
          ? SolidityUtils.findRange(
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

let solidity = createSelectorTree({
  /**
   * solidity.state
   */
  state: state => state.solidity,

  /**
   * solidity.info
   */
  info: {
    /**
     * solidity.info.sources
     * NOTE: grouped by compilation!
     * [and then split into user and internal, and then...]
     */
    sources: createLeaf(["/state"], state => state.info.sources.byCompilationId)
  },

  /**
   * solidity.transaction
   */
  transaction: {
    /**
     * solidity.transaction.bottomStackframeRequiresPhantomFrame
     */
    bottomStackframeRequiresPhantomFrame: createLeaf(
      [evm.transaction.startingContext],
      contextRequiresPhantomStackframes
    )
  },

  /**
   * solidity.current
   */
  current: {
    /**
     * solidity.current.sources
     * This takes the place of the old solidity.info.sources,
     * returning only the sources for the current compilation and context.
     */
    sources: createLeaf(
      ["/info/sources", evm.current.context],
      (sources, context) => {
        if (!context) {
          debug("no context");
          return null; //no tx loaded, return null
        }

        const { compilationId, context: contextHash } = context;
        debug("compilationId: %o", compilationId);

        if (!compilationId || !sources[compilationId]) {
          debug("no valid compilation");
          return []; //unknown compilation, return no sources
        }

        const userSources = (sources[compilationId].userSources || { byId: [] })
          .byId;
        debug("user sources: %o", userSources);
        const internalSources =
          (
            (sources[compilationId].internalSources || { byContext: {} })
              .byContext[contextHash] || {}
          ).byId || [];
        debug("internal sources: %o", internalSources);
        //we assign to [] rather than {} because we want the result to be an array
        return Object.assign([], userSources, internalSources);
      }
    ),

    /**
     * solidity.current.sourceMap
     */
    sourceMap: createLeaf(
      [evm.current.context],

      context => (context ? context.sourceMap : null) //null when no tx loaded
    ),

    /**
     * solidity.current.humanReadableSourceMap
     */
    humanReadableSourceMap: createLeaf(["./sourceMap"], sourceMap =>
      sourceMap ? SolidityUtils.getHumanReadableSourceMap(sourceMap) : null
    ),

    /**
     * solidity.current.functionDepthStack
     */
    functionDepthStack: state => state.solidity.proc.functionDepthStack,

    /**
     * solidity.current.nextFrameIsPhantom
     */
    nextFrameIsPhantom: state => state.solidity.proc.nextFrameIsPhantom,

    /**
     * solidity.current.functionDepth
     */
    functionDepth: createLeaf(
      ["./functionDepthStack"],
      stack => stack[stack.length - 1]
    ),

    /**
     * solidity.current.callRequiresPhantomFrame
     */
    callRequiresPhantomFrame: createLeaf(
      [evm.current.context],
      contextRequiresPhantomStackframes
    ),

    /**
     * solidity.current.instructions
     */
    instructions: createLeaf(
      ["./sources", evm.current.context, "./humanReadableSourceMap"],

      (sources, context, sourceMap) => {
        if (!context) {
          return [];
        }

        return SolidityUtils.getProcessedInstructionsForBinary(
          (sources || []).map(({ source }) => source),
          context.binary,
          sourceMap
        );
      }
    ),

    /**
     * solidity.current.instructionAtProgramCounter
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
     * solidity.current.isSourceRangeFinal
     */
    isSourceRangeFinal: createLeaf(
      [
        "./instructionAtProgramCounter",
        evm.current.step.programCounter,
        evm.next.step.programCounter
      ],

      (map, current, next) => {
        if (!map[next]) {
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

    /*
     * solidity.current.functionsByProgramCounter
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
        SolidityUtils.getFunctionsByProgramCounter(
          instructions,
          sources.map(({ ast }) => ast),
          functions,
          compilationId
        )
    ),

    /**
     * solidity.current.isMultiline
     */
    isMultiline: createLeaf(
      ["./sourceRange"],

      ({ lines }) => lines.start.line != lines.end.line
    ),

    /**
     * solidity.current.willJump
     */
    willJump: createLeaf([evm.current.step.isJump], isJump => isJump),

    /**
     * solidity.current.jumpDirection
     */
    jumpDirection: createLeaf(["./instruction"], (i = {}) => i.jump || "-"),

    /**
     * solidity.current.willCall
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
     * solidity.current.willReturn
     *
     * covers both normal returns & failures
     */
    willReturn: createLeaf(
      [evm.current.step.isHalting],
      isHalting => isHalting
    ),

    /**
     * solidity.current.nextUserStep
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
     * solidity.current.overlapFunctions
     * like solidity.views.overlapFunctions, but just returns
     * an array appropriate to the current context
     */
    overlapFunctions: createLeaf(
      ["/views/overlapFunctions", evm.current.context],
      (functions, context) => {
        //NOTE: yeah, I copypasted here from solidity.current.sources; maybe factor this
        if (!context) {
          return null; //no tx loaded, return null
        }

        const { compilationId, context: contextHash } = context;

        if (!compilationId || !functions[compilationId]) {
          return []; //unknown compilation, return no sources
        }

        const userFunctions = functions[compilationId].user || [];
        const internalFunctions =
          (functions[compilationId].internal || {})[contextHash] || [];
        //we assign to [] rather than {} because we want the result to be an array
        return Object.assign([], userFunctions, internalFunctions);
      }
    )
  },

  /**
   * solidity.next
   * HACK WARNING: do not use these selectors when the current instruction is a
   * context change! (evm call or evm return)
   */
  next: createMultistepSelectors(evm.next.step),

  /**
   * solidity.views
   */
  views: {
    /**
     * solidity.views.flattenedSources
     * all the sources just flattened into a single array
     */
    flattenedSources: createLeaf(["/info/sources"], compilations =>
      flatten(
        Object.values(
          compilations
        ).map(
          ({
            userSources: { byId: userSources },
            internalSources: { byContext: internalSources }
          }) =>
            userSources.concat(
              ...Object.values(internalSources).map(
                ({ byId: source }) => source
              )
            )
        )
      ).filter(source => source)
    ),

    /**
     * solidity.views.overlapFunctions
     * grouped by compilation [then by context for internal ones]
     */
    overlapFunctions: createLeaf(["/info/sources"], compilations =>
      Object.assign(
        {},
        ...Object.entries(compilations).map(
          ([
            compilationId,
            {
              userSources: { byId: userSources },
              internalSources: { byContext: internalSources }
            }
          ]) => ({
            [compilationId]: {
              user: userSources.map(({ ast }) =>
                SolidityUtils.makeOverlapFunction(ast)
              ),
              internal: Object.assign(
                {},
                ...Object.entries(internalSources).map(
                  ([context, { byId: contextSources }]) => ({
                    [context]: contextSources.map(({ ast }) =>
                      SolidityUtils.makeOverlapFunction(ast)
                    )
                  })
                )
              )
            }
          })
        )
      )
    )
  }
});

export default solidity;
