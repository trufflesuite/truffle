export interface CalldataDecoding {
  kind: "function" | "constructor" | "fallback" | "unknown";
  name?: string; //included only if function
  arguments?: AbiArgument[]; //included only if function or constructor
}

export interface EventDecoding {
  kind: "event" | "anonymous" | "unknown";
  name?: string; //included only if event
  arguments?: AbiArgument[]; //included only if event
}

export interface AbiArgument {
  name?: string; //included if parameter is named
  value: Values.Result;
}
