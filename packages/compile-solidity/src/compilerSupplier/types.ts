export type StrategyOptions = {
  version?: string;
  docker?: boolean;
  compilerRoots?: string[];
  dockerTagsUrl?: string;
  events?: any; // represents a @truffle/events instance, which lacks types
  spawn?: {
    maxBuffer: number;
  };
};
