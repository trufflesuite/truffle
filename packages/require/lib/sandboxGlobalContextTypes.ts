import type TruffleConfig from "@truffle/config";
import type Resolver from "@truffle/resolver";

export {};

declare global {
  const config: TruffleConfig;
  const artifacts: Resolver;
}
