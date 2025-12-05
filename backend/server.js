import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory job store and queue
const jobStore = new Map(); // jobId -> { status, output, error }
const jobQueue = [];

let workerRunning = false;

function log(...args) {
  console.log('[Worker]', ...args);
}

function enqueueJob(job) {
  jobQueue.push(job);
  processJobs();
}

function processJobs() {
  if (workerRunning) return;
  if (jobQueue.length === 0) return;

  const job = jobQueue.shift();
  workerRunning = true;

  executeJob(job)
    .catch(err => {
      console.error('Job execution error:', err);
      const existing = jobStore.get(job.id) || {};
      jobStore.set(job.id, {
        ...existing,
        status: 'ERROR',
        error: err.message || 'Unknown error'
      });
    })
    .finally(() => {
      workerRunning = false;
      setImmediate(processJobs);
    });
}

// Helper to run a command with timeout in a specific working directory
function runCommand(command, args, options = {}) {
  const { cwd, stdin = '', timeoutMs = 8000 } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: process.platform === 'win32' });

    let stdout = '';
    let stderr = '';

    if (stdin && stdin.trim().length > 0) {
      child.stdin.write(stdin);
    }
    child.stdin.end();

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      stderr += '\n[Error] Time limit exceeded.';
      try {
        child.kill('SIGKILL');
      } catch (e) {}
    }, timeoutMs);

    child.on('close', code => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });

    child.on('error', err => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function executeJob(job) {
  const { id, language, code, stdin } = job;
  log(`Starting job ${id} (${language})`);
  jobStore.set(id, { status: 'RUNNING', output: '', error: '' });

  // Create temp directory for this job
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'iicpc-job-'));
  const workDir = tmpBase;

  let fileName;
  let compileCmd = null;
  let compileArgs = [];
  let runCmd = null;
  let runArgs = [];

  switch (language) {
    case 'cpp':
      fileName = 'main.cpp';
      compileCmd = 'g++';
      compileArgs = ['main.cpp', '-O2', '-std=c++17', '-o', 'main'];
      runCmd = process.platform === 'win32' ? 'main.exe' : './main';
      runArgs = [];
      break;
    case 'python':
      fileName = 'main.py';
      runCmd = 'python';
      runArgs = ['main.py'];
      break;
    case 'java':
      fileName = 'Main.java';
      compileCmd = 'javac';
      compileArgs = ['Main.java'];
      runCmd = 'java';
      runArgs = ['Main'];
      break;
    default:
      jobStore.set(id, {
        status: 'ERROR',
        output: '',
        error: 'Unsupported language'
      });
      return;
  }

  const sourcePath = path.join(workDir, fileName);
  fs.writeFileSync(sourcePath, code, 'utf8');

  try {
    if (compileCmd) {
      const compileResult = await runCommand(compileCmd, compileArgs, {
        cwd: workDir,
        timeoutMs: 8000
      });
      if (compileResult.code !== 0) {
        jobStore.set(id, {
          status: 'COMPLETED',
          output: compileResult.stdout,
          error: compileResult.stderr || 'Compilation failed'
        });
        return;
      }
    }

    const runResult = await runCommand(runCmd, runArgs, {
      cwd: workDir,
      stdin: stdin || '',
      timeoutMs: 8000
    });

    jobStore.set(id, {
      status: 'COMPLETED',
      output: runResult.stdout,
      error: runResult.stderr
    });
  } catch (err) {
    jobStore.set(id, {
      status: 'ERROR',
      output: '',
      error: err.message || 'Execution error'
    });
  } finally {
    // Clean up temp directory (best-effort)
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Failed to cleanup temp dir:', e.message);
    }
  }
}

// Routes

app.get('/', (req, res) => {
  res.send('IICPC Text2Tech Backend Running (Local Sandbox)');
});

app.post('/api/submit', (req, res) => {
  const { language, code, stdin } = req.body || {};
  if (!language || !code) {
    return res.status(400).json({ error: 'language and code are required' });
  }

  const id = uuidv4();
  const job = { id, language, code, stdin: stdin || '' };

  jobStore.set(id, { status: 'PENDING', output: '', error: '' });
  enqueueJob(job);

  res.json({ jobId: id });
});

app.get('/api/status/:id', (req, res) => {
  const id = req.params.id;
  if (!jobStore.has(id)) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const job = jobStore.get(id);
  res.json({ jobId: id, ...job });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
  console.log('Running in LOCAL SANDBOX mode (no Docker).');
});
