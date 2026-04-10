const { getTodayTasks } = require("../store/tasks");

function todayCommand({ context, stdout }) {
  const tasks = getTodayTasks(context);

  if (!tasks.length) {
    stdout.write("No tasks for today.\n");
    return 0;
  }

  const lines = [`Today focus: ${tasks.length} tasks`, ""];
  tasks.forEach((task) => {
    lines.push(`[${task.id}] ${task.title}`);
    lines.push(`  project: ${task.projectName || "unassigned"}`);
    lines.push(`  due: ${task.dueDate || "none"}`);
    lines.push(`  priority: ${task.priority}`);
  });
  lines.push("");

  stdout.write(lines.join("\n"));
  return 0;
}

module.exports = {
  todayCommand
};