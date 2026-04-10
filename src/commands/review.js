const { generateReview } = require("../store/tasks");

function reviewCommand({ context, stdout, date }) {
  const summary = generateReview(context, { date: date || undefined });
  stdout.write([
    `Review written to ${summary.filePath}`,
    `Completed: ${summary.completedCount}`,
    `Rescheduled: ${summary.rescheduledCount}`,
    `Unfinished: ${summary.unfinishedCount}`,
    ""
  ].join("\n"));
  return 0;
}

module.exports = {
  reviewCommand
};