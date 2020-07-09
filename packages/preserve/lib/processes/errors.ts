import { Task } from "./tasks";
import * as Tasks from "./tasks";
import { Scope } from "./scopes";

export type Config = {
  methods: {
    fail: {
      options: Options.Fail;
      event: Events.Fail | Events.Abort | Events.Stop;
    };

    abort: {
      options: Options.Abort;
      event: Events.Abort | Events.Stop;
    };

    stop: {
      options: Options.Stop;
      event: Events.Stop;
    };
  };
};

export namespace Events {
  export interface Fail {
    type: "fail";
    scope: Scope;
    error: Error;
  }

  export interface Abort {
    type: "abort";
    scope: Scope;
  }

  export interface Stop {
    type: "stop";
    scope: Scope;
  }
}

export namespace Options {
  export interface Fail {
    cascade?: boolean;
    error?: Error;
  }

  export interface Abort {
    cascade?: boolean;
  }

  export interface Stop {}
}

export interface ControllerConstructorOptions
  extends Tasks.ControllerConstructorOptions {
  parent?: Task<Config>;
}

export class Controller extends Tasks.Controller implements Task<Config> {
  protected parent?: Task<Config>;
  protected children: Task<Config>[];

  constructor(options: ControllerConstructorOptions) {
    const { parent, ...superOptions } = options;

    super(superOptions);

    this.children = [];
    if (parent) {
      this.parent = parent;
    }
  }

  async *fail({ error, cascade = true }: Options.Fail = {}) {
    // only meaningful to fail if we're currently active
    if (this.state !== Tasks.State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Fail>({
      type: "fail",
      error
    });

    this.state = Tasks.State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  async *abort({ cascade = true }: Options.Abort = {}) {
    // only meaningful to stop if we're currently active
    if (this.state !== Tasks.State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Abort>({
      type: "abort"
    });

    this.state = Tasks.State.Error;

    // propagate to parent
    if (this.parent && cascade) {
      yield* this.parent.abort({ cascade });
    }
  }

  async *stop({}: Options.Stop = {}) {
    // only meaningful to stop if we're currently active
    if (this.state !== Tasks.State.Active) {
      return;
    }

    // stop all children
    for (const child of this.children) {
      yield* child.stop();
    }

    yield this.emit<Events.Stop>({
      type: "stop"
    });
  }
}
