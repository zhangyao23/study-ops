const { markTaskDone } = require("../store/tasks");

function doneCommand({ context, stdout, taskId }) {
  const task = markTaskDone(context, taskId);
  const lines = [
    `Completed task ${task.id}: ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Completed At: ${task.completedAt}`
  ];

  if (task.spawnedTask) {
    lines.push(`Next Recurring Task: [${task.spawnedTask.id}] due ${task.spawnedTask.dueDate}`);
  }

  lines.push("");
  stdout.write(lines.join("\n"));
  return 0;
}

module.exports = {
  doneCommand
};