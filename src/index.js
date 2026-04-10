const { runCli } = require("./cli");

runCli(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode ?? 0;
}).catch((error) => {
  process.stderr.write(`${error && error.message ? error.message : String(error)}\n`);
  process.exitCode = error && error.exitCode ? error.exitCode : 1;
});