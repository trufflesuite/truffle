import concurrently from "concurrently";

function notice(text: string) {
  console.log(`\x1b[34m\x1b[1m${text}\x1b[0m`);
}

async function startServers() {
  notice("Press ^C or Q to exit\nStarting servers...");

  const { commands, result } = concurrently(
    [
      {
        command: "yarn start:server",
        name: "dashboard",
        prefixColor: "bgMagenta.bold"
      },
      {
        command: "yarn start:react",
        name: "webpack",
        prefixColor: "cyan.bgBlack.bold"
      }
    ],
    {
      killOthers: ["success", "failure"],
      handleInput: true
    }
  );

  const kill = () => commands.forEach(command => void command.kill("SIGINT"));

  process.stdin.setRawMode(true);
  process.stdin.on("data", async data => {
    const isControlC = data.equals(Buffer.from("\x03"));
    const isQ = /^q$/i.test(data.toString().trim());

    if (isControlC || isQ) {
      notice("Stopping servers...");
      kill();
      try {
        await result;
      } catch (err) {
        /* We don't really care. */
      }
    }
  });
}

startServers();
