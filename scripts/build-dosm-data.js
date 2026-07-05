#!/usr/bin/env node
/**
 * build-dosm-data.js — Build-time DOSM data refresh
 *
 * Downloads the latest DOSM OD parquets, processes them into JSON,
 * and writes to public/. This runs during `next build` so every
 * Cloudflare deployment includes fresh data.
 *
 * Falls back silently if Python/pandas unavailable (uses existing files).
 * Usage: node scripts/build-dosm-data.js
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SCRIPT_DIR = path.join(__dirname, '..', 'mini-services', 'dosm-sync');
const PYTHON_SCRIPT = path.join(SCRIPT_DIR, 'process_od_parquet.py');

function run(cmd, opts = {}) {
  try {
    const result = spawnSync(cmd[0], cmd.slice(1), {
      stdio: 'pipe',
      timeout: 120_000,
      ...opts,
    });
    return { ok: result.status === 0, stdout: result.stdout?.toString(), stderr: result.stderr?.toString(), code: result.status };
  } catch (e) {
    return { ok: false, stderr: e.message };
  }
}

function log(msg) {
  console.log(`[build-dosm-data] ${msg}`);
}

function main() {
  log('Starting build-time DOSM data refresh...');

  // 1. Check Python availability
  const pythonCheck = run(['python3', '--version']);
  if (!pythonCheck.ok) {
    log('⚠ Python3 not available — skipping DOSM data refresh (using existing files)');
    return;
  }
  log(`✓ ${pythonCheck.stdout.trim()}`);

  // 2. Check/install pandas + pyarrow
  const pandasCheck = run(['python3', '-c', 'import pandas; import pyarrow; print("OK")']);
  if (!pandasCheck.ok) {
    log('Installing pandas + pyarrow...');
    const pipResult = run(['python3', '-m', 'pip', 'install', 'pandas', 'pyarrow', '-q', '--break-system-packages']);
    if (!pipResult.ok) {
      log('⚠ Failed to install pandas/pyarrow — skipping');
      return;
    }
    log('✓ pandas + pyarrow installed');
  } else {
    log('✓ pandas + pyarrow available');
  }

  // 3. Ensure output directory exists
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // 4. Run the Python processing script with --download flag
  log('Processing DOSM OD parquets...');
  const result = run(['python3', PYTHON_SCRIPT, '--download'], {
    env: {
      ...process.env,
      OUTPUT_DIR: PUBLIC_DIR,
      AUTO_DOWNLOAD: 'true',
      CI: 'true',
      PATH: process.env.PATH,
    },
  });

  if (!result.ok) {
    log('⚠ Processing failed (using existing files):');
    if (result.stderr) {
      result.stderr.split('\n').forEach(line => {
        if (line.trim()) log(`  ${line}`);
      });
    }
    return;
  }

  // 5. Verify output
  const outputFile = path.join(PUBLIC_DIR, 'dosm-od-daily-totals.json');
  if (fs.existsSync(outputFile)) {
    const stat = fs.statSync(outputFile);
    log(`✓ dosm-od-daily-totals.json: ${(stat.size / 1024).toFixed(1)} KB`);

    // Read and log the data_as_of
    try {
      const data = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      log(`✓ data_as_of: ${data.data_as_of}, rows: ${data.row_count}`);
    } catch {}
  } else {
    log('⚠ Output file not created');
  }

  // Also download fresh metadata
  log('Downloading fresh metadata...');
  const metaUrls = {
    'dosm-meta-rapidrail.json': 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_rapidrail_daily.json',
    'dosm-meta-brt.json': 'https://raw.githubusercontent.com/data-gov-my/datagovmy-meta/main/data-catalogue/ridership_od_brt_daily.json',
  };

  // Use curl for downloading (available in CF build environment)
  for (const [filename, url] of Object.entries(metaUrls)) {
    const curlResult = run(['curl', '-sL', '--max-time', '15', url, '-o', path.join(PUBLIC_DIR, filename)]);
    if (curlResult.ok) {
      const size = fs.statSync(path.join(PUBLIC_DIR, filename)).size;
      log(`✓ ${filename}: ${size} bytes`);
    } else {
      log(`⚠ Failed to download ${filename}`);
    }
  }

  log('Build-time DOSM data refresh complete.');
}

main();