import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { PhoneKnowledgeRoot } from '../src/knowledge/phone-knowledge-root.mjs';

async function fixture() {
  const base = await mkdtemp(join(tmpdir(), 'omega-phone-knowledge-'));
  const root = join(base, 'OMEGA-KNOWLEDGE');
  await mkdir(join(root, 'docs'), { recursive: true });
  await writeFile(join(root, 'docs', 'notes.md'), '# Alpha\nOMEGA phone knowledge works.\n');
  await writeFile(join(root, 'docs', 'page.html'), '<h1>Beta</h1><p>Searchable HTML body</p>');
  await writeFile(join(root, 'docs', 'sample.pdf'), Buffer.from('%PDF-fake'));
  return { base, root };
}

test('phone knowledge root lists relative files without exposing absolute device paths', async () => {
  const { base, root } = await fixture();
  try {
    const kb = new PhoneKnowledgeRoot({ root });
    const out = await kb.list({ path: '', recursive: true });
    assert.equal(out.rootName, 'OMEGA-KNOWLEDGE');
    assert.deepEqual(out.entries.map((x) => x.path).sort(), ['docs', 'docs/notes.md', 'docs/page.html', 'docs/sample.pdf']);
    assert.equal(JSON.stringify(out).includes(base), false);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('phone knowledge root reads bounded text and strips basic HTML markup', async () => {
  const { base, root } = await fixture();
  try {
    const kb = new PhoneKnowledgeRoot({ root });
    const md = await kb.read({ path: 'docs/notes.md', maxBytes: 1024 });
    assert.match(md.text, /OMEGA phone knowledge works/);
    assert.equal(md.truncated, false);

    const html = await kb.read({ path: 'docs/page.html', maxBytes: 1024 });
    assert.match(html.text, /Beta/);
    assert.match(html.text, /Searchable HTML body/);
    assert.equal(html.text.includes('<h1>'), false);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('phone knowledge root uses argv-only PDF extraction and can search extracted content', async () => {
  const { base, root } = await fixture();
  const calls = [];
  try {
    const kb = new PhoneKnowledgeRoot({
      root,
      commandRunner: async ({ argv }) => {
        calls.push(argv);
        return { exitCode: 0, stdout: 'Gamma PDF searchable knowledge', stderr: '' };
      }
    });
    const read = await kb.read({ path: 'docs/sample.pdf', maxBytes: 4096 });
    assert.match(read.text, /Gamma PDF/);
    assert.deepEqual(calls[0].slice(0, 2), ['pdftotext', '-layout']);
    assert.equal(calls[0].at(-1), '-');

    const result = await kb.search({ query: 'searchable', recursive: true, maxFiles: 20, maxMatches: 10 });
    assert.ok(result.matches.some((x) => x.path === 'docs/page.html'));
    assert.ok(result.matches.some((x) => x.path === 'docs/sample.pdf'));
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test('phone knowledge root blocks path traversal and symlink escape', async () => {
  const { base, root } = await fixture();
  const outside = join(base, 'outside.txt');
  await writeFile(outside, 'secret');
  await symlink(outside, join(root, 'docs', 'escape.txt'));
  try {
    const kb = new PhoneKnowledgeRoot({ root });
    await assert.rejects(() => kb.read({ path: '../outside.txt' }), /outside knowledge root/i);
    await assert.rejects(() => kb.read({ path: 'docs/escape.txt' }), /outside knowledge root/i);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
