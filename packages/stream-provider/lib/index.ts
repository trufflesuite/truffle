import axios, { AxiosRequestConfig } from "axios";
import type { JsonRpcResponse } from "web3-core-helpers";
import { errors } from "web3-core-helpers";
import _Web3HttpProvider, { HttpProvider } from "web3-providers-http";
const JSONStream = require("JSONStream");

// they export types, but in the wrong place
const Web3HttpProvider = _Web3HttpProvider as any as typeof HttpProvider;

export class StreamingWeb3HttpProvider extends Web3HttpProvider {
  /**
   * Should be used to make async request
   *
   * @method send
   * @param {Object} payload
   * @param {Function} callback triggered on end with (err, result)
   */
  send(
    payload: any,
    callback: (error: Error | null, result: JsonRpcResponse | undefined) => void
  ) {
    if (
      typeof payload === "object" &&
      payload.method === "debug_traceTransaction"
    ) {
      const requestOptions: AxiosRequestConfig = {
        method: "post",
        url: this.host,
        responseType: "stream",
        data: payload,
        timeout: this.timeout,
        withCredentials: this.withCredentials,
        headers: this.headers
          ? this.headers.reduce((acc, header) => {
              acc[header.name] = header.value;
              return acc;
            }, {} as Record<string, string>)
          : undefined
      };
      // transitional.clarifyTimeoutError is required so we can detect and emit
      // a timeout error the way web3 already does
      (requestOptions as any).transitional = {
        clarifyTimeoutError: true
      };
      const agents = {
        httpsAgent: (this as any).httpsAgent,
        httpAgent: (this as any).httpAgent,
        baseUrl: (this as any).baseUrl
      };
      if (this.agent) {
        agents.httpsAgent = this.agent.https;
        agents.httpAgent = this.agent.http;
        agents.baseUrl = this.agent.baseUrl;
      }
      requestOptions.httpAgent = agents.httpAgent;
      requestOptions.httpsAgent = agents.httpsAgent;
      requestOptions.baseURL = agents.baseUrl;

      axios(requestOptions)
        .then(async response => {
          let error = null;
          let result: any = {};
          const stream = response.data.pipe(
            JSONStream.parse([{ emitKey: true }])
          );
          try {
            result = await new Promise((resolve, reject) => {
              let result: any = {};
              stream.on("data", (data: any) => {
                const { key, value } = data;
                result[key] = value;
              });
              stream.on("error", (error: Error) => {
                reject(error);
              });
              stream.on("end", () => {
                resolve(result);
              });
            });
          } catch (e) {
            error = errors.InvalidResponse(e);
          }
          this.connected = true;
          // process.nextTick so an exception thrown in the callback doesn't
          // bubble back up to here
          process.nextTick(callback, error, result);
        })
        .catch(error => {
          this.connected = false;
          if (error.code === "ETIMEDOUT") {
            // web3 passes timeout as a number to ConnectionTimeout, despite the
            // type requiring a string
            callback(errors.ConnectionTimeout(this.timeout as any), undefined);
          } else {
            callback(errors.InvalidConnection(this.host), undefined);
          }
        });
    } else {
      return super.send(payload, callback);
    }
  }
}
