const fs = require("node:fs");
const path = require("node:path");
const { CliError } = require("../lib/errors");
const { relativeToProject, ensureProjectDirectories } = require("../lib/paths");
const { advanceDate, dayFromIso, formatLocalDate, nowIso, requireDateString } = require("../lib/dates");
const { openDatabase, withTransaction } = require("./db");
const { renderReviewMarkdown } = require("../render/review");

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_STATUSES = new Set(["open", "done", "archived"]);
const VALID_REPEAT_RULES = new Set(["daily", "weekly", "monthly"]);

function ensurePriority(priority) {
  const normalized = String(priority || "medium").trim().toLowerCase();
  if (!VALID_PRIORITIES.has(normalized)) {
    throw new CliError(`Unsupported priority: ${priority}. Expected one of: ${[...VALID_PRIORITIES].join(", ")}.`, 2);
  }
  return normalized;
}

function ensureStatus(status) {
  if (status === null || status === undefined || status === "") {
    return null;
  }
  const normalized = String(status).trim().toLowerCase();
  if (!VALID_STATUSES.has(normalized)) {
    throw new CliError(`Unsupported status: ${status}. Expected one of: ${[...VALID_STATUSES].join(", ")}.`, 2);
  }
  return normalized;
}

function ensureRepeatRule(repeatRule) {
  if (repeatRule === null || repeatRule === undefined || repeatRule === "") {
    return null;
  }
  const normalized = String(repeatRule).trim().toLowerCase();
  if (!VALID_REPEAT_RULES.has(normalized)) {
    throw new CliError(`Unsupported repeat rule: ${repeatRule}. Expected one of: ${[...VALID_REPEAT_RULES].join(", ")}.`, 2);
  }
  return normalized;
}

function priorityWeight(priority) {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function hydrateTask(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    projectName: row.project_name,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    repeatRule: row.repeat_rule,
    sourceTaskId: row.source_task_id
  };
}

function fetchAllTasks(db) {
  return db.prepare("SELECT * FROM tasks ORDER BY created_at ASC, id ASC").all().map(hydrateTask);
}

function findTask(db, taskId) {
  const numericId = Number(taskId);
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new CliError(`Invalid task id: ${taskId}`, 2);
  }

  const task = hydrateTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(numericId));
  if (!task) {
    throw new CliError(`Task not found: ${taskId}`, 2);
  }
  return task;
}

function recordEvent(db, taskId, eventType, payload, eventAt) {
  db.prepare(`
    INSERT INTO task_events (task_id, event_type, event_at, payload_json)
    VALUES (?, ?, ?, ?)
  `).run(taskId, eventType, eventAt, JSON.stringify(payload || {}));
}

function insertTaskRecord(db, task) {
  db.prepare(`
    INSERT INTO tasks (
      title,
      project_name,
      due_date,
      priority,
      status,
      created_at,
      updated_at,
      completed_at,
      archived_at,
      repeat_rule,
      source_task_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.title,
    task.projectName,
    task.dueDate,
    task.priority,
    task.status,
    task.createdAt,
    task.updatedAt,
    task.completedAt,
    task.archivedAt,
    task.repeatRule,
    task.sourceTaskId
  );

  return db.prepare("SELECT last_insert_rowid() AS id").get().id;
}

function compareOpenTasks(left, right) {
  const leftDue = left.dueDate || "9999-12-31";
  const rightDue = right.dueDate || "9999-12-31";
  if (leftDue !== rightDue) {
    return leftDue.localeCompare(rightDue);
  }

  const priorityDelta = priorityWeight(right.priority) - priorityWeight(left.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function createTask(context, { title, projectName = null, dueDate = null, priority = "medium", repeatRule = null, createdAt = nowIso(), sourceTaskId = null }) {
  ensureProjectDirectories(context);
  const db = openDatabase(context);

  try {
    const normalizedPriority = ensurePriority(priority);
    const normalizedRepeatRule = ensureRepeatRule(repeatRule);
    const normalizedDueDate = dueDate ? requireDateString(dueDate, "due date") : null;
    const trimmedTitle = String(title || "").trim();
    if (!trimmedTitle) {
      throw new CliError("Task title is required.", 2);
    }
    if (normalizedRepeatRule && !normalizedDueDate) {
      throw new CliError("Recurring tasks require --due yyyy-mm-dd.", 2);
    }

    const task = withTransaction(db, () => {
      const insertedId = insertTaskRecord(db, {
        title: trimmedTitle,
        projectName: projectName ? String(projectName).trim() : null,
        dueDate: normalizedDueDate,
        priority: normalizedPriority,
        status: "open",
        createdAt,
        updatedAt: createdAt,
        completedAt: null,
        archivedAt: null,
        repeatRule: normalizedRepeatRule,
        sourceTaskId
      });

      recordEvent(db, insertedId, "add", {
        projectName: projectName ? String(projectName).trim() : null,
        dueDate: normalizedDueDate,
        priority: normalizedPriority,
        repeatRule: normalizedRepeatRule,
        sourceTaskId
      }, createdAt);
      return findTask(db, insertedId);
    });

    return task;
  } finally {
    db.close();
  }
}

function listTasks(context, { projectName = null, status = null } = {}) {
  const db = openDatabase(context);
  try {
    const normalizedStatus = ensureStatus(status);
    const normalizedProject = projectName ? String(projectName).trim() : null;

    return fetchAllTasks(db)
      .filter((task) => {
        if (normalizedStatus === "archived") {
          return task.status === "archived" || Boolean(task.archivedAt);
        }
        return !task.archivedAt;
      })
      .filter((task) => !normalizedStatus || task.status === normalizedStatus)
      .filter((task) => !normalizedProject || task.projectName === normalizedProject)
      .sort((left, right) => {
        if ((normalizedStatus || left.status) === "done" && (normalizedStatus || right.status) === "done") {
          return `${right.completedAt || right.updatedAt}`.localeCompare(left.completedAt || left.updatedAt);
        }
        if ((normalizedStatus || left.status) === "archived" && (normalizedStatus || right.status) === "archived") {
          return `${right.archivedAt || right.updatedAt}`.localeCompare(left.archivedAt || left.updatedAt);
        }
        return compareOpenTasks(left, right);
      });
  } finally {
    db.close();
  }
}

function getTask(context, taskId) {
  const db = openDatabase(context);
  try {
    return findTask(db, taskId);
  } finally {
    db.close();
  }
}

function getTodayTasks(context, referenceDate = formatLocalDate()) {
  const normalizedDate = requireDateString(referenceDate, "reference date");
  return listTasks(context, { status: "open" })
    .filter((task) => task.dueDate === normalizedDate || task.priority === "high")
    .sort((left, right) => {
      const leftBucket = left.dueDate === normalizedDate ? 0 : 1;
      const rightBucket = right.dueDate === normalizedDate ? 0 : 1;
      if (leftBucket !== rightBucket) {
        return leftBucket - rightBucket;
      }
      return compareOpenTasks(left, right);
    });
}

function nextBucket(task, referenceDate) {
  if (task.dueDate && task.dueDate < referenceDate) {
    return 0;
  }
  if (task.dueDate === referenceDate) {
    return 1;
  }
  if (task.priority === "high") {
    return 2;
  }
  if (task.dueDate && task.dueDate > referenceDate) {
    return 3;
  }
  return 4;
}

function getNextTask(context, referenceDate = formatLocalDate()) {
  const normalizedDate = requireDateString(referenceDate, "reference date");
  const tasks = listTasks(context, { status: "open" }).sort((left, right) => {
    const leftBucket = nextBucket(left, normalizedDate);
    const rightBucket = nextBucket(right, normalizedDate);
    if (leftBucket !== rightBucket) {
      return leftBucket - rightBucket;
    }
    return compareOpenTasks(left, right);
  });

  return tasks[0] || null;
}

function spawnRecurringTask(db, task, spawnedAt) {
  if (!task.repeatRule) {
    return null;
  }

  const nextDueDate = advanceDate(task.dueDate, task.repeatRule);
  const insertedId = insertTaskRecord(db, {
    title: task.title,
    projectName: task.projectName,
    dueDate: nextDueDate,
    priority: task.priority,
    status: "open",
    createdAt: spawnedAt,
    updatedAt: spawnedAt,
    completedAt: null,
    archivedAt: null,
    repeatRule: task.repeatRule,
    sourceTaskId: task.id
  });
  recordEvent(db, insertedId, "add", {
    projectName: task.projectName,
    dueDate: nextDueDate,
    priority: task.priority,
    repeatRule: task.repeatRule,
    sourceTaskId: task.id
  }, spawnedAt);
  recordEvent(db, task.id, "spawn-next", {
    nextTaskId: insertedId,
    nextDueDate,
    repeatRule: task.repeatRule
  }, spawnedAt);
  return findTask(db, insertedId);
}

function markTaskDone(context, taskId, { completedAt = nowIso() } = {}) {
  const db = openDatabase(context);
  try {
    const task = findTask(db, taskId);
    if (task.status !== "open") {
      throw new CliError(`Only open tasks can be completed. Current status: ${task.status}.`, 2);
    }

    return withTransaction(db, () => {
      db.prepare(`
        UPDATE tasks
        SET status = 'done', updated_at = ?, completed_at = ?
        WHERE id = ?
      `).run(completedAt, completedAt, task.id);
      recordEvent(db, task.id, "done", { completedAt }, completedAt);
      const completedTask = findTask(db, task.id);
      const spawnedTask = task.repeatRule ? spawnRecurringTask(db, completedTask, completedAt) : null;
      return {
        ...completedTask,
        spawnedTask
      };
    });
  } finally {
    db.close();
  }
}

function rescheduleTask(context, taskId, { dueDate, changedAt = nowIso() }) {
  const normalizedDueDate = requireDateString(dueDate, "due date");
  const db = openDatabase(context);

  try {
    const task = findTask(db, taskId);
    if (task.status !== "open") {
      throw new CliError(`Only open tasks can be rescheduled. Current status: ${task.status}.`, 2);
    }

    return withTransaction(db, () => {
      db.prepare(`
        UPDATE tasks
        SET due_date = ?, updated_at = ?
        WHERE id = ?
      `).run(normalizedDueDate, changedAt, task.id);
      recordEvent(db, task.id, "reschedule", {
        fromDueDate: task.dueDate,
        toDueDate: normalizedDueDate
      }, changedAt);
      return findTask(db, task.id);
    });
  } finally {
    db.close();
  }
}

function archiveTask(context, taskId, { archivedAt = nowIso() } = {}) {
  const db = openDatabase(context);

  try {
    const task = findTask(db, taskId);
    if (task.status !== "done") {
      throw new CliError(`Only done tasks can be archived. Current status: ${task.status}.`, 2);
    }

    return withTransaction(db, () => {
      db.prepare(`
        UPDATE tasks
        SET status = 'archived', updated_at = ?, archived_at = ?
        WHERE id = ?
      `).run(archivedAt, archivedAt, task.id);
      recordEvent(db, task.id, "archive", { archivedAt }, archivedAt);
      return findTask(db, task.id);
    });
  } finally {
    db.close();
  }
}

function loadRescheduleEvents(db, reviewDate) {
  return db.prepare(`
    SELECT e.task_id, e.event_at, e.payload_json, t.title, t.project_name, t.priority, t.status, t.due_date
    FROM task_events e
    INNER JOIN tasks t ON t.id = e.task_id
    WHERE e.event_type = 'reschedule'
    ORDER BY e.event_at DESC
  `).all()
    .filter((row) => dayFromIso(row.event_at) === reviewDate)
    .map((row) => {
      const payload = JSON.parse(row.payload_json || "{}");
      return {
        taskId: row.task_id,
        title: row.title,
        projectName: row.project_name,
        priority: row.priority,
        status: row.status,
        currentDueDate: row.due_date,
        changedAt: row.event_at,
        fromDueDate: payload.fromDueDate || null,
        toDueDate: payload.toDueDate || null
      };
    });
}

function generateReview(context, { date = formatLocalDate(), generatedAt = nowIso() } = {}) {
  ensureProjectDirectories(context);
  const reviewDate = requireDateString(date, "review date");
  const db = openDatabase(context);

  try {
    const tasks = fetchAllTasks(db).filter((task) => !task.archivedAt);
    const completed = tasks.filter((task) => task.completedAt && dayFromIso(task.completedAt) === reviewDate);
    const unfinished = tasks.filter((task) => task.status === "open" && task.dueDate && task.dueDate <= reviewDate);
    const rescheduled = loadRescheduleEvents(db, reviewDate);

    const summary = {
      date: reviewDate,
      sourceProject: "study-ops",
      completed,
      rescheduled,
      unfinished,
      completedCount: completed.length,
      rescheduledCount: rescheduled.length,
      unfinishedCount: unfinished.length
    };

    const markdown = renderReviewMarkdown(summary);
    const absoluteFilePath = path.join(context.outputsDir, `review-${reviewDate}.md`);
    fs.writeFileSync(absoluteFilePath, markdown, "utf8");
    const relativeFilePath = relativeToProject(context, absoluteFilePath);

    withTransaction(db, () => {
      db.prepare(`
        INSERT INTO reviews (review_date, file_path, generated_at, summary_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(review_date) DO UPDATE SET
          file_path = excluded.file_path,
          generated_at = excluded.generated_at,
          summary_json = excluded.summary_json
      `).run(reviewDate, relativeFilePath, generatedAt, JSON.stringify(summary));
    });

    return {
      ...summary,
      filePath: relativeFilePath,
      markdown
    };
  } finally {
    db.close();
  }
}

function buildStats(context) {
  const db = openDatabase(context);
  try {
    const tasks = fetchAllTasks(db);
    const overall = {
      total: tasks.length,
      open: tasks.filter((task) => task.status === "open").length,
      done: tasks.filter((task) => task.status === "done").length,
      archived: tasks.filter((task) => task.status === "archived").length
    };

    const projectMap = new Map();
    const priorityMap = new Map();

    tasks.forEach((task) => {
      const projectKey = task.projectName || "unassigned";
      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, { name: projectKey, total: 0, open: 0, done: 0, archived: 0 });
      }
      const projectStats = projectMap.get(projectKey);
      projectStats.total += 1;
      projectStats[task.status] += 1;

      if (!priorityMap.has(task.priority)) {
        priorityMap.set(task.priority, { priority: task.priority, total: 0, open: 0, done: 0, archived: 0 });
      }
      const priorityStats = priorityMap.get(task.priority);
      priorityStats.total += 1;
      priorityStats[task.status] += 1;
    });

    return {
      overall,
      byProject: [...projectMap.values()].sort((left, right) => left.name.localeCompare(right.name)),
      byPriority: [...priorityMap.values()].sort((left, right) => priorityWeight(right.priority) - priorityWeight(left.priority))
    };
  } finally {
    db.close();
  }
}

module.exports = {
  VALID_PRIORITIES,
  VALID_REPEAT_RULES,
  archiveTask,
  buildStats,
  createTask,
  generateReview,
  getNextTask,
  getTask,
  getTodayTasks,
  listTasks,
  markTaskDone,
  rescheduleTask
};