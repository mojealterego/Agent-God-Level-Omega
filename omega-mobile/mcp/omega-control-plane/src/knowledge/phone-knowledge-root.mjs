import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { lstat, open, readdir, realpath, stat } from 'node:fs/promises';

const execFileAsync = promisify(execFile);
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.json', '.jsonl', '.csv', '.tsv',
  '.html', '.htm', '.xml', '.yaml', '.yml', '.ini', '.toml', '.log',
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.java', '.kt',
  '.kts', '.c', '.h', '.cpp', '.hpp', '.rs', '.go', '.sh', '.sql'
]);
const ARCHIVE_TEXT_EXTENSIONS = new Set(['.docx', '.odt']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...ARCHIVE_TEXT_EXTENSIONS, '.pdf']);

function inside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function publicPath(root, absolute) {
  const value = relative(root, absolute);
  return value.split(sep).join('/');
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripMarkup(value) {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  ).trim();
}

async function defaultCommandRunner({ argv, timeoutMs = 120_000, maxOutputBytes = 4_194_304 }) {
  const [command, ...args] = argv;
  try {
    const result = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: Math.max(maxOutputBytes * 2, 1_048_576),
      encoding: 'utf8',
      windowsHide: true
    });
    return { exitCode: 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const unavailable = new Error(`Required read-only extractor is unavailable: ${command}`);
      unavailable.code = 'EXTRACTOR_UNAVAILABLE';
      throw unavailable;
    }
    const failure = new Error(error?.stderr || error?.message || String(error));
    failure.code = 'EXTRACTION_FAILED';
    throw failure;
  }
}

export class PhoneKnowledgeRoot {
  constructor({ root, commandRunner = defaultCommandRunner } = {}) {
    if (!root) throw new Error('Phone knowledge root is not configured');
    this.root = resolve(root);
    this.commandRunner = commandRunner;
    this._canonicalRoot = null;
  }

  async #canonicalRootPath() {
    if (!this._canonicalRoot) this._canonicalRoot = await realpath(this.root);
    return this._canonicalRoot;
  }

  async #resolve(relativePath = '') {
    const root = await this.#canonicalRootPath();
    if (isAbsolute(relativePath)) throw new Error('Path is outside knowledge root');
    const lexical = resolve(root, relativePath || '.');
    if (!inside(root, lexical)) throw new Error('Path is outside knowledge root');
    const canonical = await realpath(lexical);
    if (!inside(root, canonical)) throw new Error('Path is outside knowledge root');
    return { root, canonical };
  }

  async info() {
    const root = await this.#canonicalRootPath();
    const info = await stat(root);
    if (!info.isDirectory()) throw new Error('Configured knowledge root is not a directory');
    return {
      configured: true,
      available: true,
      rootName: basename(root),
      mode: 'read-only',
      supportedExtensions: [...SUPPORTED_EXTENSIONS].sort()
    };
  }

  async metadata({ path }) {
    const { root, canonical } = await this.#resolve(path);
    const info = await stat(canonical);
    return {
      path: publicPath(root, canonical),
      type: info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'other',
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      extension: info.isFile() ? extname(canonical).toLowerCase() : ''
    };
  }

  async list({ path = '', recursive = false, maxEntries = 1000 } = {}) {
    const { root, canonical } = await this.#resolve(path);
    const baseInfo = await stat(canonical);
    if (!baseInfo.isDirectory()) throw new Error('Knowledge list path is not a directory');
    const entries = [];
    const queue = [canonical];

    while (queue.length && entries.length < maxEntries) {
      const current = queue.shift();
      const children = await readdir(current, { withFileTypes: true });
      children.sort((a, b) => a.name.localeCompare(b.name));

      for (const child of children) {
        if (entries.length >= maxEntries) break;
        const absolute = resolve(current, child.name);
        const linkInfo = await lstat(absolute);
        if (linkInfo.isSymbolicLink()) {
          let blocked = false;
          try {
            const target = await realpath(absolute);
            blocked = !inside(root, target);
          } catch {
            blocked = true;
          }
          entries.push({
            path: publicPath(root, absolute),
            type: 'symlink',
            blocked,
            size: linkInfo.size,
            modifiedAt: linkInfo.mtime.toISOString(),
            extension: extname(child.name).toLowerCase()
          });
          continue;
        }

        const info = await stat(absolute);
        const type = info.isDirectory() ? 'directory' : info.isFile() ? 'file' : 'other';
        entries.push({
          path: publicPath(root, absolute),
          type,
          size: info.size,
          modifiedAt: info.mtime.toISOString(),
          extension: info.isFile() ? extname(child.name).toLowerCase() : ''
        });
        if (recursive && info.isDirectory()) queue.push(absolute);
      }

      if (!recursive) break;
    }

    return {
      rootName: basename(root),
      path: publicPath(root, canonical),
      recursive,
      maxEntries,
      truncated: entries.length >= maxEntries && queue.length > 0,
      entries
    };
  }

  async #readBoundedFile(path, maxBytes) {
    const handle = await open(path, 'r');
    try {
      const buffer = Buffer.alloc(maxBytes + 1);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      return {
        buffer: buffer.subarray(0, Math.min(bytesRead, maxBytes)),
        truncated: bytesRead > maxBytes
      };
    } finally {
      await handle.close();
    }
  }

  async read({ path, maxBytes = 1_048_576 }) {
    const { root, canonical } = await this.#resolve(path);
    const info = await stat(canonical);
    if (!info.isFile()) throw new Error('Knowledge read path is not a regular file');
    const extension = extname(canonical).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      const error = new Error(`Unsupported knowledge file type: ${extension || '(none)'}`);
      error.code = 'UNSUPPORTED_FILE_TYPE';
      throw error;
    }

    let text = '';
    let truncated = false;
    let extractor = 'utf8';

    if (extension === '.pdf') {
      const result = await this.commandRunner({
        argv: ['pdftotext', '-layout', canonical, '-'],
        timeoutMs: 180_000,
        maxOutputBytes: Math.max(maxBytes, 1_048_576)
      });
      text = String(result.stdout ?? '');
      extractor = 'pdftotext';
      if (Buffer.byteLength(text, 'utf8') > maxBytes) {
        text = Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8');
        truncated = true;
      }
    } else if (ARCHIVE_TEXT_EXTENSIONS.has(extension)) {
      const member = extension === '.docx' ? 'word/document.xml' : 'content.xml';
      const result = await this.commandRunner({
        argv: ['unzip', '-p', canonical, member],
        timeoutMs: 120_000,
        maxOutputBytes: Math.max(maxBytes, 1_048_576)
      });
      text = stripMarkup(String(result.stdout ?? ''));
      extractor = extension === '.docx' ? 'docx-xml' : 'odt-xml';
      if (Buffer.byteLength(text, 'utf8') > maxBytes) {
        text = Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8');
        truncated = true;
      }
    } else {
      const bounded = await this.#readBoundedFile(canonical, maxBytes);
      text = bounded.buffer.toString('utf8');
      truncated = bounded.truncated;
      if (extension === '.html' || extension === '.htm' || extension === '.xml') {
        text = stripMarkup(text);
        extractor = 'markup-text';
      }
    }

    return {
      path: publicPath(root, canonical),
      extension,
      size: info.size,
      modifiedAt: info.mtime.toISOString(),
      extractor,
      truncated,
      text
    };
  }

  async search({
    query,
    path = '',
    recursive = true,
    maxFiles = 250,
    maxMatches = 100,
    maxBytesPerFile = 262_144
  }) {
    if (!query?.trim()) throw new Error('Search query is required');
    const listing = await this.list({
      path,
      recursive,
      maxEntries: Math.min(Math.max(maxFiles * 8, maxFiles), 20_000)
    });
    const candidates = listing.entries
      .filter((entry) => entry.type === 'file' && SUPPORTED_EXTENSIONS.has(entry.extension))
      .slice(0, maxFiles);
    const needle = query.toLocaleLowerCase();
    const matches = [];
    const errors = [];

    for (const entry of candidates) {
      if (matches.length >= maxMatches) break;
      try {
        const doc = await this.read({ path: entry.path, maxBytes: maxBytesPerFile });
        const lower = doc.text.toLocaleLowerCase();
        let offset = lower.indexOf(needle);
        while (offset !== -1 && matches.length < maxMatches) {
          const start = Math.max(0, offset - 120);
          const end = Math.min(doc.text.length, offset + query.length + 220);
          matches.push({
            path: entry.path,
            extension: entry.extension,
            offset,
            snippet: doc.text.slice(start, end).replace(/\s+/g, ' ').trim(),
            truncatedSource: doc.truncated
          });
          offset = lower.indexOf(needle, offset + Math.max(needle.length, 1));
        }
      } catch (error) {
        errors.push({ path: entry.path, code: error?.code ?? 'READ_FAILED', message: error?.message ?? String(error) });
      }
    }

    return {
      query,
      scannedFiles: candidates.length,
      matches,
      errors,
      truncated: matches.length >= maxMatches || listing.truncated
    };
  }
}
