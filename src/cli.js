const { CliError } = require("./lib/errors");
const { parseArgs, requireFlag, requirePositional, ensureNoExtraPositionals } = require("./lib/argv");
const { createAppContext, ensureProjectDirectories } = require("./lib/paths");
const { addCommand } = require("./commands/add");
const { archiveCommand } = require("./commands/archive");
const { listCommand } = require("./commands/list");
const { todayCommand } = require("./commands/today");
const { nextCommand } = require("./commands/next");
const { doneCommand } = require("./commands/done");
const { rescheduleCommand } = require("./commands/reschedule");
const { reviewCommand } = require("./commands/review");
const { statsCommand } = require("./commands/stats");

function getUsage() {
  return [
    "study-ops",
    "",
    "Usage:",
    "  study-ops add --title <title> [--project <name>] [--due <date>] [--priority low|medium|high] [--repeat daily|weekly|monthly]",
    "  study-ops list [--project <name>] [--status open|done|archived]",
    "  study-ops today",
    "  study-ops next",
    "  study-ops done <id>",
    "  study-ops archive <id>",
    "  study-ops reschedule <id> --due <date>",
    "  study-ops review [--date <yyyy-mm-dd>]",
    "  study-ops stats",
    "",
    "Examples:",
    "  node src/index.js add --title \"Write review\" --project research-vault --due 2026-04-10 --priority high",
    "  node src/index.js add --title \"Weekly planning\" --due 2026-04-11 --repeat weekly",
    "  node src/index.js archive 3",
    "  node src/index.js review --date 2026-04-10",
    ""
  ].join("\n");
}

async function runCli(argv, options = {}) {
  const stdout = options.stdout || process.stdout;
  const context = options.context || createAppContext(options.projectRoot);

  ensureProjectDirectories(context);

  if (!argv.length || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    stdout.write(getUsage());
    return 0;
  }

  const [command, ...rest] = argv;
  const parsed = parseArgs(rest);

  switch (command) {
    case "add":
      ensureNoExtraPositionals(parsed.positionals);
      return addCommand({
        context,
        stdout,
        title: requireFlag(parsed.options.title, "--title", "Use --title to describe the task."),
        projectName: parsed.options.project || null,
        dueDate: parsed.options.due || null,
        priority: parsed.options.priority || "medium",
        repeatRule: parsed.options.repeat || null
      });
    case "list":
      ensureNoExtraPositionals(parsed.positionals);
      return listCommand({
        context,
        stdout,
        projectName: parsed.options.project || null,
        status: parsed.options.status || null
      });
    case "today":
      ensureNoExtraPositionals(parsed.positionals);
      return todayCommand({ context, stdout });
    case "next":
      ensureNoExtraPositionals(parsed.positionals);
      return nextCommand({ context, stdout });
    case "done":
      ensureNoExtraPositionals(parsed.positionals, 1);
      return doneCommand({
        context,
        stdout,
        taskId: requirePositional(parsed.positionals[0], "Task id")
      });
    case "archive":
      ensureNoExtraPositionals(parsed.positionals, 1);
      return archiveCommand({
        context,
        stdout,
        taskId: requirePositional(parsed.positionals[0], "Task id")
      });
    case "reschedule":
      ensureNoExtraPositionals(parsed.positionals, 1);
      return rescheduleCommand({
        context,
        stdout,
        taskId: requirePositional(parsed.positionals[0], "Task id"),
        dueDate: requireFlag(parsed.options.due, "--due", "Use --due yyyy-mm-dd to set the new date.")
      });
    case "review":
      ensureNoExtraPositionals(parsed.positionals);
      return reviewCommand({
        context,
        stdout,
        date: parsed.options.date || null
      });
    case "stats":
      ensureNoExtraPositionals(parsed.positionals);
      return statsCommand({ context, stdout });
    default:
      throw new CliError(`Unknown command: ${command}`, 2);
  }
}

module.exports = {
  getUsage,
  runCli
};