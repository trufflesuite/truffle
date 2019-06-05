export interface CalldataDecoding {
  kind: "function" | "constructor" | "fallback" | "unknown";
  name?: string; //included only if function
  arguments?: { //included only if function or constructor
    [name: string]: Values.Value;
  }
}

export interface EventDecoding {
  kind: "event" | "anonymous" | "unknown";
  name?: string; //included only if event
  arguments?: EventDecodingArgument[]; //included only if event
}

export interface EventDecodingArgument {
  name?: string;
  value: Values.Value;
}
