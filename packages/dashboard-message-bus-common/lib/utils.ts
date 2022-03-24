import { Message } from "./messages";

/**
 * Convert any JS object or value to a base64 representation of it
 */
export const jsonToBase64 = (json: any) => {
  const stringifiedJson = JSON.stringify(json);
  const buffer = Buffer.from(stringifiedJson);
  const base64 = buffer.toString("base64");

  return base64;
};

/**
 * Convert the base64 representation of a JS object or value to its JS representation
 * @dev This is the reverse of `jsonToBase64` and is not expected to work with other base64 formats
 */
export const base64ToJson = (base64: string) => {
  const buffer = Buffer.from(base64, "base64");
  const stringifiedJson = buffer.toString("utf8");
  const json = JSON.parse(stringifiedJson);

  return json;
};

export const createMessage = <M extends Message>(
  type: M["type"],
  payload: M["payload"]
): Message => {
  const id = Math.random();
  return { id, type, payload };
};
