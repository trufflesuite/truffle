export const RECORD = "ENS_RECORD";
export function record(address, name) {
  return {
    type: RECORD,
    address,
    name //may be null
  };
}
