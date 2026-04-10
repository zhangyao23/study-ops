const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createAppContext, ensureProjectDirectories } = require("../src/lib/paths");
const { advanceDate, formatLocalDate, shiftDate } = require("../src/lib/dates");
const { openDatabase } = require("../src/store/db");
const {
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
} = require("../src/store/tasks");
const { runCli } = require("../src/cli");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function makeOutputBuffer() {
  let text = "";
  return {
    write(chunk) {
      text += chunk;
    },
    value() {
      return text;
    }
  };
}

function createTempProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "study-ops-"));
  [
    ".tmp",
    "artifacts/logs",
    "artifacts/outputs",
    "data/processed",
    "docs",
    "src",
    "tests"
  ].forEach((relativePath) => {
    fs.mkdirSync(path.join(root, relativePath), { recursive: true });
  });
  return root;
}

function withTempContext(run) {
  const projectRoot = createTempProjectRoot();
  const context = createAppContext(projectRoot);
  ensureProjectDirectories(context);

  try {
    run(context, projectRoot);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

test("createTask and listTasks keep local task metadata", () => {
  withTempContext((context) => {
    createTask(context, {
      title: "Write summary",
      projectName: "research-vault",
      dueDate: "2026-04-12",
      priority: "high"
    });
    createTask(context, {
      title: "Clean inbox",
      priority: "low"
    });

    const tasks = listTasks(context, { projectName: "research-vault", status: "open" });
    if (tasks.length !== 1 || tasks[0].title !== "Write summary") {
      throw new Error("Expected a filtered task list.");
    }
  });
});

test("recurring tasks spawn the next occurrence when completed", () => {
  withTempContext((context) => {
    const task = createTask(context, {
      title: "Weekly planning",
      dueDate: "2026-04-10",
      priority: "medium",
      repeatRule: "weekly"
    });

    const completed = markTaskDone(context, task.id, { completedAt: "2026-04-10T09:00:00.000Z" });
    if (!completed.spawnedTask) {
      throw new Error("Expected a follow-up recurring task.");
    }
    if (completed.spawnedTask.dueDate !== "2026-04-17") {
      throw new Error(`Unexpected next due date: ${completed.spawnedTask.dueDate}`);
    }
    if (completed.spawnedTask.repeatRule !== "weekly") {
      throw new Error(`Expected repeat rule to carry forward, received ${completed.spawnedTask.repeatRule}`);
    }
  });
});

test("getTodayTasks returns only today due tasks and high priority open tasks", () => {
  withTempContext((context) => {
    const today = "2026-04-10";
    createTask(context, { title: "Due Today", dueDate: today, priority: "medium" });
    createTask(context, { title: "High Priority", dueDate: "2026-04-15", priority: "high" });
    createTask(context, { title: "Not Included", dueDate: "2026-04-15", priority: "low" });

    const tasks = getTodayTasks(context, today);
    if (tasks.length !== 2) {
      throw new Error(`Expected 2 today tasks, received ${tasks.length}`);
    }
    if (!tasks.some((task) => task.title === "Due Today") || !tasks.some((task) => task.title === "High Priority")) {
      throw new Error("Expected due-today and high-priority tasks in today view.");
    }
  });
});

test("getNextTask prioritizes overdue work first", () => {
  withTempContext((context) => {
    const today = "2026-04-10";
    createTask(context, { title: "Future Task", dueDate: "2026-04-12", priority: "high" });
    createTask(context, { title: "Overdue Task", dueDate: "2026-04-09", priority: "low" });
    createTask(context, { title: "Today Task", dueDate: today, priority: "medium" });

    const task = getNextTask(context, today);
    if (!task || task.title !== "Overdue Task") {
      throw new Error(`Expected overdue task first, received ${task ? task.title : "none"}`);
    }
  });
});

test("markTaskDone rescheduleTask and archiveTask update state transitions", () => {
  withTempContext((context) => {
    const task = createTask(context, { title: "Follow up", dueDate: "2026-04-10", priority: "medium" });
    const rescheduled = rescheduleTask(context, task.id, { dueDate: "2026-04-12", changedAt: "2026-04-10T08:00:00.000Z" });
    if (rescheduled.dueDate !== "2026-04-12") {
      throw new Error(`Unexpected rescheduled due date: ${rescheduled.dueDate}`);
    }

    const completed = markTaskDone(context, task.id, { completedAt: "2026-04-10T10:00:00.000Z" });
    if (completed.status !== "done") {
      throw new Error(`Unexpected status after completion: ${completed.status}`);
    }

    const archived = archiveTask(context, task.id, { archivedAt: "2026-04-10T12:00:00.000Z" });
    if (archived.status !== "archived") {
      throw new Error(`Unexpected status after archive: ${archived.status}`);
    }

    const archivedList = listTasks(context, { status: "archived" });
    if (archivedList.length !== 1 || archivedList[0].id !== task.id) {
      throw new Error("Expected archived task in archived listing.");
    }
  });
});

test("generateReview writes markdown output and stores review metadata", () => {
  withTempContext((context) => {
    const reviewDate = "2026-04-10";
    const nextDay = shiftDate(reviewDate, 1);

    const completedTask = createTask(context, {
      title: "Completed Task",
      projectName: "project-seeder",
      dueDate: reviewDate,
      priority: "high",
      createdAt: "2026-04-09T09:00:00.000Z"
    });
    markTaskDone(context, completedTask.id, { completedAt: "2026-04-10T09:00:00.000Z" });

    const movedTask = createTask(context, {
      title: "Moved Task",
      projectName: "study-ops",
      dueDate: reviewDate,
      priority: "medium",
      createdAt: "2026-04-09T10:00:00.000Z"
    });
    rescheduleTask(context, movedTask.id, { dueDate: nextDay, changedAt: "2026-04-10T11:00:00.000Z" });

    createTask(context, {
      title: "Still Open",
      projectName: "research-vault",
      dueDate: reviewDate,
      priority: "low",
      createdAt: "2026-04-09T12:00:00.000Z"
    });

    const summary = generateReview(context, {
      date: reviewDate,
      generatedAt: "2026-04-10T18:00:00.000Z"
    });

    if (summary.completedCount !== 1 || summary.rescheduledCount !== 1 || summary.unfinishedCount !== 1) {
      throw new Error(`Unexpected review counts: ${JSON.stringify(summary)}`);
    }

    const outputPath = path.join(context.projectRoot, summary.filePath);
    if (!fs.existsSync(outputPath)) {
      throw new Error("Expected review markdown output file.");
    }

    const markdown = fs.readFileSync(outputPath, "utf8");
    if (!markdown.includes("# Study Review 2026-04-10")) {
      throw new Error(`Unexpected markdown output: ${markdown}`);
    }

    const db = openDatabase(context);
    try {
      const reviewRow = db.prepare("SELECT review_date, file_path FROM reviews WHERE review_date = ?").get(reviewDate);
      if (!reviewRow || reviewRow.file_path !== summary.filePath) {
        throw new Error("Expected review metadata to be stored in sqlite.");
      }
    } finally {
      db.close();
    }
  });
});

test("buildStats summarizes counts by project and priority", () => {
  withTempContext((context) => {
    const today = formatLocalDate(new Date(2026, 3, 10));
    createTask(context, { title: "High A", projectName: "study-ops", dueDate: today, priority: "high" });
    const doneTask = createTask(context, { title: "Medium B", projectName: "research-vault", priority: "medium" });
    markTaskDone(context, doneTask.id, { completedAt: "2026-04-10T08:00:00.000Z" });

    const stats = buildStats(context);
    if (stats.overall.total !== 2 || stats.overall.done !== 1 || stats.overall.open !== 1) {
      throw new Error(`Unexpected overall stats: ${JSON.stringify(stats.overall)}`);
    }
    if (!stats.byProject.some((entry) => entry.name === "study-ops" && entry.open === 1)) {
      throw new Error("Expected project stats for study-ops.");
    }
  });
});

test("advanceDate supports daily weekly and monthly rules", () => {
  if (advanceDate("2026-04-10", "daily") !== "2026-04-11") {
    throw new Error("Expected daily advance to move by one day.");
  }
  if (advanceDate("2026-04-10", "weekly") !== "2026-04-17") {
    throw new Error("Expected weekly advance to move by seven days.");
  }
  if (advanceDate("2026-04-10", "monthly") !== "2026-05-10") {
    throw new Error("Expected monthly advance to move by one month.");
  }
});

test("runCli supports add repeat done archive and stats flows", async () => {
  const projectRoot = createTempProjectRoot();
  const context = createAppContext(projectRoot);
  ensureProjectDirectories(context);

  try {
    const addOutput = makeOutputBuffer();
    await runCli(["add", "--title", "CLI Task", "--project", "study-ops", "--priority", "high", "--due", "2026-04-10", "--repeat", "daily"], { context, stdout: addOutput });
    if (!addOutput.value().includes("Repeat: daily")) {
      throw new Error(`Unexpected add output: ${addOutput.value()}`);
    }

    const doneOutput = makeOutputBuffer();
    await runCli(["done", "1"], { context, stdout: doneOutput });
    if (!doneOutput.value().includes("Next Recurring Task: [2] due 2026-04-11")) {
      throw new Error(`Unexpected done output: ${doneOutput.value()}`);
    }

    const archiveOutput = makeOutputBuffer();
    await runCli(["archive", "1"], { context, stdout: archiveOutput });
    if (!archiveOutput.value().includes("Archived task 1: CLI Task")) {
      throw new Error(`Unexpected archive output: ${archiveOutput.value()}`);
    }

    const archivedList = makeOutputBuffer();
    await runCli(["list", "--status", "archived"], { context, stdout: archivedList });
    if (!archivedList.value().includes("CLI Task")) {
      throw new Error(`Unexpected archived list output: ${archivedList.value()}`);
    }

    const statsOutput = makeOutputBuffer();
    await runCli(["stats"], { context, stdout: statsOutput });
    if (!statsOutput.value().includes("archived: 1")) {
      throw new Error(`Unexpected stats output: ${statsOutput.value()}`);
    }

    const task = getTask(context, 2);
    if (task.status !== "open" || task.repeatRule !== "daily") {
      throw new Error(`Expected spawned recurring task to stay open, received ${JSON.stringify(task)}`);
    }
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

(async () => {
  let passed = 0;
  for (const entry of tests) {
    try {
      await entry.fn();
      process.stdout.write(`PASS ${entry.name}\n`);
      passed += 1;
    } catch (error) {
      process.stdout.write(`FAIL ${entry.name}\n`);
      process.stdout.write(`${error.stack || error.message}\n`);
      process.exit(1);
    }
  }

  process.stdout.write(`\nAll ${passed} tests passed.\n`);
})();