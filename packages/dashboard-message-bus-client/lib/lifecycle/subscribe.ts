import { Message, Response } from "@truffle/dashboard-message-bus-common";
import { DashboardMessageBusConnection } from "lib/connection";
import { AlreadyRespondedError } from "../errors";
import debugModule from "debug";
import { TypedEmitter } from "tiny-typed-emitter";
import { SubscriptionOptions } from "../";

const debug = debugModule(`dashboard-message-bus-client:subscribe`);

interface ReceivedMessageLifecycleOptions<MessageType extends Message> {
  message: MessageType;
  connection: DashboardMessageBusConnection;
}

interface DashboardMessageBusSubscriptionEvents<MessageType extends Message> {
  message: (messageLifecycle: ReceivedMessageLifecycle<MessageType>) => void;
  end: () => void;
}

export type EvaluateMessageOptions<MessageType extends Message> =
  ReceivedMessageLifecycleOptions<MessageType>;

export class DashboardMessageBusSubscription<
  MessageType extends Message = Message
> extends TypedEmitter<DashboardMessageBusSubscriptionEvents<MessageType>> {
  private _predicate: (message: Message) => boolean;
  private _ended: boolean = false;

  constructor({ id, type }: SubscriptionOptions) {
    super();
    this._predicate = (message: Message) =>
      (id === undefined || message.id === id) &&
      (type === undefined || message.type === type);
  }

  _evaluateMessage({
    message,
    connection
  }: EvaluateMessageOptions<MessageType>) {
    if (this._predicate(message)) {
      const messageLifecycle = new ReceivedMessageLifecycle<MessageType>({
        message,
        connection
      });
      this.emit("message", messageLifecycle);
    }
  }

  _end() {
    this._ended = true;
    this.emit("end");
    this.removeAllListeners();
  }
}

export class ReceivedMessageLifecycle<MessageType extends Message> {
  readonly message: MessageType;

  private _connection: DashboardMessageBusConnection;
  private _responded: boolean = false;

  constructor({
    message,
    connection
  }: ReceivedMessageLifecycleOptions<MessageType>) {
    this.message = message;
    this._connection = connection;
  }

  async respond<ResponseType extends Response>({
    payload
  }: {
    payload: ResponseType["payload"];
  }): Promise<void> {
    if (this._responded) {
      throw new AlreadyRespondedError({ serviceBusMessage: this.message });
    }
    this._responded = true;

    const response = { id: this.message.id, payload };

    debug(
      "Responding to message %s of type '%s' with %o",
      this.message.id,
      this.message.type,
      response
    );
    await this._connection.send(response);
  }
}
