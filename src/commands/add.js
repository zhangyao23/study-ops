const { createTask } = require("../store/tasks");

function addCommand({ context, stdout, title, projectName, dueDate, priority }) {
  const task = createTask(context, { title, projectName, dueDate, priority });
  stdout.write([
    `Added task ${task.id}: ${task.title}`,
    `Project: ${task.projectName || "unassigned"}`,
    `Due: ${task.dueDate || "none"}`,
    `Priority: ${task.priority}`,
    `Status: ${task.status}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  addCommand
};