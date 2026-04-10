const { buildStats } = require("../store/tasks");

function statsCommand({ context, stdout }) {
  const stats = buildStats(context);
  const lines = [
    "Overall",
    `  total: ${stats.overall.total}`,
    `  open: ${stats.overall.open}`,
    `  done: ${stats.overall.done}`,
    `  archived: ${stats.overall.archived}`,
    "",
    "By project"
  ];

  if (!stats.byProject.length) {
    lines.push("  none");
  } else {
    stats.byProject.forEach((entry) => {
      lines.push(`  ${entry.name}: total ${entry.total}, open ${entry.open}, done ${entry.done}, archived ${entry.archived}`);
    });
  }

  lines.push("");
  lines.push("By priority");
  if (!stats.byPriority.length) {
    lines.push("  none");
  } else {
    stats.byPriority.forEach((entry) => {
      lines.push(`  ${entry.priority}: total ${entry.total}, open ${entry.open}, done ${entry.done}, archived ${entry.archived}`);
    });
  }
  lines.push("");

  stdout.write(lines.join("\n"));
  return 0;
}

module.exports = {
  statsCommand
};