export type SerialQueue = <Result>(task: () => Promise<Result>) => Promise<Result>;

export function createSerialQueue(): SerialQueue {
  let lastTask: Promise<unknown> = Promise.resolve();
  return (task) => {
    const result = lastTask.then(task);
    lastTask = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
