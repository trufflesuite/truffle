const getAllEventsByName = (options, eventName) => {
  return options.events.emittedEvents[eventName];
};

const preDeployOccurredForNames = (options, contractNames) => {
  const allPreDeploys = getAllEventsByName(options, "migrate:deployment:preDeploy");
  return contractNames.reduce((a, name) => {
    // after finding one that didn't occur, we know the test has failed
    if (a === false) return a;
    // search all events to make sure it occurred once for the name
    return allPreDeploys.some(eventData => {
      return eventData.data.state.contractName === name;
    });
  }, true);
};

const postDeployOccurredForNames = (options, contractNames) => {
  const allPostDeploys = getAllEventsByName(options, "migrate:deployment:postDeploy");
  return contractNames.reduce((a, name) => {
    if (a === false) return a;
    return allPostDeploys.some(eventData => {
      return eventData.data.contract.contractName === name;
    });
  }, true);
};

const linkingOccurredForName = (options, contractName, libraryName) => {
  const allLinks = getAllEventsByName(options, "migrate:deployment:linking");
  return allLinks.some(linkEvent => {
    return linkEvent.data.libraryName === libraryName && linkEvent.data.contractName === contractName;
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
    "migrate:deployment:preDeploy": [],
    "migrate:deployment:txHash": [],
    "migrate:deployment:postDeploy": [],
    "migrate:deployment:linking": [],
    "migrate:deployment:confirmation": [],
    "migrate:deployment:error": [],
    "migrate:deployment:deployFailed": []
  },
  emit: function(eventName, data) {
    if (mockEventsSystem.emittedEvents[eventName]) {
      mockEventsSystem.emittedEvents[eventName].push(data);
    } else {
      console.log(
        `Could not find the event name ${eventName} in 'emittedEvents'.`
      );
    }
  }
}

module.exports = {
  mockEventsSystem,
  getAllEventsByName,
  preDeployOccurredForNames,
  postDeployOccurredForNames,
  linkingOccurredForName
};
