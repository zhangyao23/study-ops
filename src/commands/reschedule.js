const { rescheduleTask } = require("../store/tasks");

function rescheduleCommand({ context, stdout, taskId, dueDate }) {
  const task = rescheduleTask(context, taskId, { dueDate });
  stdout.write([
    `Rescheduled task ${task.id}: ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Due: ${task.dueDate || "none"}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  rescheduleCommand
};