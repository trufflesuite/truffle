import React, { Component } from 'react';
import {ReactTerminalStateless} from 'react-terminal-component';
import {EmulatorState, CommandMapping, Outputs, OutputFactory} from 'javascript-terminal';
import axios from "axios"; 
import path from "path";

const TRUFFLE_GLOBAL_VAR = "truffle";

export default class TruffleTerminal extends Component {
  constructor(props) {
    super();

    this.state = {
      emulatorState: EmulatorState.create({
        commandMapping: CommandMapping.create({
          truffle: {
            "function": (state, opts) => {
              const input = opts.join(' ');
              this.runTruffleCommand(input);
              return {};
            },
            optDef: {}
          }, 
          ls: {
            "function": (state, opts) => {
              if (!this.state.truffle) {
                return {};
              }

              try {
                var list = this.state.truffle.fs().readdirSync(this.state.cwd);
                var str = list.join("\r\n");
                return {
                  output: OutputFactory.makeTextOutput(str)
                }
              } catch (e) {
                this.writeErrorToTerminal(e, "ls");
              }
            },
            optDef: {}
          },
          cd: {
            "function": (state, opts) => {
              try {
                if (opts.length == 0 || opts[0] == "~") {
                  opts = [this.state.truffle ? this.state.truffle.root_dir : "/"];
                }

                var newWorkingDirectory = opts[0];

                if (newWorkingDirectory.indexOf(0) != "/" && newWorkingDirectory.length > 1) {
                  newWorkingDirectory = path.join(this.state.cwd, newWorkingDirectory);
                }

                var truffleFileExists = !this.state.truffle || !this.state.truffle.fs().existsSync(newWorkingDirectory);

                if (newWorkingDirectory != "/" && truffleFileExists) {
                  return {
                    output: OutputFactory.makeErrorOutput({
                      source: "cd", 
                      type: opts[0] + ": No such file or directory"
                    })
                  }
                }

                this.setState({
                  cwd: newWorkingDirectory
                })
              } catch (e) {
                this.writeErrorToTerminal(e, "cd");
              }

              return {};
            },
            optDef: {}
          },
          pwd: {
            "function": (state, opts) => {
              return {
                output: OutputFactory.makeTextOutput(this.state.cwd)
              }
            },
            optDef: {}
          },
          cat: {
            "function": (state, opts) => {
              if (opts.length == 0) {
                return {
                  output: OutputFactory.makeErrorOutput({
                    source: "cat", 
                    type: "No file specified"
                  })
                } 
              }

              var file = opts[0];

              if (file.indexOf(0) != "/") {
                file = path.join(this.state.cwd, file);
              }

              var truffleFileExists = !this.state.truffle || !this.state.truffle.fs().existsSync(file);

              if (file != "/" && truffleFileExists) {
                return {
                  output: OutputFactory.makeErrorOutput({
                    source: "cat", 
                    type: opts[0] + ": No such file or directory"
                  })
                }
              }

              // This line will fail if Truffle isn't initialized yet and the file specified is "/" (yes, the root folder). 
              // Too lazy to fix right now. Super edgy.
              var stats = this.state.truffle.fs().statSync(file);

              if (stats.isDirectory()) {
                return {
                  output: OutputFactory.makeErrorOutput({
                    source: "cat", 
                    type: opts[0] + ": Is a directory"
                  })
                }
              }

              var data = this.state.truffle.fs().readFileSync(file, "utf-8");

              return {
                output: OutputFactory.makeTextOutput(data)
              }
            },
            optDef: {}
          }
        })
      }),
      cwd: "/", // Start with /, but will auto change to the root dir once created.
      inputStr: '',
      promptSymbol: "$",
      acceptInput: true, 
      truffle: null
    };

    // if (props.preamble) {
    //   this.write
    // }

    if (props.preamble != null) {
      const preamble = OutputFactory.makeTextOutput(props.preamble);
      const newOutputs = Outputs.addRecord(this.state.emulatorState.getOutputs(), preamble);

      this.state.emulatorState = this.state.emulatorState.setOutputs(newOutputs);
    }
  }

  async runTruffleCommand(commandString) {
    this.disableInput();

    // Is this weird that I'm putting uncaught errors in the JS-terminal's context? 

    try {
      await this.downloadTruffle();
    } catch (e) {
      this.writeErrorToTerminal(e, "truffle");
      this.enableInput();
      return;
    }

    if (!this.state.truffle) {
      var truffleInstance = new window[TRUFFLE_GLOBAL_VAR]();
      this.setState({
        truffle: truffleInstance,
        cwd: truffleInstance.root_dir
      });
    }

    var logger = {
      log: (obj) => {
        this.writeToTerminal(obj);
      },
      error: (obj) => {
        this.writeErrorToTerminal(obj, "truffle");
      }
    };

    try {
      await this.state.truffle.run(commandString, logger);
    } catch (e) {
      this.writeErrorToTerminal(e, "truffle");
    }

    this.enableInput();
  }

  async downloadTruffle() {
    if (this.state.truffle != null) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Not exactly sure why, but the first line won't get written
      // unless I set a timeout and let it figure itself out.
      setTimeout(() => {
        this.writeToTerminal("Downloading Truffle...");
        resolve();
      }, 1);
    }).then(() => {
      return axios.get("./browser-truffle.js", {
        onDownloadProgress: (progressEvent) => {
          let percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);

          // Different transfer encodings chosen by the server might prevent us from knowing the progress.
          // If that's the case, don't show the progress.
          if (!isFinite(percentCompleted)) {
            percentCompleted = " ";
          } else {
            percentCompleted += "%";
          }

          this.removeLastLine();
          this.writeToTerminal(`Downloading Truffle... ${percentCompleted}`);
        }
      })
    }).then((response) => {
      this.removeLastLine();

      var code = response.data;

      var s = document.createElement("script");
      s.innerHTML = code;
      document.body.appendChild(s);
    })
  }

  disableInput() {
    this.setState({
      acceptInput: false,
    });
  }

  enableInput() {
    this.setState({
      acceptInput: true,
    });
  }

  async writeToTerminal(content="") {
    content = content.toString();
    var output = OutputFactory.makeTextOutput(content);
    this._addOutputToTerminal(output);
  }

  async writeErrorToTerminal(content, source) {
    source = source || "x";

    // Just in case we need to inspect the stack
    if (content instanceof Error) {
      console.error(content);
      content = content.message;
    }

    content = content.toString();

    var output = OutputFactory.makeErrorOutput({
      source: source,
      type: content
    });
    this._addOutputToTerminal(output);
  }

  _addOutputToTerminal(output) {
    const newOutputs = Outputs.addRecord(this.state.emulatorState.getOutputs(), output);

    this.setState({
      emulatorState: this.state.emulatorState.setOutputs(newOutputs)
    });
  }

  removeLastLine() {
    const newOutputs = this.state.emulatorState.getOutputs().pop();
    this.setState({
      emulatorState: this.state.emulatorState.setOutputs(newOutputs)
    });
  }

  onInputChange(inputStr) {
    this.setState({inputStr})
  }

  onStateChange(emulatorState) {
    this.setState({emulatorState, inputStr: ''});
  }

  render() {
    return (
      <ReactTerminalStateless
        emulatorState={this.state.emulatorState}
        inputStr={this.state.inputStr}
        onInputChange={this.onInputChange.bind(this)}
        onStateChange={this.onStateChange.bind(this)}
        promptSymbol={this.state.promptSymbol}
      />
    );
  }
}
