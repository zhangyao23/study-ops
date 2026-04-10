const fs = require("node:fs");
const path = require("node:path");

function createAppContext(projectRoot = path.resolve(__dirname, "..", "..")) {
  return {
    projectRoot,
    dataProcessedDir: path.join(projectRoot, "data", "processed"),
    databasePath: path.join(projectRoot, "data", "processed", "study-ops.db"),
    outputsDir: path.join(projectRoot, "artifacts", "outputs"),
    logsDir: path.join(projectRoot, "artifacts", "logs"),
    tmpDir: path.join(projectRoot, ".tmp")
  };
}

function ensureProjectDirectories(context) {
  [
    context.dataProcessedDir,
    context.outputsDir,
    context.logsDir,
    context.tmpDir
  ].forEach((directory) => {
    fs.mkdirSync(directory, { recursive: true });
  });
}

function relativeToProject(context, targetPath) {
  return path.relative(context.projectRoot, targetPath);
}

module.exports = {
  createAppContext,
  ensureProjectDirectories,
  relativeToProject
};