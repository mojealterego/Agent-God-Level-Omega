import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';

function inside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

async function hashFile(path) {
  return await new Promise((resolveHash, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolveHash(hash.digest('hex')));
  });
}

export async function inspectArtifact({ path, workspaceRoots }) {
  if (!Array.isArray(workspaceRoots) || workspaceRoots.length === 0) throw new TypeError('workspaceRoots are required');
  const canonical = await realpath(resolve(path));
  const roots = await Promise.all(workspaceRoots.map(async (root) => {
    try { return await realpath(resolve(root)); } catch { return resolve(root); }
  }));
  if (!roots.some((root) => inside(root, canonical))) throw new Error('Artifact path escapes configured workspace roots');
  const info = await stat(canonical);
  if (!info.isFile()) throw new Error('Artifact path is not a regular file');
  return {
    path: canonical,
    size: info.size,
    extension: extname(canonical).toLowerCase(),
    modifiedAt: info.mtime.toISOString(),
    sha256: await hashFile(canonical)
  };
}
