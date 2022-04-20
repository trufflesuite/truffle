const _outstandingPromiseInstanceMap = new WeakMap<Object, Set<Promise<any>>>();
const _outstandingPromiseMap = new Map<Promise<any>, boolean>();

export function tracked<T extends Object>(
  target: T,
  key: string | Symbol,
  descriptor: PropertyDescriptor
) {
  if (typeof descriptor.value === "function") {
    const impl = descriptor.value;

    // wrapper function that keeps a list of outstanding promises for each
    // instance of DashboardMessageBusClient
    function newImpl(...args: any[]) {
      const returnValue = impl.apply(this, args);

      // only track async functions
      if (returnValue.then && typeof returnValue.then === "function") {
        const trackedTask = returnValue
          .then((result: any) => {
            _cleanUpTrackedTask(this, trackedTask);
            return result;
          })
          .catch((err: any) => {
            _cleanUpTrackedTask(this, trackedTask);
            throw err;
          });

        _trackTask(this, trackedTask);
        return trackedTask;
      }

      return returnValue;
    }

    return {
      ...descriptor,
      value: newImpl
    };
  }

  return descriptor;
}

export interface WaitForOutstandingPromiseOptions<T> {
  catchHandler?: (err?: any) => void;
  target?: T;
}

export async function waitForOutstandingPromises<T extends Object>(
  options?: WaitForOutstandingPromiseOptions<T>
) {
  const { target } = options || {};
  let { catchHandler } = options || {};

  const iterable =
    (target
      ? _outstandingPromiseInstanceMap.get(target)?.values()
      : _outstandingPromiseMap.keys()) || [];

  catchHandler = catchHandler || (() => {});

  await Promise.all(Array.from(iterable, p => p.catch(catchHandler)));
}

function _trackTask<T extends Object>(target: T, trackedTask: Promise<any>) {
  if (!_outstandingPromiseInstanceMap.has(target)) {
    _outstandingPromiseInstanceMap.set(target, new Set<Promise<void>>());
  }

  _outstandingPromiseInstanceMap.get(target)!.add(trackedTask);
  _outstandingPromiseMap.set(trackedTask, true);
}

function _cleanUpTrackedTask<T extends Object>(
  target: T,
  trackedTask: Promise<any>
) {
  _outstandingPromiseMap.delete(trackedTask);
  const promises = _outstandingPromiseInstanceMap.get(target);

  promises?.delete(trackedTask);

  if (promises?.size === 0) {
    _outstandingPromiseInstanceMap.delete(target);
  }
}

export interface GetOutstandingPromiseOptions<T> {
  target?: T;
}

export function getOutstandingPromises<T extends Object>(
  options: GetOutstandingPromiseOptions<T>
): Promise<any>[] {
  const { target } = options;

  const iterable =
    (target
      ? _outstandingPromiseInstanceMap.get(target)?.values()
      : _outstandingPromiseMap.keys()) || [];

  return Array.from(iterable);
}
