import type { State } from "../types";

export const validStates = (states: State[]) => (
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;

  descriptor.value = async function* (...args: any[]) {
    if (!states.includes(this._state)) return;
    const result = yield* originalMethod.apply(this, args);
    return result;
  };

  return descriptor;
};

export const transitionToState = (state: State) => (
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) => {
  const originalMethod = descriptor.value;

  descriptor.value = async function* (...args: any[]) {
    const result = yield* originalMethod.apply(this, args);
    this._state = state;
    return result;
  };

  return descriptor;
};
