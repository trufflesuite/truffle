const validateOptions = options => {
  const { handlers, initialization } = options;

  if (typeof initialization !== "function") {
    const message =
      `The initialization property specified in your ` +
      `reporter config must be a function. The current value is ` +
      `${initialization}.`;
    throw new Error(message);
  }

  if (typeof handlers !== "object" || Object.keys(handlers).length === 0) {
    const message =
      `You must provide a handlers property in your reporter ` +
      `config. Please ensure that the handlers property ` +
      ` exists and is in the following form:\n ` +
      `  handlers: {\n` +
      `    <handlerName1>: [\n` +
      `       handler1,\n` +
      `       handler2,\n` +
      `       ...\n` +
      `     ],\n` +
      `     <handlerName2>: [\n` +
      `       ...\n` +
      `Currently the handlers property is ${handlers}.`;
    throw new Error(message);
  }
};

const convertHandlerNameToRegex = name => {
  return new RegExp(
    name.replace(
      /\*\*|\*/g, // match single or double `*`
      match => {
        return match === "**" ? "([^:]+(:[^:]+)*)?" : "[^:]+";
      }
    )
  );
};

const createLookupTable = handlerNames => {
  return handlerNames.reduce((lookupTable, handlerName) => {
    const regex = convertHandlerNameToRegex(handlerName);
    lookupTable[handlerName] = regex;
    return lookupTable;
  }, {});
};

const sortHandlers = handlers => {
  const globbedHandlers = {};
  const nonGlobbedHandlers = {};
  for (let handlerName in handlers) {
    if (handlerName.includes("*") || handlerName.includes("**")) {
      globbedHandlers[handlerName] = handlers[handlerName];
    } else {
      nonGlobbedHandlers[handlerName] = handlers[handlerName];
    }
  }
  return { nonGlobbedHandlers, globbedHandlers };
};

module.exports = {
  createLookupTable,
  sortHandlers,
  validateOptions
};
