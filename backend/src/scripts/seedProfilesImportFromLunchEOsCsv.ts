import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  // Minimal CSV parser that supports quoted fields and commas inside quotes.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function slugify(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function normalizeLinkedInUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.endsWith('linkedin.com')) return null;
    const pathname = url.pathname || '';
    if (!pathname.toLowerCase().includes('/in/')) return null;
    url.search = '';
    url.hash = '';
    url.protocol = 'https:';
    url.hostname = 'www.linkedin.com';
    if (!url.pathname.endsWith('/')) url.pathname = `${url.pathname}/`;
    return url.toString();
  } catch {
    return null;
  }
}

function linkedinIdentifierFromUrl(url: string): string | null {
  const m = String(url || '').match(/\/in\/([^/?#]+)\/?/i);
  return m?.[1] ? String(m[1]) : null;
}

function readCsvRows(csvPath: string, opts?: { start?: number; limit?: number }): CsvRow[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);

  const start = Math.max(1, Number(opts?.start || 1)); // 1-based data rows (line index in file)
  const endExclusive = opts?.limit ? Math.min(lines.length, start + Number(opts.limit)) : lines.length;

  const out: CsvRow[] = [];
  for (let li = start; li < endExclusive; li++) {
    const row = parseCsvLine(lines[li]);
    const obj: CsvRow = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = row[i] ?? '';
    out.push(obj);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    if (idx === -1) return null;
    return args[idx + 1] ?? null;
  };

  // Support BOTH flag-style args and positional args (PowerShell/npm sometimes drops "--flag" tokens).
  // Positional convention:
  //   1st = limit, 2nd = start
  const posNums = args.filter((a) => a && !a.startsWith('-') && /^\d+$/.test(a)).map((a) => Number(a));
  const positionalLimit = posNums.length >= 1 ? posNums[0] : undefined;
  const positionalStart = posNums.length >= 2 ? posNums[1] : undefined;

  const start = Number(getArg('--start') || (positionalStart !== undefined ? String(positionalStart) : '1')); // data row index (1 = first row)
  const limit =
    getArg('--limit') !== null
      ? Number(getArg('--limit')!)
      : positionalLimit !== undefined
        ? positionalLimit
        : undefined;
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');

  // Safety: default to a small limit unless explicitly running --all.
  const effectiveLimit = all ? undefined : limit ?? 25;

  const csvPath = path.resolve(process.cwd(), '..', 'LunchEOsCSV.csv');
  const rows = readCsvRows(csvPath, { start, limit: effectiveLimit });

  console.log(
    `[import] rows=${rows.length} start=${start} limit=${all ? '∞' : effectiveLimit ?? '∞'} dryRun=${dryRun} all=${all}`
  );

  let ok = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = String(row['Email'] || '').trim() || null;
    const firstName = String(row['First Name'] || '').trim() || null;
    const lastName = String(row['Last Name'] || '').trim() || null;

    const linkedinUrl = normalizeLinkedInUrl(String(row['Person Linkedin Url'] || '').trim());
    if (!linkedinUrl) {
      skipped++;
      continue;
    }

    const liId = linkedinIdentifierFromUrl(linkedinUrl);
    const slugBase =
      liId ||
      slugify([firstName, lastName].filter(Boolean).join(' ')) ||
      slugify(email || '') ||
      `seed-${start + i}`;

    const slug = slugBase;

    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;

    // Light “headline” from CSV (Title @ Company Name)
    const title = String(row['Title'] || '').trim();
    const company = String(row['Company Name'] || '').trim();
    const headline = [title, company].filter(Boolean).join(' @ ').trim() || null;

    const source = {
      csv: {
        file: 'LunchEOsCSV.csv',
        rowIndex: start + i,
        email,
        linkedinUrl,
      },
      importedAt: new Date().toISOString(),
    };

    if (dryRun) {
      ok++;
      continue;
    }

    const { error } = await supabase
      .from('seed_profiles')
      .upsert(
        {
          slug,
          email,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
          headline,
          linkedin_url: linkedinUrl,
          status: 'unclaimed',
          source,
        },
        { onConflict: 'slug' }
      );

    if (error) {
      console.warn(`[import] failed rowIndex=${start + i} slug=${slug}: ${error.message}`);
      continue;
    }

    ok++;
  }

  console.log(`[import] ok=${ok} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


