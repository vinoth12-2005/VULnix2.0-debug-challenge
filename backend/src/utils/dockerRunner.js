const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { randomUUID } = require('crypto');

const FILE_NAMES   = { python: 'solution.py', java: 'Main.java', c: 'solution.c', cpp: 'solution.cpp' };
const DOCKER_IMAGES = { python: 'python:3.11-alpine', java: 'openjdk:17-alpine', c: 'gcc:latest', cpp: 'gcc:latest' };

// Build the shell command for a given language
function buildCmd(language, tmpDir, useDocker) {
  const runCmds = {
    python: 'python3 solution.py',
    java:   'javac Main.java && java -cp . Main',
    c:      'gcc solution.c -o solution && ./solution',
    cpp:    'g++ solution.cpp -o solution && ./solution',
  };
  const runCmd = runCmds[language];

  if (useDocker) {
    return [
      'docker run --rm', '--network none', '--memory 128m', '--cpus 0.5',
      '--ulimit nproc=50', `--volume "${tmpDir}:/code"`, '--workdir /code',
      DOCKER_IMAGES[language], `sh -c "${runCmd}"`,
    ].join(' ');
  }
  return `cd "${tmpDir}" && ${runCmd}`;
}

// Check docker once
const USE_DOCKER = process.env.USE_DOCKER === 'true';
let isDockerAvailable = false;
if (USE_DOCKER) {
  try { execSync('docker ps', { stdio: 'ignore' }); isDockerAvailable = true; } catch (_) {}
}

/**
 * Run code with a hard timeout and /dev/null stdin so input() calls fail fast.
 * Returns { output, error, executionTime }
 */
function runInDocker(language, code, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const tmpDir = path.join(os.tmpdir(), randomUUID());
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, FILE_NAMES[language]), code, 'utf-8');

    const cmd  = buildCmd(language, tmpDir, USE_DOCKER && isDockerAvailable);
    const start = Date.now();

    // Spawn with /dev/null stdin — prevents input() from hanging
    const child = spawn('bash', ['-c', cmd], {
      stdio: ['ignore', 'pipe', 'pipe'],  // stdin=null, capture stdout+stderr
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    // Hard kill after timeout
    const killer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(killer);
      const execTime = Date.now() - start;
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

      if (execTime >= timeoutMs - 200) {
        resolve({ output: '', error: 'Execution timed out', executionTime: `${execTime}ms`, timedOut: true });
      } else {
        resolve({
          output: stdout.trim(),
          error:  stderr.trim() || (code !== 0 && !stdout.trim() ? 'Execution failed' : ''),
          executionTime: `${execTime}ms`,
          timedOut: false,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(killer);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
      resolve({ output: '', error: err.message, executionTime: `${Date.now() - start}ms`, timedOut: false });
    });
  });
}

module.exports = { runInDocker };
