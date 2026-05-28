const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

if (!files.length) {
  console.error('Uso: node test/scripts/e2e-summary.js <json-report> [<json-report>...]');
  process.exit(1);
}

const totals = {
  suites: 0,
  tests: 0,
  passed: 0,
  failed: 0,
  pending: 0,
  durationMs: 0,
};

const readReport = (filePath) => {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
};

for (const file of files) {
  const report = readReport(file);
  totals.suites += report.numTotalTestSuites || 0;
  totals.tests += report.numTotalTests || 0;
  totals.passed += report.numPassedTests || 0;
  totals.failed += report.numFailedTests || 0;
  totals.pending += report.numPendingTests || 0;
  totals.durationMs += report.testResults
    ? report.testResults.reduce((acc, suite) => acc + (suite.endTime - suite.startTime || 0), 0)
    : 0;
}

const percent = totals.tests ? ((totals.passed / totals.tests) * 100).toFixed(1) : '0.0';
const durationSec = (totals.durationMs / 1000).toFixed(2);

console.log('E2E Summary');
console.log(`Suites: ${totals.suites}`);
console.log(`Tests: ${totals.tests}`);
console.log(`Passed: ${totals.passed}`);
console.log(`Failed: ${totals.failed}`);
console.log(`Pending: ${totals.pending}`);
console.log(`Pass rate: ${percent}%`);
console.log(`Duration: ${durationSec}s`);

if (totals.failed > 0) process.exit(1);
