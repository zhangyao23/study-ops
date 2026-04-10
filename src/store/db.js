const { DatabaseSync } = require("node:sqlite");
const { ensureProjectDirectories } = require("../lib/paths");

function ensureColumn(db, tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

function openDatabase(context) {
  ensureProjectDirectories(context);

  const db = new DatabaseSync(context.databasePath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      project_name TEXT,
      due_date TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      archived_at TEXT,
      repeat_rule TEXT,
      source_task_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_date TEXT NOT NULL UNIQUE,
      file_path TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      summary_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_name ON tasks(project_name);
    CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_events_type ON task_events(event_type);
  `);

  ensureColumn(db, "tasks", "repeat_rule", "TEXT");
  ensureColumn(db, "tasks", "source_task_id", "INTEGER");

  return db;
}

function withTransaction(db, action) {
  db.exec("BEGIN");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failures and surface the original error.
    }
    throw error;
  }
}

module.exports = {
  openDatabase,
  withTransaction
};