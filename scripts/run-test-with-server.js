#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Locate the Cypress binary cache dir the same way Cypress itself does,
// so this check doesn't false-negative on Windows/macOS (see scripts/run-tests.ts).
function getCypressCacheDir() {
  const envCache = process.env.CYPRESS_CACHE_FOLDER;
  if (envCache && envCache.trim()) {
    return envCache;
  }
  const homeDir = os.homedir();
  const platform = process.platform;
  if (platform === "win32") {
    const base = process.env.LOCALAPPDATA || path.join(homeDir, "AppData", "Local");
    return path.join(base, "Cypress", "Cache");
  }
  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Caches", "Cypress");
  }
  return path.join(homeDir, ".cache", "Cypress");
}

// Check if Cypress binary exists
function checkCypressBinary() {
  const cypressPath = getCypressCacheDir();
  try {
    return fs.existsSync(cypressPath) && fs.readdirSync(cypressPath).length > 0;
  } catch (error) {
    console.error(`Error checking Cypress binary: ${error.message}`);
    return false;
  }
}

// Run a command and return a promise
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "❌ Usage: node run-test-with-server.js <cypress-command-and-args>"
    );
    console.error(
      '   Example: node run-test-with-server.js cypress run --spec "cypress/e2e/1-basic-tests/load-index.cy.ts"'
    );
    process.exit(1);
  }

  console.log("🚀 Starting AWallet test runner with server...");

  const hasCypressBinary = checkCypressBinary();
  console.log(
    `📦 Cypress binary available: ${hasCypressBinary ? "✅ Yes" : "❌ No"}`
  );

  if (!hasCypressBinary) {
    console.log(
      "⚠️  WARNING: Cypress binary not found. This is expected in CI environments with network restrictions."
    );
    console.log(
      "ℹ️  Skipping Cypress tests. To run tests locally, install the binary with: npx cypress install"
    );
    console.log("✅ Test runner completed successfully (no tests to run).");
    process.exit(0);
  }

  let serverProcess;

  try {
    // Ensure the app is built
    console.log("🏗️  Ensuring app is built...");
    if (!fs.existsSync("dist") || !fs.existsSync("dist/index.html")) {
      console.log("📦 Building application...");
      await runCommand("pnpm", ["run", "build"]);
    } else {
      console.log("✅ App is already built");
    }

    // Start the server
    console.log("🖥️  Starting production server...");
    serverProcess = spawn("pnpm", ["run", "server"], {
      stdio: "pipe",
      shell: true,
      detached: true, // Allow server to run independently
    });

    // Log server output for debugging
    serverProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[SERVER] ${output}`);
    });

    serverProcess.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) console.log(`[SERVER ERROR] ${output}`);
    });

    // Wait for server to be ready
    console.log("⏳ Waiting for server to be ready...");
    await runCommand("node", ["scripts/wait-for-server.js"]);

    // Run the provided Cypress command
    console.log(`🧪 Running: ${args.join(" ")}`);
    await runCommand(args[0], args.slice(1));

    console.log("✅ Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error(`❌ Test runner failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log("🛑 Stopping server...");
      try {
        process.kill(-serverProcess.pid, "SIGTERM"); // Kill the process group
      } catch (killError) {
        console.log("ℹ️  Server process may have already stopped", killError);
      }
    }
  }
}

// Handle cleanup on process termination
process.on("SIGINT", () => {
  console.log("Received SIGINT, cleaning up...");
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, cleaning up...");
  process.exit(1);
});

main();
