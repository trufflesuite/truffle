import { Parameter, FunctionEntry, ErrorEntry, EventEntry } from "./types";

export function parseFunctionSignature(signature: string): FunctionEntry {
  const { name, inputs } = parseSignature(signature);
  return {
    type: "function" as const,
    name,
    inputs,
    outputs: [] as Parameter[],
    stateMutability: "nonpayable" as const
  };
}

export function parseErrorSignature(signature: string): ErrorEntry {
  const { name, inputs } = parseSignature(signature);
  return {
    type: "error" as const,
    name,
    inputs
  };
}

export function parseEventSignature(signature: string): EventEntry {
  const { name, inputs } = parseSignature(signature);
  return {
    type: "event" as const,
    name,
    inputs: inputs.map(parameter => ({ ...parameter, indexed: false })),
    anonymous: false
  };
}

export function parseSignature(signature: string): {
  name: string;
  inputs: Parameter[];
} {
  let openParenIndex = signature.indexOf("(");
  if (openParenIndex === -1) {
    openParenIndex = signature.length; //set to end of string if not found
  }
  const parameterList = signature.slice(openParenIndex);
  const name = signature.slice(0, openParenIndex);
  const inputs = parseParameterList(parameterList);
  return {
    name,
    inputs
  };
}

export function parseParameterList(parameterList: string): Parameter[] {
  const { parameters, remaining } =
    parseParameterListWithRemainder(parameterList);
  if (remaining !== "") {
    throw new Error(`Parameter list had extra text ${remaining} afterwards`);
  }
  return parameters;
}

function parseParameterListWithRemainder(parameterList: string): {
  parameters: Parameter[];
  remaining: string;
} {
  if (parameterList === "") {
    throw new Error("Parameter list is missing");
  }
  if (parameterList[0] !== "(") {
    throw new Error(
      `Parameter list ${parameterList} doesn't begin with parenthesis"`
    );
  }
  if (parameterList[1] === ")") {
    //due to the appraoch we take below, we need to handle the case of an empty
    //parameter list as a special case.  a more proper parser wouldn't need to do
    //this, but, this is easier. :P
    return { parameters: [], remaining: parameterList.slice(2) };
  }
  let remaining = parameterList.slice(1); //cut off opening parenthesis
  let parameters: Parameter[] = [];
  //now: we process parameters one by one.  note we CANNOT split on comma!!
  //that approach will break down if there are any tuples.
  while (true) {
    if (remaining[0] === "(") {
      //tuple or tuple array case
      let components: Parameter[];
      ({ parameters: components, remaining } =
        parseParameterListWithRemainder(remaining));
      //now we have the components, but there might be an array suffix
      //copypaste warning, this is copypasted from the simple case below!
      const match = remaining.match(/[,)]/); //find next comma or close paren
      const nextTerminatorIndex = match?.index;
      if (nextTerminatorIndex === undefined) {
        //if there is none, throw
        throw new Error("Unmatched open parenthesis");
      }
      const final = remaining[nextTerminatorIndex] === ")";
      const arraySuffix = remaining.slice(0, nextTerminatorIndex);
      if (!arraySuffix.match(/(\[\d*\])*/)) {
        //here at least it's pretty straightforward to check whether the array
        //suffix is valid or not
        throw new Error(`Invalid array suffix ${arraySuffix}`);
      }
      parameters.push({
        name: "",
        type: "tuple" + arraySuffix,
        components
      });
      remaining = remaining.slice(nextTerminatorIndex + 1);
      if (final) {
        //if we hit a ")", close this group
        return { parameters, remaining };
      }
    } else {
      //simple case (including arrays w/o tuples)
      const match = remaining.match(/[,)]/); //find next comma or close paren
      const nextTerminatorIndex = match?.index;
      if (nextTerminatorIndex === undefined) {
        //if there is none, throw
        throw new Error("Unmatched open parenthesis");
      }
      const final = remaining[nextTerminatorIndex] === ")";
      const parameterString = remaining.slice(0, nextTerminatorIndex);
      if (!parameterString.match(/[a-zA-Z]([a-zA-Z\d])*(\[\d*\])*/)) {
        //we're not going to try to fully validate the type here...
        //we're just going to check that it looks vaguely correct, sorry
        throw new Error(`Malformed type ${parameterString}`);
      }
      parameters.push({
        name: "",
        type: parameterString
      });
      remaining = remaining.slice(nextTerminatorIndex + 1);
      if (final) {
        //if we hit a ")", close this group
        return { parameters, remaining };
      }
    }
  }
}
