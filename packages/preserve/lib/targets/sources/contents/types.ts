// (blech...)
type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

export type Bytes = Buffer | ArrayBuffer | TypedArray;

export type Content = string | Bytes | Iterable<Bytes> | AsyncIterable<Bytes>;

export const isString = (content: Content): content is string =>
  typeof content === "string";

export const isBytes = (content: Content): content is Bytes =>
  Buffer.isBuffer(content) ||
  content instanceof ArrayBuffer ||
  ArrayBuffer.isView(content);

export const isIterable = (content: Content): content is Iterable<Bytes> =>
  content && typeof content === "object" && Symbol.iterator in content;

export const isAsyncIterable = (
  content: Content
): content is AsyncIterable<Bytes> =>
  content && typeof content === "object" && Symbol.asyncIterator in content;
