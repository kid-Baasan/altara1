// LOCAL ONLY: wipes the local D1 database, then re-applies migrations and the seed.
// Never touches a remote database.
import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

rmSync('.wrangler/state/v3/d1', { recursive: true, force: true });
console.log('Local D1 state removed.');
for (const script of ['db:migrate:local', 'db:seed:local']) {
  execSync(`npm run ${script}`, { stdio: 'inherit' });
}
