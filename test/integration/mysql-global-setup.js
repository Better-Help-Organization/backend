const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RUNTIME_FILE = path.join(os.tmpdir(), 'bh-mysql-integration-runtime.json');

function randomPort() {
  return 33060 + Math.floor(Math.random() * 1000);
}

function runDocker(args, options = {}) {
  return execFileSync('docker', args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  }).trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async () => {
  const containerName = `bh-mysql-int-${Date.now()}-${process.pid}`;
  const port = randomPort();
  const runtime = {
    host: '127.0.0.1',
    port,
    user: 'root',
    password: 'bh_test_root',
    database: 'bh_test_integration',
    containerName,
  };

  try {
    runDocker([
      'run',
      '-d',
      '--rm',
      '--name',
      containerName,
      '-e',
      `MYSQL_ROOT_PASSWORD=${runtime.password}`,
      '-e',
      `MYSQL_DATABASE=${runtime.database}`,
      '-p',
      `${runtime.host}:${runtime.port}:3306`,
      'mysql:8.0.35',
      '--default-authentication-plugin=mysql_native_password',
    ]);
  } catch (error) {
    throw new Error(`Failed to start integration MySQL container: ${error.stderr || error.message}`);
  }

  let ready = false;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      runDocker([
        'exec',
        containerName,
        'mysqladmin',
        'ping',
        '-h127.0.0.1',
        '-uroot',
        `-p${runtime.password}`,
        '--silent',
      ]);
      ready = true;
      break;
    } catch (_error) {
      await sleep(2000);
    }
  }

  if (!ready) {
    try {
      runDocker(['rm', '-f', containerName]);
    } catch (_error) {
      // best effort cleanup
    }
    throw new Error('Timed out waiting for the integration MySQL container to become ready.');
  }

  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(runtime), 'utf8');
};
