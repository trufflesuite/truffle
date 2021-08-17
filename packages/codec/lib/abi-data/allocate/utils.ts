import debugModule from "debug";
const debug = debugModule("codec:abi-data:allocate:utils");

import type {
  ContractAllocationInfo,
  ContractAndContexts
} from "./types";
import * as Compilations from "@truffle/codec/compilations";
import { Shims } from "@truffle/compile-common";
import type * as Ast from "@truffle/codec/ast";
import * as Contexts from "@truffle/codec/contexts";
import * as Abi from "@truffle/abi-utils";

export interface ContextAndAllocationInfo {
  contexts: Contexts.Contexts;
  deployedContexts: Contexts.Contexts;
  contractsAndContexts: ContractAndContexts[];
  allocationInfo: ContractAllocationInfo[];
}

export function collectAllocationInfo(
  compilations: Compilations.Compilation[]
): ContextAndAllocationInfo {
  let contexts: Contexts.Contexts = {};
  let deployedContexts: Contexts.Contexts = {};
  let contractsAndContexts: ContractAndContexts[] = [];
  for (const compilation of compilations) {
    for (const contract of compilation.contracts) {
      const node: Ast.AstNode = Compilations.Utils.getContractNode(
        contract,
        compilation
      );
      let deployedContext: Contexts.Context | undefined = undefined;
      let constructorContext: Contexts.Context | undefined = undefined;
      const deployedBytecode = Shims.NewToLegacy.forBytecode(
        contract.deployedBytecode
      );
      const bytecode = Shims.NewToLegacy.forBytecode(contract.bytecode);
      if (deployedBytecode && deployedBytecode !== "0x") {
        deployedContext = Contexts.Utils.makeContext(
          contract,
          node,
          compilation
        );
        contexts[deployedContext.context] = deployedContext;
        //note that we don't set up deployedContexts until after normalization!
      }
      if (bytecode && bytecode !== "0x") {
        constructorContext = Contexts.Utils.makeContext(
          contract,
          node,
          compilation,
          true
        );
        contexts[constructorContext.context] = constructorContext;
      }
      contractsAndContexts.push({
        contract,
        node,
        deployedContext,
        constructorContext,
        compilationId: compilation.id
      });
    }
  }
  debug("known contexts: %o", Object.keys(contexts));

  contexts = Contexts.Utils.normalizeContexts(contexts);
  deployedContexts = Object.assign(
    {},
    ...Object.values(contexts).map(context =>
      !context.isConstructor ? { [context.context]: context } : {}
    )
  );

  for (const contractAndContexts of contractsAndContexts) {
    //change everything to normalized version
    if (contractAndContexts.deployedContext) {
      contractAndContexts.deployedContext =
        contexts[contractAndContexts.deployedContext.context]; //get normalized version
    }
    if (contractAndContexts.constructorContext) {
      contractAndContexts.constructorContext =
        contexts[contractAndContexts.constructorContext.context]; //get normalized version
    }
  }

  const allocationInfo: ContractAllocationInfo[] = contractsAndContexts.map(
    ({
      contract: { abi, compiler, immutableReferences },
      compilationId,
      node,
      deployedContext,
      constructorContext
    }) => ({
      abi: Abi.normalize(abi),
      compilationId,
      compiler,
      contractNode: node,
      deployedContext,
      constructorContext,
      immutableReferences
    })
  );

  return {
    contexts,
    deployedContexts,
    contractsAndContexts,
    allocationInfo
  };
}
