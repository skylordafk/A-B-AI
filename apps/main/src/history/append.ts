import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = path.join(os.homedir(), '.abai', 'history');

export function append(project: string, row: Record<string, unknown>) {
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create filename based on project name
  const filename = path.join(dir, `${project}.jsonl`);

  // Append row with timestamp
  const entry = {
    ...row,
    ts: Date.now(),
  };

  fs.appendFileSync(filename, JSON.stringify(entry) + '\n');
}
