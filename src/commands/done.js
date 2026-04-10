const { markTaskDone } = require("../store/tasks");

function doneCommand({ context, stdout, taskId }) {
  const task = markTaskDone(context, taskId);
  stdout.write([
    `Completed task ${task.id}: ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Completed At: ${task.completedAt}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  doneCommand
};