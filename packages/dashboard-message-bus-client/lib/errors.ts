import { Message } from "@truffle/dashboard-message-bus-common";

export interface MessageBusConnectionErrorOptions {
  message: string;
  cause?: Error;
}

export interface AlreadyRespondedErrorOptions {
  serviceBusMessage: Message;
}

export class AlreadyRespondedError extends Error {
  constructor({ serviceBusMessage }: AlreadyRespondedErrorOptions) {
    super(
      `A response has already been sent for message id ${serviceBusMessage.id} of type "${serviceBusMessage.type}".`
    );
  }
}

export class MessageBusConnectionError extends Error {
  cause: Error | undefined;

  constructor({ message, cause }: MessageBusConnectionErrorOptions) {
    super(message);
    this.cause = cause;
  }
  toString(): string {
    return this.cause
      ? `${super.toString()}\ncaused by: ${this.cause.toString()}`
      : super.toString();
  }
}
