const _outstandingPromiseMap = new WeakMap<Object, Set<Promise<any>>>();

export function tracked<T extends Object>(
  target: T,
  key: string | Symbol,
  descriptor: PropertyDescriptor
) {
  if (typeof descriptor.value === "function") {
    const impl = descriptor.value;

    // wrapper function that keeps a list of outstanding promises for each
    // instance of DashboardMessageBusClient
    const newImpl = (...args: any[]) => {
      const returnValue = impl.apply(target, args);

      // only track async functions
      if (returnValue.then && typeof returnValue.then === "function") {
        const trackedTask = returnValue
          .then((result: any) => {
            _cleanUpTrackedTask(target, trackedTask);
            return result;
          })
          .catch((err: any) => {
            _cleanUpTrackedTask(target, trackedTask);
            throw err;
          });

        _trackTask(target, trackedTask);
        return trackedTask;
      }

      return returnValue;
    };

    return {
      ...descriptor,
      value: newImpl
    };
  }

  return descriptor;
}

export function getOutstandingPromises<T extends Object>(target: T) {
  const iterable = _outstandingPromiseMap.get(target)?.values();
  return iterable ? Array.from(iterable) : [];
}

function _trackTask<T extends Object>(target: T, trackedTask: Promise<any>) {
  if (!_outstandingPromiseMap.get(target)) {
    _outstandingPromiseMap.set(target, new Set<Promise<void>>());
  }

  _outstandingPromiseMap.get(target)?.add(trackedTask);
}

function _cleanUpTrackedTask<T extends Object>(
  target: T,
  trackedTask: Promise<any>
) {
  _outstandingPromiseMap.get(target)?.delete(trackedTask);
  if (_outstandingPromiseMap.get(target)?.size === 0) {
    _outstandingPromiseMap.delete(target);
  }
}
