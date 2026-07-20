const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RUNTIME_FILE = path.join(os.tmpdir(), 'bh-mysql-integration-runtime.json');

function runDocker(args) {
  return execFileSync('docker', args, {
    stdio: 'pipe',
    encoding: 'utf8',
  }).trim();
}

module.exports = async () => {
  if (!fs.existsSync(RUNTIME_FILE)) return;

  const runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));

  try {
    runDocker(['rm', '-f', runtime.containerName]);
  } catch (_error) {
    // best effort cleanup
  }

  fs.unlinkSync(RUNTIME_FILE);
};
