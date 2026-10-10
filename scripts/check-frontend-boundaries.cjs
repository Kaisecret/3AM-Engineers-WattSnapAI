const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = process.argv[2] || '9c34526';
const changed = execFileSync('git', ['diff', '--name-only', base], { encoding: 'utf8' }).trim().split('\n');
const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split('\n');
const protectedPath = /^(?:src\/app\/api\/|src\/lib\/(?:gemini|supabase|offline)\/|\.env(?:\.|$)|\.github\/|next\.config\.|vercel\.json$)|^src\/features\/[^/]+\/(?:service|repository)\.|^src\/features\/auth\/(?:schemas|types|index)\./;
assert.deepEqual([...new Set([...changed, ...added])].filter(file => protectedPath.test(file)), [], 'Backend, service, secret and deployment files must remain unchanged');
console.log(`PASS: frontend boundaries preserved against ${base}`);
