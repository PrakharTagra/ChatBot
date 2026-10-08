import os from "os";
import path from "path";
import child_process from "child_process";
import { EventEmitter } from "events";
import { Readable } from "stream";

process.env.CRAWLEE_STORAGE_DIR = process.env.CRAWLEE_STORAGE_DIR || path.join(os.tmpdir(), "crawlee_storage");
process.env.CRAWLEE_PERSIST_STORAGE = "false";
process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE = process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || "1024";

// Shim child_process.spawn for 'ps' command (absent in Vercel / serverless Linux containers)
const originalSpawn = child_process.spawn;
child_process.spawn = function(command, args, options) {
  if (command === "ps") {
    const mockProc = new EventEmitter();
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    mockProc.stdout = stdout;
    mockProc.stderr = stderr;
    mockProc.pid = process.pid;
    mockProc.kill = () => true;

    const isRemy = Array.isArray(args) && args.includes("ppid,pid");
    const rssKb = Math.round(process.memoryUsage().rss / 1024);
    const mockOutput = isRemy
      ? `PPID PID\n0 ${process.pid}\n`
      : `PPID PID STAT RSS COMMAND\n0 ${process.pid} S ${rssKb} node\n`;

    process.nextTick(() => {
      stdout.push(mockOutput);
      stdout.push(null);
      stderr.push(null);
      mockProc.emit("close", 0);
      mockProc.emit("exit", 0);
    });

    return mockProc;
  }
  return originalSpawn.apply(this, arguments);
};

// Shim child_process.execSync for /proc/meminfo in case cat is restricted
const originalExecSync = child_process.execSync;
child_process.execSync = function(command, options) {
  if (typeof command === "string" && command.includes("/proc/meminfo")) {
    try {
      return originalExecSync.apply(this, arguments);
    } catch {
      return "MemTotal: 1048576 kB\nMemFree: 524288 kB\nMemAvailable: 524288 kB\n";
    }
  }
  return originalExecSync.apply(this, arguments);
};
