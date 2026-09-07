const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'data', 'scholarships.manual.json');
const outputPath = path.join(root, 'public', 'scholarships.json');
const checkOnly = process.argv.includes('--check');

const GROUPS = new Set(['media', 'general']);
const CATEGORIES = new Set([
  'Journalism & News', 'Radio & Podcasting', 'Television & Video', 'Digital Media',
  'Public Relations & Communications', 'Music Industry', 'Production & Multimedia',
  'Broadcast Engineering & Technology', 'Advertising & Media Sales',
  'Any Major', 'Academic Achievement', 'Financial Need', 'Community Service',
  'First-Generation Students', 'Veterans & Military Families', 'Diversity & Identity',
  'Geographic & State Residency', 'Employer, Union & Family Affiliations'
]);

function isIsoDate(value) {
  if (value === null) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validate(item, index, ids) {
  const label = `Record ${index + 1}`;
  for (const field of ['id', 'title', 'provider', 'programGroup', 'url', 'sourceUrl']) {
    if (!item[field] || typeof item[field] !== 'string') throw new Error(`${label}: missing ${field}`);
  }
  if (ids.has(item.id)) throw new Error(`${label}: duplicate id ${item.id}`);
  ids.add(item.id);
  if (!GROUPS.has(item.programGroup)) throw new Error(`${label}: invalid programGroup`);
  if (!Array.isArray(item.categories) || !item.categories.length) throw new Error(`${label}: categories required`);
  for (const category of item.categories) {
    if (!CATEGORIES.has(category)) throw new Error(`${label}: unknown category ${category}`);
  }
  for (const field of ['url', 'sourceUrl']) {
    let parsed;
    try { parsed = new URL(item[field]); } catch { throw new Error(`${label}: invalid ${field}`); }
    if (parsed.protocol !== 'https:') throw new Error(`${label}: ${field} must use HTTPS`);
  }
  for (const field of ['deadline', 'opens', 'verifiedOn']) {
    if (!isIsoDate(item[field] ?? null)) throw new Error(`${label}: invalid ${field}`);
  }
}

const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(records)) throw new Error('Scholarship source must be an array');
const ids = new Set();
records.forEach((record, index) => validate(record, index, ids));

const today = new Date().toISOString().slice(0, 10);
const active = records.filter(item => !item.deadline || item.deadline >= today || item.recurring);
active.sort((a, b) => {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  if (!a.deadline && b.deadline) return 1;
  if (a.deadline && !b.deadline) return -1;
  return (a.deadline || '').localeCompare(b.deadline || '') || a.title.localeCompare(b.title);
});

const feed = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  count: active.length,
  records: active
};

if (!checkOnly) {
  fs.writeFileSync(outputPath, `${JSON.stringify(feed, null, 2)}\n`);
  fs.copyFileSync(path.join(root, 'src', 'app.js'), path.join(root, 'public', 'app.js'));
  fs.copyFileSync(path.join(root, 'src', 'styles.css'), path.join(root, 'public', 'styles.css'));
}
console.log(`${checkOnly ? 'Validated' : 'Built'} ${active.length} active scholarship records.`);
