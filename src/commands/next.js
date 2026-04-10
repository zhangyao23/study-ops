const { getNextTask } = require("../store/tasks");

function nextCommand({ context, stdout }) {
  const task = getNextTask(context);

  if (!task) {
    stdout.write("No open tasks.\n");
    return 0;
  }

  stdout.write([
    "Next task",
    `[${task.id}] ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Due: ${task.dueDate || "none"}`,
    `Priority: ${task.priority}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  nextCommand
};