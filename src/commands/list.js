const { listTasks } = require("../store/tasks");

function listCommand({ context, stdout, projectName, status }) {
  const tasks = listTasks(context, { projectName, status });

  if (!tasks.length) {
    stdout.write("No tasks found.\n");
    return 0;
  }

  const lines = [`${tasks.length} tasks`, ""];
  tasks.forEach((task) => {
    lines.push(`[${task.id}] ${task.title}`);
    lines.push(`  project: ${task.projectName || "unassigned"}`);
    lines.push(`  due: ${task.dueDate || "none"}`);
    lines.push(`  priority: ${task.priority}`);
    lines.push(`  status: ${task.status}`);
  });
  lines.push("");

  stdout.write(lines.join("\n"));
  return 0;
}

module.exports = {
  listCommand
};