/* eslint-env browser */
export async function compileInWebWorker({
  soljson,
  compilerInput
}): Promise<any> {
  // @ts-ignore
  const dataUrl = `data:text/javascript;base64,${WORKER_CODE_BASE64}`;
  const worker = new Worker(dataUrl);
  return new Promise(resolve => {
    worker.addEventListener(
      "message",
      function (e) {
        const output = e.data;
        resolve({
          compilerOutput: output,
          // TODO: figure out where the version information is
          solcVersion: ""
        });
      },
      false
    );

    worker.postMessage({ soljson, compilerInput });
  });
}
