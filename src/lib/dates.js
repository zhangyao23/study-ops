const { CliError } = require("./errors");

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nowIso(date = new Date()) {
  return date.toISOString();
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && (date.getMonth() + 1) === month && date.getDate() === day;
}

function requireDateString(value, description = "date") {
  if (!isValidDateString(value)) {
    throw new CliError(`Invalid ${description}: ${value}. Expected yyyy-mm-dd.`, 2);
  }
  return String(value);
}

function dayFromIso(isoString) {
  return String(isoString || "").slice(0, 10);
}

function shiftDate(dateString, deltaDays) {
  const normalized = requireDateString(dateString);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + deltaDays);
  return formatLocalDate(date);
}

function advanceDate(dateString, repeatRule) {
  const normalized = requireDateString(dateString);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  switch (String(repeatRule || "").toLowerCase()) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      throw new CliError(`Unsupported repeat rule: ${repeatRule}`, 2);
  }

  return formatLocalDate(date);
}

module.exports = {
  advanceDate,
  dayFromIso,
  formatLocalDate,
  isValidDateString,
  nowIso,
  requireDateString,
  shiftDate
};