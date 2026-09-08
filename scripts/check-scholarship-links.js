const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const reportDir = path.join(root, 'reports');

const offline = process.argv.includes('--offline');
const concurrency = 5;
const timeoutMs = 15000;
const staleDays = 180;

const files = fs.readdirSync(dataDir)
  .filter(name => /^scholarships\..+\.json$/.test(name))
  .sort();

const records = files.flatMap(file =>
  JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'))
    .map(record => ({
      ...record,
      sourceFile: file
    }))
);

const today = new Date();

function ageInDays(value) {
  if (!value) return null;

  return Math.floor(
    (today - new Date(`${value}T00:00:00Z`)) / 86400000
  );
}

async function inspect(record) {
  const started = Date.now();

  if (offline) {
    return {
      id: record.id,
      title: record.title,
      url: record.url,
      sourceFile: record.sourceFile,
      status: 'offline',
      verifiedOn: record.verifiedOn || null,
      ageDays: ageInDays(record.verifiedOn)
    };
  }

  try {
    const response = await fetch(record.url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'MediaJobsReport-ScholarshipMonitor/1.0 (+https://www.mediajobsreport.com/)'
      }
    });

    const blocked =
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429;

    return {
      id: record.id,
      title: record.title,
      url: record.url,
      finalUrl: response.url,
      sourceFile: record.sourceFile,
      httpStatus: response.status,
      status: blocked
        ? 'blocked'
        : response.ok
          ? response.redirected
            ? 'redirected'
            : 'working'
          : 'broken',
      redirected: response.redirected,
      verifiedOn: record.verifiedOn || null,
      ageDays: ageInDays(record.verifiedOn),
      responseMs: Date.now() - started
    };
  } catch (error) {
    return {
      id: record.id,
      title: record.title,
      url: record.url,
      sourceFile: record.sourceFile,
      status: 'error',
      error: error.name === 'TimeoutError'
        ? 'Timed out'
        : error.message,
      verifiedOn: record.verifiedOn || null,
      ageDays: ageInDays(record.verifiedOn),
      responseMs: Date.now() - started
    };
  }
}

async function mapLimited(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      run
    )
  );

  return results;
}

function markdown(report) {
  const flagged = report.results.filter(item =>
    ['broken', 'error', 'redirected', 'blocked'].includes(item.status) ||
    item.ageDays === null ||
    item.ageDays > staleDays
  );

  const lines = [
    '# MJR Scholarship Link Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `- Records checked: ${report.total}`,
    `- Working: ${report.counts.working || 0}`,
    `- Redirected: ${report.counts.redirected || 0}`,
    `- Access blocked: ${report.counts.blocked || 0}`,
    `- Broken: ${report.counts.broken || 0}`,
    `- Errors/timeouts: ${report.counts.error || 0}`,
    `- Review older than ${staleDays} days: ${report.stale}`,
    '',
    '## Items needing review',
    ''
  ];

  if (!flagged.length) {
    lines.push('No items were flagged.');
  } else {
    lines.push(
      '| Status | Scholarship | HTTP | Last reviewed | Link |',
      '|---|---|---:|---|---|'
    );

    for (const item of flagged) {
      lines.push(
        `| ${item.status} | ${item.title.replace(/\|/g, '\\|')} | ${item.httpStatus || '—'} | ${item.verifiedOn || 'Missing'} | [Open](${item.url}) |`
      );
    }
  }

  lines.push(
    '',
    '> Blocked responses may be bot protection rather than broken pages. Review them manually before changing or removing a record.',
    ''
  );

  return lines.join('\n');
}

(async () => {
  const results = await mapLimited(
    records,
    concurrency,
    inspect
  );

  const counts = results.reduce(
    (all, item) => ({
      ...all,
      [item.status]: (all[item.status] || 0) + 1
    }),
    {}
  );

  const report = {
    generatedAt: new Date().toISOString(),
    mode: offline ? 'offline' : 'live',
    total: results.length,
    counts,
    stale: results.filter(item =>
      item.ageDays === null ||
      item.ageDays > staleDays
    ).length,
    results
  };

  fs.mkdirSync(reportDir, {
    recursive: true
  });

  fs.writeFileSync(
    path.join(reportDir, 'scholarship-link-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );

  const md = markdown(report);

  fs.writeFileSync(
    path.join(reportDir, 'scholarship-link-report.md'),
    `${md}\n`
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${md}\n`
    );
  }

  console.log(
    `Checked ${report.total} scholarship records: ` +
    `${counts.working || 0} working, ` +
    `${counts.redirected || 0} redirected, ` +
    `${counts.blocked || 0} blocked, ` +
    `${counts.broken || 0} broken, ` +
    `${counts.error || 0} errors, ` +
    `${report.stale} stale.`
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
