#!/usr/bin/env node
/**
 * Quick test: can the DB container be reached?
 * Run: node test-db-connection.js
 */
require('dotenv').config();
const { execSync } = require('child_process');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('No DATABASE_URL in .env');
  process.exit(1);
}
const match = url.match(/@([^:]+):(\d+)\//);
const host = match ? match[1] : 'localhost';
const port = match ? match[2] : '5432';
console.log('DATABASE_URL host:port =', host + ':' + port);

try {
  execSync('docker exec peptides_dev_db psql -U peptides_user -d peptides_db -c "SELECT 1 as ok"', {
    stdio: 'inherit',
  });
  console.log('Docker DB container is reachable.');
} catch (e) {
  console.error('Docker exec failed. Is peptides_dev_db running? Run: bash dev-db.sh start');
  process.exit(1);
}
