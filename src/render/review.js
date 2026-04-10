function describeTask(task) {
  const parts = [`[${task.id || task.taskId}] ${task.title}`];
  if (task.projectName) {
    parts.push(`project: ${task.projectName}`);
  }
  if (task.dueDate) {
    parts.push(`due: ${task.dueDate}`);
  }
  if (task.priority) {
    parts.push(`priority: ${task.priority}`);
  }
  return parts.join(" | ");
}

function renderSection(title, items, formatter) {
  if (!items.length) {
    return [`## ${title}`, "", "- none", ""];
  }

  return [
    `## ${title}`,
    "",
    ...items.map((item) => `- ${formatter(item)}`),
    ""
  ];
}

function renderFrontmatter(summary) {
  return [
    "---",
    "kind: study-review",
    `review_date: ${summary.date}`,
    `source_project: ${summary.sourceProject || "study-ops"}`,
    `completed_count: ${summary.completedCount}`,
    `rescheduled_count: ${summary.rescheduledCount}`,
    `unfinished_count: ${summary.unfinishedCount}`,
    "---",
    ""
  ];
}

function renderReviewMarkdown(summary) {
  const lines = [
    ...renderFrontmatter(summary),
    `# Study Review ${summary.date}`,
    "",
    `- Completed: ${summary.completedCount}`,
    `- Rescheduled: ${summary.rescheduledCount}`,
    `- Unfinished: ${summary.unfinishedCount}`,
    ""
  ];

  lines.push(...renderSection("Completed", summary.completed, (task) => describeTask(task)));
  lines.push(...renderSection("Rescheduled", summary.rescheduled, (event) => {
    const fromPart = event.fromDueDate || "unscheduled";
    const toPart = event.toDueDate || "unscheduled";
    return `${describeTask(event)} | ${fromPart} -> ${toPart}`;
  }));
  lines.push(...renderSection("Unfinished", summary.unfinished, (task) => describeTask(task)));

  return lines.join("\n");
}

module.exports = {
  renderReviewMarkdown
};