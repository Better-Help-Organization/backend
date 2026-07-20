const fs = require('fs');
const os = require('os');
const path = require('path');

const RUNTIME_FILE = path.join(os.tmpdir(), 'bh-mysql-integration-runtime.json');

if (!fs.existsSync(RUNTIME_FILE)) {
  throw new Error('Missing MySQL integration runtime file. Run the integration suite through the dedicated Jest config.');
}

const runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf8'));

process.env.NODE_ENV = 'test';
process.env.TEST_MYSQL_HOST = runtime.host;
process.env.TEST_MYSQL_PORT = String(runtime.port);
process.env.TEST_MYSQL_USER = runtime.user;
process.env.TEST_MYSQL_PASSWORD = runtime.password;
process.env.TEST_MYSQL_DATABASE = runtime.database;
