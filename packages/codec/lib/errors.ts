import * as Format from "@truffle/codec/format";

//For when we need to throw an error, here's a wrapper class that extends Error.
//Apologies about the confusing name, but I wanted something that would make
//sense should it not be caught and thus accidentally exposed to the outside.
/**
 * @hidden
 */
export class DecodingError extends Error {
  public error: Format.Errors.ErrorForThrowing;
  constructor(error: Format.Errors.ErrorForThrowing) {
    super(Format.Utils.Exception.message(error));
    this.error = error;
    this.name = "DecodingError";
  }
}

//used to stop decoding; like DecodingError, but used in contexts
//where I don't expect it to be caught
//NOTE: currently we don't actually check the type of a thrown error,
//we just rely on context.  still, I think it makes sense to be a separate
//type.
/**
 * @hidden
 */
export class StopDecodingError extends Error {
  public error: Format.Errors.DecoderError;
  public allowRetry: boolean; //setting this to true means that, if the error occurs
  //when decoding in full mode, we allow an ABI-mode retry.  (if we were already in
  //ABI mode, we give up.)
  constructor(error: Format.Errors.DecoderError, allowRetry?: boolean) {
    const message = `Stopping decoding: ${error.kind}`; //sorry about the bare-bones message,
    //but again, users shouldn't actually see this, so I think this should suffice for now
    super(message);
    this.error = error;
    this.allowRetry = Boolean(allowRetry);
  }
}

/**
 * @hidden
 */
export function handleDecodingError(
  dataType: Format.Types.Type,
  error: any,
  strict: boolean = false
): Format.Errors.ErrorResult {
  if (error instanceof DecodingError) {
    //expected error
    if (strict) {
      //strict mode -- stop decoding on errors
      throw new StopDecodingError(error.error);
    } else {
      //nonstrict mode -- return an error result
      return <Format.Errors.ErrorResult>{
        //I don't know why TS's inference is failing here and needs the coercion
        type: dataType,
        kind: "error" as const,
        error: error.error
      };
    }
  } else {
    //if it's *not* an expected error, we better not swallow it -- rethrow!
    throw error;
  }
}

/**
 * This error indicates that the user attempted to instantiate a decoder
 * with no project information (by explicitly overriding the default).
 * @category Exception
 */
export class NoProjectInfoError extends Error {
  constructor() {
    super("No project information specified.");
    this.name = "NoProjectInfoError";
  }
}

/**
 * This error indicates there was an attempt to add multiple compilations
 * with the same ID, or a compilation whose ID was already in use.
 */
export class RepeatCompilationIdError extends Error {
  public ids: string[];
  constructor(ids: string[]) {
    super(`Compilation id(s) ${ids.join(", ")} repeated or already in use.`);
    this.ids = ids;
    this.name = "RepeatCompilationIdError";
  }
}
