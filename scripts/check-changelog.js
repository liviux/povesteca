// The version in package.json must be the newest entry in both changelogs (RO and EN),
// and the two files must list the same releases. Runs with `npm run check` and before every build.
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const { version } = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const releases = (f) => [...read(f).matchAll(/^## \[(.+?)\] - (\d{4}-\d{2}-\d{2})$/gm)].map((m) => `${m[1]} ${m[2]}`);
const ro = releases('CHANGELOG.md'), en = releases('CHANGELOG.en.md');

const errors = [];
if (lock.version !== version || lock.packages?.['']?.version !== version) errors.push(`package-lock.json is not at ${version}; use npm version <major|minor|patch> --no-git-tag-version`);
if (!ro[0]?.startsWith(version + ' ')) errors.push(`CHANGELOG.md starts at ${ro[0] || 'nothing'}, package.json is at ${version}`);
if (ro.join() !== en.join()) errors.push('CHANGELOG.md and CHANGELOG.en.md list different releases or dates');
if (new Set(ro).size !== ro.length) errors.push('CHANGELOG.md lists a release twice');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`changelog: v${version}, ${ro.length} releases, 0 errors`);
