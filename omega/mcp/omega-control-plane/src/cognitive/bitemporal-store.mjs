import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

function iso(value, fallback) {
  const candidate = value ?? fallback;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) throw new TypeError(`Invalid ISO date: ${candidate}`);
  return date.toISOString();
}

function within(validAt, from, to) {
  const t = new Date(validAt).getTime();
  const f = new Date(from).getTime();
  const e = to ? new Date(to).getTime() : Number.POSITIVE_INFINITY;
  return f <= t && t < e;
}

export class BitemporalStore {
  constructor({ filePath, clock = () => new Date().toISOString() } = {}) {
    if (!filePath) throw new TypeError('filePath is required');
    this.filePath = filePath;
    this.clock = clock;
  }

  async #append(event) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
    return event;
  }

  async #events() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return raw.split('\n').filter(Boolean).map((line, index) => {
        try { return JSON.parse(line); }
        catch (error) { throw new Error(`Corrupt bitemporal journal at line ${index + 1}: ${error.message}`); }
      });
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
  }

  async assertFact({
    assertionId = randomUUID(),
    key,
    value,
    validFrom = this.clock(),
    validTo = null,
    txTime = this.clock(),
    metadata = {}
  }) {
    if (!key || typeof key !== 'string') throw new TypeError('key is required');
    const event = {
      type: 'ASSERT',
      assertionId,
      key,
      value,
      validFrom: iso(validFrom),
      validTo: validTo ? iso(validTo) : null,
      txTime: iso(txTime),
      metadata
    };
    await this.#append(event);
    return event;
  }

  async retractFact({ assertionId, txTime = this.clock(), reason = 'retracted' }) {
    if (!assertionId) throw new TypeError('assertionId is required');
    return await this.#append({
      type: 'RETRACT',
      assertionId,
      txTime: iso(txTime),
      reason
    });
  }

  async correctFact({
    assertionId,
    value,
    validFrom,
    validTo,
    txTime = this.clock(),
    metadata = {}
  }) {
    const events = await this.#events();
    const original = events.find((e) => e.type === 'ASSERT' && e.assertionId === assertionId);
    if (!original) throw new Error(`Unknown assertionId: ${assertionId}`);
    await this.retractFact({ assertionId, txTime, reason: 'retrospective-correction' });
    return await this.assertFact({
      key: original.key,
      value,
      validFrom: validFrom ?? original.validFrom,
      validTo: validTo ?? original.validTo,
      txTime,
      metadata: { ...original.metadata, ...metadata, correctedFrom: assertionId }
    });
  }

  async query({
    key,
    validAt = this.clock(),
    transactionAt = this.clock(),
    predicate
  } = {}) {
    const events = await this.#events();
    const txLimit = new Date(iso(transactionAt)).getTime();
    const visible = events.filter((e) => new Date(e.txTime).getTime() <= txLimit);
    const retracted = new Set(
      visible.filter((e) => e.type === 'RETRACT').map((e) => e.assertionId)
    );
    return visible
      .filter((e) => e.type === 'ASSERT')
      .filter((e) => !retracted.has(e.assertionId))
      .filter((e) => key === undefined || e.key === key)
      .filter((e) => within(validAt, e.validFrom, e.validTo))
      .filter((e) => !predicate || predicate(e))
      .sort((a, b) => a.txTime.localeCompare(b.txTime));
  }

  async history({ key, assertionId } = {}) {
    const events = await this.#events();
    return events.filter((e) =>
      (key === undefined || e.key === key) &&
      (assertionId === undefined || e.assertionId === assertionId)
    );
  }

  async snapshot({ validAt = this.clock(), transactionAt = this.clock() } = {}) {
    return await this.query({ validAt, transactionAt });
  }
}
