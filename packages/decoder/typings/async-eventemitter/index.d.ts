declare module "async-eventemitter" {
  export default class AsyncEventEmitter {
    public emit(event: any, data: any, callback: Function): AsyncEventEmitter;
    public once(type: any, listener: Function): AsyncEventEmitter;
    public first(event: any, listener: Function): AsyncEventEmitter;
    public at(event: any, index: any, listener: Function): AsyncEventEmitter;
    public before(event: any, target: any, listener: Function): AsyncEventEmitter;
    public after(event: any, target: any, listener: Function): AsyncEventEmitter;
    public _beforeOrAfter(event: any, target: any, listener: Function, beforeOrAfter?: string): AsyncEventEmitter;
  }
}