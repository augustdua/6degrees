/**
 * Forum diagnostics runner (Postgres)
 * Usage: node scripts/db/run-forum-diagnostics.js
 *
 * - Reuses the DB connection string already present in scripts/db/check-storage.js
 * - Executes supabase/scripts/forum_diagnostics.sql
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function toPoolerUrlIfDirectSupabaseHost(connectionString) {
  try {
    const u = new URL(connectionString);
    const host = u.hostname || '';
    const directMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!directMatch) return null;

    const projectRef = directMatch[1];
    const password = u.password || '';
    const dbName = (u.pathname || '/postgres').replace(/^\//, '') || 'postgres';

    // Pooler expects username "postgres.<projectRef>"
    const poolerUser = `postgres.${projectRef}`;

    const poolerHost = process.env.SUPABASE_POOLER_HOST || 'aws-1-eu-north-1.pooler.supabase.com';
    const poolerPort = process.env.SUPABASE_POOLER_PORT || '6543';

    const poolerUrl = new URL(`postgresql://${poolerUser}:${encodeURIComponent(password)}@${poolerHost}:${poolerPort}/${dbName}`);
    return poolerUrl.toString();
  } catch {
    return null;
  }
}

function loadConnectionStringFromCheckStorage() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const checkStoragePath = path.join(repoRoot, 'scripts', 'db', 'check-storage.js');

  if (!fs.existsSync(checkStoragePath)) {
    throw new Error(`Missing file: ${checkStoragePath}`);
  }

  const content = fs.readFileSync(checkStoragePath, 'utf8');
  const match = content.match(/CONNECTION_STRING\s*=\s*['"]([^'"]+)['"]/i);
  if (!match) {
    throw new Error(`Could not find CONNECTION_STRING in ${checkStoragePath}`);
  }
  return match[1];
}

function loadSqlFile() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const sqlPath = path.join(repoRoot, 'supabase', 'scripts', 'forum_diagnostics.sql');

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Missing SQL file: ${sqlPath}`);
  }

  return fs.readFileSync(sqlPath, 'utf8');
}

function stripLeadingSqlComments(sql) {
  // Remove leading BOM, whitespace, and leading line comments ("-- ...")
  const lines = sql.replace(/^\uFEFF/, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('--')) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n').trimStart();
}

function safeDbInfo(connectionString) {
  // Do not print password; just show host/port/db/user.
  const u = new URL(connectionString);
  return {
    host: u.hostname,
    port: u.port || '(default)',
    database: u.pathname?.replace(/^\//, '') || '(default)',
    user: decodeURIComponent(u.username || ''),
  };
}

async function run() {
  const connectionString = process.env.DATABASE_URL || loadConnectionStringFromCheckStorage();
  const sql = loadSqlFile();

  console.log('=== Forum Diagnostics ===');
  console.log('DB:', safeDbInfo(connectionString));
  console.log('');

  const tryConnect = async (connStr) => {
    const client = new Client({ connectionString: connStr });
    await client.connect();
    return client;
  };

  let client;
  try {
    try {
      client = await tryConnect(connectionString);
    } catch (err) {
      // If direct host DNS fails, auto-retry via pooler
      const msg = String(err && err.message ? err.message : err);
      const shouldRetry =
        /getaddrinfo|ENOTFOUND|could not translate host name/i.test(msg);

      const pooler = shouldRetry ? toPoolerUrlIfDirectSupabaseHost(connectionString) : null;
      if (!pooler) throw err;

      console.log('⚠️ Direct DB host not reachable; retrying via Supabase pooler...');
      console.log('DB (pooler):', safeDbInfo(pooler));
      console.log('');
      client = await tryConnect(pooler);
    }

    console.log('✅ Connected\n');

    // Split into statements by semicolon-newline boundary.
    // (forum_diagnostics.sql is simple SELECT-only; this is sufficient.)
    const statements = sql
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s + ';');

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const normalized = stripLeadingSqlComments(stmt);
      const isSelect = /^\s*select\b/i.test(normalized);
      if (!isSelect) continue;

      const res = await client.query(stmt);
      console.log(`--- Query ${i + 1} (${res.rowCount} rows) ---`);
      if (res.rows?.length) {
        console.table(res.rows);
      } else {
        console.log('(no rows)');
      }
      console.log('');
    }

    console.log('✅ Done.');
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
}

run().catch((err) => {
  console.error('❌ Forum diagnostics failed:', err.message);
  process.exitCode = 1;
});


