const { CliError } = require("./errors");

function parseArgs(tokens) {
  const positionals = [];
  const options = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = tokens[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return { positionals, options };
}

function requirePositional(value, description) {
  if (!value) {
    throw new CliError(`${description} is required.`, 2);
  }
  return value;
}

function requireFlag(value, flagName, helpText) {
  if (!value) {
    throw new CliError(`${flagName} is required. ${helpText}`, 2);
  }
  return value;
}

function ensureNoExtraPositionals(positionals, expectedCount = 0) {
  if (positionals.length > expectedCount) {
    throw new CliError(`Unexpected positional arguments: ${positionals.slice(expectedCount).join(", ")}`, 2);
  }
}

module.exports = {
  ensureNoExtraPositionals,
  parseArgs,
  requireFlag,
  requirePositional
};