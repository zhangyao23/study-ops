const { archiveTask } = require("../store/tasks");

function archiveCommand({ context, stdout, taskId }) {
  const task = archiveTask(context, taskId);
  stdout.write([
    `Archived task ${task.id}: ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Archived At: ${task.archivedAt}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  archiveCommand
};