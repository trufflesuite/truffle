// Forked type definitions from DefinitelyTyped
// (@types/event-hooks-webpack-plugin@2.2.2)
//
// Original banner:
// Type definitions for event-hooks-webpack-plugin 2.2
// Project: https://github.com/cascornelissen/event-hooks-webpack-plugin
// Definitions by: Pine Mizune <https://github.com/pine>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7
declare module "event-hooks-webpack-plugin" {
  import { Compiler, WebpackPluginInstance } from "webpack";
  import { SyncHook, AsyncHook } from "tapable";

  export = EventHooksPlugin;

  type Hooks = Compiler["hooks"];
  type HookNames = keyof Hooks;
  type SyncHookNames = {
    [Property in HookNames]: Hooks[Property] extends SyncHook<any, any>
      ? Property
      : never;
  }[HookNames];
  type AsyncHookNames = {
    [Property in HookNames]: Hooks[Property] extends AsyncHook<any, any>
      ? Property
      : never;
  }[HookNames];
  type SyncHookFunctions = {
    [Property in SyncHookNames]: Hooks[Property]["call"];
  };
  type AsyncHookCallbackFunctions = {
    [Property in AsyncHookNames]: Hooks[Property]["callAsync"];
  };
  type AsyncHookPromiseFunctions = {
    [Property in AsyncHookNames]: Hooks[Property]["promise"];
  };

  namespace EventHooksPlugin {
    type SyncEventHookTask<T> = {
      tap: "tap";
      task: T;
    };
    type CallbackEventHookTask<T> = {
      tap: "tapAsync";
      task: T;
    };

    type PromiseEventHookTask<T> = {
      tap: "tapPromise";
      task: T;
    };

    type SyncHookOptions = {
      [Property in keyof SyncHookFunctions]?:
        | SyncEventHookTask<SyncHookFunctions[Property]>
        | SyncEventHookTask<SyncHookFunctions[Property]>[]
        | SyncHookFunctions[Property]
        | SyncHookFunctions[Property][];
    };

    type AsyncHookCallbackOptions = {
      [Property in keyof AsyncHookCallbackFunctions]?:
        | CallbackEventHookTask<AsyncHookCallbackFunctions[Property]>
        | CallbackEventHookTask<AsyncHookCallbackFunctions[Property]>[];
    };

    type AsyncHookPromiseOptions = {
      [Property in keyof AsyncHookPromiseFunctions]?:
        | PromiseEventHookTask<AsyncHookPromiseFunctions[Property]>
        | PromiseEventHookTask<AsyncHookPromiseFunctions[Property]>[];
    };

    type Options =
      | SyncHookOptions
      | AsyncHookCallbackOptions
      | AsyncHookPromiseOptions;
  }

  /**
   * This webpack plugin is similar to `webpack-shell-plugin`
   * but this allows you to execute arbitrary JavaScriptinstead of commands on any event hook that is exposed by the Webpack compile
   */
  class EventHooksPlugin implements WebpackPluginInstance {
    constructor(options?: EventHooksPlugin.Options);
    apply(compiler: Compiler): void;
  }
}
