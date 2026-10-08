import os from "os";
import path from "path";

process.env.CRAWLEE_STORAGE_DIR = process.env.CRAWLEE_STORAGE_DIR || path.join(os.tmpdir(), "crawlee_storage");
process.env.CRAWLEE_PERSIST_STORAGE = "false";
