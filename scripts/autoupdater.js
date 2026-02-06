const { spawn, execSync } = require('child_process');
const path = require('path');

// Configuration
const POLLING_INTERVAL_MS = 30000; // 30 seconds
const REPO_DIR = path.resolve(__dirname, '..');

let backendProcess = null;
let frontendProcess = null;
let isUpdating = false;

function log(msg) {
    console.log(`[AutoUpdater] ${new Date().toLocaleTimeString()} ${msg}`);
}

function startApp() {
    if (backendProcess || frontendProcess) return;

    log('Starting application...');

    // Start Backend
    backendProcess = spawn('npm', ['run', 'server:dev'], { cwd: REPO_DIR, stdio: 'inherit', shell: true });
    backendProcess.on('error', (err) => log(`Backend failed to start: ${err.message}`));

    // Start Frontend
    frontendProcess = spawn('npm', ['run', 'dev'], { cwd: REPO_DIR, stdio: 'inherit', shell: true });
    frontendProcess.on('error', (err) => log(`Frontend failed to start: ${err.message}`));
}

function stopApp() {
    log('Stopping application...');

    if (backendProcess) {
        try {
            process.kill(backendProcess.pid); // Might need tree-kill on Windows for thorough cleanup, but this is a start
            // For Windows shell spawned processes, simple kill might not work, but let's try standard first.
            // If 'shell: true' is used, we might be killing the shell, not the node process.
            // On Windows, taskkill is often more reliable.
            if (process.platform === 'win32') {
                try { execSync(`taskkill /pid ${backendProcess.pid} /T /F`); } catch (e) { /* ignore */ }
            } else {
                backendProcess.kill();
            }
        } catch (e) { log(`Error stopping backend: ${e.message}`); }
        backendProcess = null;
    }

    if (frontendProcess) {
        try {
            if (process.platform === 'win32') {
                try { execSync(`taskkill /pid ${frontendProcess.pid} /T /F`); } catch (e) { /* ignore */ }
            } else {
                frontendProcess.kill();
            }
        } catch (e) { log(`Error stopping frontend: ${e.message}`); }
        frontendProcess = null;
    }
}

function checkForUpdates() {
    if (isUpdating) return;

    try {
        // 1. Fetch latest
        execSync('git fetch', { cwd: REPO_DIR, stdio: 'ignore' });

        // 2. Check if behind
        const status = execSync('git status -uno', { cwd: REPO_DIR, encoding: 'utf-8' });

        // "Your branch is behind 'origin/main' by X commits"
        if (status.includes('Your branch is behind')) {
            log('Update detected! Initiating update process...');
            performUpdate();
        } else {
            // log('No updates found.');
        }
    } catch (e) {
        log(`Error checking for updates: ${e.message}`);
    }
}

function performUpdate() {
    isUpdating = true;

    try {
        stopApp();

        log('Pulling changes...');
        execSync('git pull', { cwd: REPO_DIR, stdio: 'inherit' });

        log('Updating root dependencies...');
        execSync('npm install', { cwd: REPO_DIR, stdio: 'inherit' });

        log('Updating server dependencies...');
        execSync('npm install', { cwd: path.join(REPO_DIR, 'server'), stdio: 'inherit' });

        log('Update complete. Restarting app...');
        startApp();
    } catch (e) {
        log(`Update failed: ${e.message}`);
        // Try to restart anyway
        startApp();
    } finally {
        isUpdating = false;
    }
}

// Initial start
startApp();

// Polling loop
setInterval(checkForUpdates, POLLING_INTERVAL_MS);

// Handle exit
process.on('SIGINT', () => {
    stopApp();
    process.exit();
});
