import type Config from "@truffle/config";

export const emitEvent = async (options: Config, name: string, data?: any) => {
  if (options.events) {
    return await options.events.emit(name, data);
  }
};
