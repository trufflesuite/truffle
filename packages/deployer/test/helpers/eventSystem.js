const getAllEventsByName = (options, eventName) => {
  return options.events.emittedEvents[eventName];
};

const preDeployOccurredForNames = (options, contractNames) => {
  const allPreDeploys = getAllEventsByName(options, "deployment:preDeploy");
  return contractNames.reduce((a, name) => {
    // after finding one that didn't occur, we know the test has failed
    if (a === false) return a;
    // search all events to make sure it occurred once for the name
    return allPreDeploys.some(eventData => {
      return eventData.state.contractName === name;
    });
  }, true);
};

const postDeployOccurredForNames = (options, contractNames) => {
  const allPostDeploys = getAllEventsByName(options, "deployment:postDeploy");
  return contractNames.reduce((a, name) => {
    if (a === false) return a;
    return allPostDeploys.some(eventData => {
      return eventData.contract.contractName === name;
    });
  }, true);
};

const linkingOccurredForName = (options, contractName, libraryName) => {
  const allLinks = getAllEventsByName(options, "deployment:linking");
  return allLinks.some(linkEvent => {
    return (
      linkEvent.libraryName === libraryName &&
      linkEvent.contractName === contractName
    );
  });
};

// mock events used to keep track of data emitted
const mockEventsSystem = {
  clearEmittedEvents: () => {
    for (const eventName in mockEventsSystem.emittedEvents) {
      mockEventsSystem.emittedEvents[eventName] = [];
    }
  },
  emittedEvents: {
    "deployment:preDeploy": [],
    "deployment:txHash": [],
    "deployment:postDeploy": [],
    "deployment:linking": [],
    "deployment:confirmation": [],
    "deployment:error": [],
    "deployment:deployFailed": [],
    "deployment:block": []
  },
  emit: function (eventName, data) {
    if (mockEventsSystem.emittedEvents[eventName]) {
      mockEventsSystem.emittedEvents[eventName].push(data);
      return `Mock event system emitted ${eventName}`;
    } else {
      console.log(
        `Mock event system message: Could not find the event name ${eventName} in 'emittedEvents'.`
      );
    }
  }
};

module.exports = {
  mockEventsSystem,
  getAllEventsByName,
  preDeployOccurredForNames,
  postDeployOccurredForNames,
  linkingOccurredForName
};
