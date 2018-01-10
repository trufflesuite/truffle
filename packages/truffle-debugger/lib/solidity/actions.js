export const JUMP = "JUMP";
export function jump(jumpDirection) {
  return {
    type: JUMP,
    jumpDirection
  };
}
