#!/usr/bin/env node
// Sync the plugin version across both hosts:
//   plugin.json                           -> version (canonical)
//   .claude-plugin/plugin.json             -> version
//
// package.json deliberately has no version field (private, never published)
// and there is no package-lock.json (zero dependencies). Both marketplaces
// resolve versions from their plugin manifests instead of duplicating them.
//
// Usage:
//   node scripts/bump-version.mjs <version>   set both manifest versions
//   node scripts/bump-version.mjs --check     verify both match plugin.json
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const MANIFESTS = ['plugin.json', '.claude-plugin/plugin.json'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, json) {
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

export function checkVersions(root, expected) {
  const mismatches = [];
  for (const file of MANIFESTS) {
    const actual = readJson(path.join(root, file)).version;
    if (actual !== expected) {
      mismatches.push(`${file} version: expected ${expected}, found ${actual ?? '(missing)'}`);
    }
  }
  return mismatches;
}

export function bumpVersion(root, version) {
  if (!SEMVER.test(version)) {
    throw new Error(`Expected a semver-like version such as 1.0.3, got: ${version}`);
  }
  const changed = [];
  for (const file of MANIFESTS) {
    const fullPath = path.join(root, file);
    const json = readJson(fullPath);
    if (json.version !== version) {
      json.version = version;
      writeJson(fullPath, json);
      changed.push(file);
    }
  }
  return changed;
}

function main(argv) {
  const check = argv.includes('--check');
  const version = argv.find((a) => !a.startsWith('-'));

  if (check) {
    const expected = version ?? readJson(path.join(process.cwd(), 'plugin.json')).version;
    const mismatches = checkVersions(process.cwd(), expected);
    if (mismatches.length) {
      console.error(`Version metadata is out of sync:\n${mismatches.join('\n')}`);
      process.exitCode = 1;
      return;
    }
    console.log(`All version metadata matches ${expected}.`);
    return;
  }

  if (!version) {
    console.error('Usage: node scripts/bump-version.mjs <version> | --check [version]');
    process.exitCode = 1;
    return;
  }
  const changed = bumpVersion(process.cwd(), version);
  console.log(`Set version metadata to ${version}: ${changed.length ? changed.join(', ') : 'no files changed'}.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
