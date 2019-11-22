import debugModule from "debug";
const debug = debugModule("codec:format:utils:circularity");

import * as Format from "@truffle/codec/format/common";

export function tie(untied: Format.Values.Result): Format.Values.Result {
  return tieWithTable(untied, []);
}

function tieWithTable(
  untied: Format.Values.Result,
  seenSoFar: (Format.Values.ArrayValue | Format.Values.StructValue)[]
): Format.Values.Result {
  if (untied.kind === "error") {
    return untied;
  }
  let reference: number;
  switch (untied.type.typeClass) {
    case "array":
      let untiedAsArray = <Format.Values.ArrayValue>untied; //dammit TS
      reference = untiedAsArray.reference;
      if (reference === undefined) {
        //we need to do some pointer stuff here, so let's first create our new
        //object we'll be pointing to
        //[we don't want to alter the original accidentally so let's clone a bit]
        let tied = { ...untiedAsArray, value: [...untiedAsArray.value] };
        //now, we can't use a map here, or we'll screw things up!
        //we want to *mutate* value, not replace it with a new object
        for (let index in tied.value) {
          tied.value[index] = tieWithTable(tied.value[index], [
            tied,
            ...seenSoFar
          ]);
        }
        return tied;
      } else {
        return { ...seenSoFar[reference - 1], reference };
      }
    case "struct":
      let untiedAsStruct = <Format.Values.StructValue>untied; //dammit TS
      reference = untiedAsStruct.reference;
      if (reference === undefined) {
        //we need to do some pointer stuff here, so let's first create our new
        //object we'll be pointing to
        //[we don't want to alter the original accidentally so let's clone a bit]
        let tied = {
          ...untiedAsStruct,
          value: untiedAsStruct.value.map(component => ({ ...component }))
        };
        //now, we can't use a map here, or we'll screw things up!
        //we want to *mutate* value, not replace it with a new object
        for (let index in tied.value) {
          tied.value[index] = {
            ...tied.value[index],
            value: tieWithTable(tied.value[index].value, [tied, ...seenSoFar])
          };
        }
        return tied;
      } else {
        return { ...seenSoFar[reference - 1], reference };
      }
    case "tuple": //currently there are no memory tuples, but may as well
      //can't be circular, just recurse
      //note we can just recurse with a straight tie here; don't need tieWithTable
      let untiedAsTuple = <Format.Values.TupleValue>untied; //dammit TS
      //we need to do some pointer stuff here, so let's first create our new
      //object we'll be pointing to
      let tied = { ...untiedAsTuple };
      tied.value = tied.value.map(component => ({
        ...component,
        value: tie(component.value)
      }));
      return tied;
    default:
      //other types either:
      //1. aren't containers and so need no recursion
      //2. are containers but can't go in or contain memory things
      //and so still need no recursion
      //(or, in the case of mappings, can't contain *nontrivial* memory
      //things)
      return untied;
  }
}
