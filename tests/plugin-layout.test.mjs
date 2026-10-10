import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const skillNames = ['adversarial-review', 'cancel', 'rescue', 'result', 'review', 'setup', 'status'];

test('both marketplaces install the same self-contained plugin root', () => {
  const portable = readJson('plugin.json');
  const claude = readJson('.claude-plugin/plugin.json');
  const claudeMarket = readJson('.claude-plugin/marketplace.json');
  const codexMarket = readJson('.agents/plugins/marketplace.json');
  assert.equal(portable.name, 'kimi-code');
  assert.equal(claude.name, portable.name);
  assert.equal(claude.version, portable.version);
  assert.equal(path.resolve(root, claudeMarket.plugins[0].source), root);
  assert.equal(codexMarket.plugins[0].source.source, 'local');
  assert.equal(path.resolve(root, codexMarket.plugins[0].source.path), root);
  assert.equal(codexMarket.plugins[0].name, portable.name);
  assert.equal(codexMarket.plugins[0].policy.installation, 'AVAILABLE');
  assert.ok(codexMarket.plugins[0].policy.authentication);
  assert.ok(codexMarket.plugins[0].category);
  assert.deepEqual(claude.agents, ['./harnesses/claude/agents/kimi-rescue.md']);
  assert.ok(fs.existsSync(path.join(root, claude.agents[0])));
});

test('the seven shared skills preserve explicit-only invocation on both hosts', () => {
  const explicit = new Set(['review', 'adversarial-review', 'status', 'result', 'cancel']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'skills')).sort(), skillNames);
  for (const name of skillNames) {
    const dir = path.join(root, 'skills', name);
    const skill = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    const header = skill.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(header, `${name}: YAML frontmatter`);
    assert.match(header[1], new RegExp(`^name: ${name}$`, 'm'));
    assert.match(header[1], /^description: .+/m);
    assert.equal(/^disable-model-invocation: true$/m.test(header[1]), explicit.has(name), name);
    const policy = fs.readFileSync(path.join(dir, 'agents/openai.yaml'), 'utf8');
    assert.match(policy, new RegExp(`allow_implicit_invocation: ${!explicit.has(name)}`), name);
  }
});

test('skill and harness Markdown references resolve inside the installed plugin', () => {
  function check(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) check(file);
      else if (entry.name.endsWith('.md')) {
        const text = fs.readFileSync(file, 'utf8');
        for (const [, link] of text.matchAll(/\]\(([^)]+)\)/g)) {
          if (/^https?:/.test(link) || link.startsWith('#')) continue;
          const target = path.resolve(path.dirname(file), link.split('#')[0]);
          assert.ok(target.startsWith(root + path.sep), `${file}: ${link} leaves the plugin`);
          assert.ok(fs.existsSync(target), `${file}: missing ${link}`);
        }
      }
    }
  }
  check(path.join(root, 'skills'));
  check(path.join(root, 'harnesses'));
});

test('relocated runtime finds its resources and keeps jobs in the target worktree', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi-layout-test-'));
  try {
    const installed = path.join(temp, 'installed plugin');
    const project = path.join(temp, 'target project');
    const bin = path.join(temp, 'bin');
    fs.mkdirSync(installed);
    fs.mkdirSync(project);
    fs.mkdirSync(bin);
    fs.cpSync(path.join(root, 'runtime'), path.join(installed, 'runtime'), { recursive: true });
    fs.writeFileSync(path.join(bin, 'kimi'), `#!${process.execPath}
const args = process.argv.slice(2);
if (args[0] === '--version') console.log('fake-kimi');
else if (args[0] === 'doctor') console.log('ok');
else {
  console.log(JSON.stringify({ cwd: process.cwd(), args }));
  console.error('To resume this session: kimi -r fixture-session');
}
`, { mode: 0o755 });
    const git = (args) => {
      const result = spawnSync('git', args, { cwd: project, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    };
    git(['init', '-q']);
    // An untracked file is sufficient, including when the repository has no HEAD.
    fs.writeFileSync(path.join(project, 'change.txt'), 'review me\n');
    const script = path.join(installed, 'runtime/kimi-companion.mjs');
    const run = (...args) => spawnSync(process.execPath, [script, ...args], {
      cwd: project,
      env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      encoding: 'utf8',
      timeout: 10000,
    });
    const review = run('review', '--wait', '--model', 'fixture-model');
    assert.equal(review.status, 0, review.stderr);
    const invocation = JSON.parse(review.stdout);
    assert.equal(fs.realpathSync(invocation.cwd), fs.realpathSync(project));
    assert.deepEqual(invocation.args.slice(2), ['-m', 'fixture-model']);
    assert.equal(invocation.args[0], '-p');
    assert.match(invocation.args[1], /git diff HEAD/);
    assert.match(invocation.args[1], /"verdict"/);
    assert.doesNotMatch(invocation.args[1], /\{\{(?:DIFF_COMMAND|SCHEMA)\}\}/);
    const state = JSON.parse(fs.readFileSync(path.join(project, '.kimi-plugin/jobs.json'), 'utf8'));
    assert.equal(state.jobs.length, 1);
    const job = state.jobs[0];
    assert.equal(job.cmd, 'review');
    assert.equal(job.status, 'completed');
    assert.ok(job.outputFile.startsWith(fs.realpathSync(project) + path.sep));
    const result = run('result', job.id);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /fixture-model/);
    assert.equal(fs.existsSync(path.join(installed, '.kimi-plugin')), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
