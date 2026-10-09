import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { KnowledgeFolder } from '../src/core/knowledge-folder.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'omega-knowledge-'));
  await mkdir(join(root, 'docs'), { recursive: true });
  await writeFile(join(root, 'hello.txt'), 'alpha beta gamma\nsecond line\n');
  await writeFile(join(root, 'docs', 'note.md'), '# Note\nOMEGA knowledge search target\n');
  return root;
}

test('knowledge folder lists files with relative paths and metadata', async () => {
  const root = await fixture();
  try {
    const knowledge = new KnowledgeFolder({ root });
    const out = await knowledge.list({ path: '', recursive: true, limit: 20 });
    assert.equal(out.root, root);
    assert.deepEqual(out.entries.map(x => x.path).sort(), ['docs', 'docs/note.md', 'hello.txt']);
    assert.equal(out.entries.find(x => x.path === 'hello.txt')?.kind, 'file');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('knowledge folder reads bounded text slices', async () => {
  const root = await fixture();
  try {
    const knowledge = new KnowledgeFolder({ root });
    const out = await knowledge.read({ path: 'hello.txt', offset: 6, maxBytes: 4 });
    assert.equal(out.text, 'beta');
    assert.equal(out.offset, 6);
    assert.equal(out.nextOffset, 10);
    assert.equal(out.truncated, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('knowledge folder searches supported text documents', async () => {
  const root = await fixture();
  try {
    const knowledge = new KnowledgeFolder({ root });
    const out = await knowledge.search({ query: 'knowledge search', path: '', limit: 10 });
    assert.equal(out.matches.length, 1);
    assert.equal(out.matches[0].path, 'docs/note.md');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('knowledge folder rejects path traversal', async () => {
  const root = await fixture();
  try {
    const knowledge = new KnowledgeFolder({ root });
    await assert.rejects(() => knowledge.read({ path: '../secret.txt' }), /outside knowledge root/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('knowledge folder extracts PDF text through bounded adapter', async () => {
  const root = await fixture();
  try {
    await writeFile(join(root, 'paper.pdf'), '%PDF-fake');
    const calls = [];
    const knowledge = new KnowledgeFolder({
      root,
      pdfText: async ({ path, maxBytes }) => {
        calls.push({ path, maxBytes });
        return 'PDF extracted text';
      }
    });
    const out = await knowledge.read({ path: 'paper.pdf', maxBytes: 1024 });
    assert.equal(out.text, 'PDF extracted text');
    assert.equal(out.format, 'pdf-text');
    assert.equal(calls.length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('control plane exposes configured knowledge folder as read-only', async () => {
  const root = await fixture();
  try {
    const plane = new OmegaControlPlane({ workspaceRoots: [root], knowledgeRoot: root });
    const info = await plane.knowledgeInfo();
    assert.equal(info.configured, true);
    assert.equal(info.readOnly, true);
    const listing = await plane.knowledgeList({ recursive: true, limit: 20 });
    assert.ok(listing.entries.some((entry) => entry.path === 'hello.txt'));
    const read = await plane.knowledgeRead({ path: 'hello.txt', maxBytes: 5 });
    assert.equal(read.text, 'alpha');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('control plane fails closed when knowledge root is not configured', async () => {
  const root = await fixture();
  try {
    const plane = new OmegaControlPlane({ workspaceRoots: [root], knowledgeRoot: null });
    const info = await plane.knowledgeInfo();
    assert.equal(info.configured, false);
    assert.throws(() => plane.knowledgeList({}), /not configured/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});
