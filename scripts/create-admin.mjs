// LOCAL ONLY: creates (or resets the password of) an admin user in the local D1 database.
//   npm run create-admin
// Prompts for email and password. For automation, set ADMIN_EMAIL and ADMIN_PASSWORD instead.
// Uses wrangler's local platform proxy, so it can never touch a remote database.
import readline from 'node:readline';
import { getPlatformProxy } from 'wrangler';
import { hashPassword } from '../src/lib/auth-crypto.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (text) => {
        if (text.includes(question)) process.stdout.write(question);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const email = (process.env.ADMIN_EMAIL ?? (await ask('Admin email: '))).trim().toLowerCase();
if (!EMAIL.test(email) || email.length > 200) {
  console.error('That does not look like a valid email address.');
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await ask('Password (12+ characters): ', { hidden: true });
  const again = await ask('Repeat password: ', { hidden: true });
  if (password !== again) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
}
if (password.length < 12 || password.length > 200) {
  console.error('The password must be 12 to 200 characters long.');
  process.exit(1);
}

const { env, dispose } = await getPlatformProxy({ persist: { path: '.wrangler/state/v3' } });
try {
  const hash = await hashPassword(password);
  const existing = await env.DB.prepare('SELECT id FROM admin_users WHERE email = ?').bind(email).first();
  if (existing) {
    await env.DB.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').bind(hash, existing.id).run();
    console.log(`Updated the password for ${email} (local database).`);
  } else {
    await env.DB.prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)').bind(email, hash).run();
    console.log(`Created admin ${email} (local database).`);
  }
} finally {
  await dispose();
}
