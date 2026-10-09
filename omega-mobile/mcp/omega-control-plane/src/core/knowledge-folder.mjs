import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, relative, resolve, sep } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.html', '.htm', '.json', '.jsonl', '.csv', '.tsv',
  '.xml', '.yaml', '.yml', '.log', '.ini', '.toml', '.js', '.mjs', '.cjs', '.ts',
  '.tsx', '.jsx', '.py', '.java', '.kt', '.kts', '.go', '.rs', '.c', '.h', '.cpp',
  '.hpp', '.css', '.scss', '.sql', '.sh', '.bash', '.zsh'
]);

function inside(root, candidate) {
  return candidate === root || candidate.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

async function defaultPdfText({ path, maxBytes = 1_048_576 }) {
  return await new Promise((resolveText, reject) => {
    const child = spawn('pdftotext', ['-layout', '-nopgbrk', path, '-'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    const out = [];
    const err = [];
    let bytes = 0;
    let truncated = false;

    child.stdout.on('data', (chunk) => {
      if (bytes >= maxBytes) {
        truncated = true;
        return;
      }
      const remaining = maxBytes - bytes;
      const slice = chunk.subarray(0, remaining);
      out.push(slice);
      bytes += slice.length;
      if (slice.length < chunk.length) truncated = true;
    });
    child.stderr.on('data', (chunk) => {
      const current = err.reduce((sum, item) => sum + item.length, 0);
      if (current < 65_536) err.push(chunk.subarray(0, Math.max(0, 65_536 - current)));
    });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`pdftotext failed with exit code ${code}: ${Buffer.concat(err).toString('utf8').trim()}`));
        return;
      }
      resolveText({ text: Buffer.concat(out).toString('utf8'), truncated });
    });
  });
}

export class KnowledgeFolder {
  constructor({ root, pdfText = defaultPdfText } = {}) {
    if (!root) throw new Error('Knowledge root is required');
    this.root = resolve(root);
    this.pdfText = pdfText;
  }

  async canonicalRoot() {
    try {
      return await realpath(this.root);
    } catch {
      return this.root;
    }
  }

  async resolveExisting(input = '') {
    const root = await this.canonicalRoot();
    const lexical = resolve(root, input || '.');
    if (!inside(root, lexical)) throw new Error(`Path is outside knowledge root: ${input}`);
    let canonical;
    try {
      canonical = await realpath(lexical);
    } catch {
      throw new Error(`Knowledge path does not exist: ${input || '.'}`);
    }
    if (!inside(root, canonical)) throw new Error(`Path is outside knowledge root: ${input}`);
    return { root, canonical };
  }

  async info() {
    try {
      const { root, canonical } = await this.resolveExisting('');
      const s = await stat(canonical);
      return { root, exists: true, directory: s.isDirectory(), readOnly: true };
    } catch (error) {
      return { root: this.root, exists: false, directory: false, readOnly: true, error: error.message };
    }
  }

  async list({ path = '', recursive = false, limit = 500 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10_000) {
      throw new Error('limit must be between 1 and 10000');
    }
    const { root, canonical } = await this.resolveExisting(path);
    const baseStat = await stat(canonical);
    if (!baseStat.isDirectory()) throw new Error('Knowledge list path is not a directory');
    const entries = [];

    const walk = async (dir) => {
      const items = await readdir(dir, { withFileTypes: true });
      items.sort((a, b) => a.name.localeCompare(b.name));
      for (const item of items) {
        if (entries.length >= limit) return;
        const absolute = resolve(dir, item.name);
        const rel = relative(root, absolute).split(sep).join('/');
        if (item.isSymbolicLink()) {
          entries.push({ path: rel, kind: 'symlink' });
          continue;
        }
        const s = await lstat(absolute);
        const kind = item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other';
        entries.push({
          path: rel,
          kind,
          size: item.isFile() ? s.size : null,
          modifiedMs: s.mtimeMs,
          extension: item.isFile() ? extname(item.name).toLowerCase() : null
        });
        if (recursive && item.isDirectory()) await walk(absolute);
      }
    };

    await walk(canonical);
    return {
      root,
      path: path || '',
      recursive: Boolean(recursive),
      entries,
      truncated: entries.length >= limit
    };
  }

  async read({ path, offset = 0, maxBytes = 1_048_576 } = {}) {
    if (!path) throw new Error('path is required');
    if (!Number.isInteger(offset) || offset < 0) throw new Error('offset must be a non-negative integer');
    if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 8_388_608) {
      throw new Error('maxBytes must be between 1 and 8388608');
    }
    const { root, canonical } = await this.resolveExisting(path);
    const s = await stat(canonical);
    if (!s.isFile()) throw new Error('Knowledge read path is not a regular file');
    const extension = extname(canonical).toLowerCase();

    if (extension === '.pdf') {
      if (offset !== 0) throw new Error('PDF reads do not support byte offset; use maxBytes to bound extracted text');
      const extracted = await this.pdfText({ path: canonical, maxBytes });
      const value = typeof extracted === 'string'
        ? { text: extracted, truncated: Buffer.byteLength(extracted, 'utf8') >= maxBytes }
        : extracted;
      return {
        root,
        path: relative(root, canonical).split(sep).join('/'),
        format: 'pdf-text',
        text: value.text,
        offset: 0,
        nextOffset: null,
        truncated: Boolean(value.truncated),
        sourceSize: s.size
      };
    }

    if (!TEXT_EXTENSIONS.has(extension) && extension !== '') {
      throw new Error(`Unsupported knowledge file type: ${extension || '(none)'}`);
    }
    const data = await readFile(canonical);
    const start = Math.min(offset, data.length);
    const end = Math.min(start + maxBytes, data.length);
    return {
      root,
      path: relative(root, canonical).split(sep).join('/'),
      format: 'text',
      text: data.subarray(start, end).toString('utf8'),
      offset: start,
      nextOffset: end,
      truncated: end < data.length,
      sourceSize: data.length
    };
  }

  async search({ query, path = '', limit = 50, maxFiles = 500, maxBytesPerFile = 2_097_152 } = {}) {
    if (!query || !String(query).trim()) throw new Error('query is required');
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('limit must be between 1 and 500');
    if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 5000) {
      throw new Error('maxFiles must be between 1 and 5000');
    }
    const listing = await this.list({ path, recursive: true, limit: maxFiles });
    const needle = String(query).toLowerCase();
    const matches = [];
    let scanned = 0;

    for (const entry of listing.entries) {
      if (matches.length >= limit) break;
      if (entry.kind !== 'file') continue;
      const extension = entry.extension ?? '';
      if (extension !== '.pdf' && !TEXT_EXTENSIONS.has(extension) && extension !== '') continue;
      scanned += 1;
      try {
        const doc = await this.read({ path: entry.path, maxBytes: maxBytesPerFile });
        const haystack = doc.text.toLowerCase();
        let index = 0;
        while (matches.length < limit) {
          const at = haystack.indexOf(needle, index);
          if (at === -1) break;
          const from = Math.max(0, at - 120);
          const to = Math.min(doc.text.length, at + needle.length + 180);
          matches.push({ path: entry.path, index: at, excerpt: doc.text.slice(from, to) });
          index = at + Math.max(needle.length, 1);
        }
      } catch (error) {
        matches.push({ path: entry.path, error: error.message, skipped: true });
        if (matches.length >= limit) break;
      }
    }

    return {
      query: String(query),
      path,
      matches,
      scannedFiles: scanned,
      listingTruncated: listing.truncated
    };
  }
}
