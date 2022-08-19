export const emitEvent = async (options, name, data) => {
  if (options.events) {
    return await options.events.emit(name, data);
  }
};
