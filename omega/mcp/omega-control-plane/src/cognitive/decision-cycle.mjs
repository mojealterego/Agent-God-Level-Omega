const NEXT = {
  OBSERVE: 'ORIENT',
  ORIENT: 'DECIDE',
  DECIDE: 'ACT',
  ACT: 'REFLECT',
  REFLECT: 'OBSERVE'
};

export class DecisionCycle {
  constructor({ id }) {
    this.id = id;
    this.state = 'OBSERVE';
    this.history = [];
  }

  #step(expected, payload) {
    if (this.state !== expected) throw new Error(`Invalid decision-cycle transition: expected ${this.state}, got ${expected}`);
    this.history.push({ phase: expected, payload });
    this.state = NEXT[expected];
    return { state: this.state, historyLength: this.history.length };
  }

  observe(payload) { return this.#step('OBSERVE', payload); }
  orient(payload) { return this.#step('ORIENT', payload); }
  decide(payload) { return this.#step('DECIDE', payload); }
  act(payload) { return this.#step('ACT', payload); }
  reflect(payload) { return this.#step('REFLECT', payload); }
  snapshot() { return { id: this.id, state: this.state, history: this.history.map((x) => ({ ...x })) }; }
  static fromSnapshot(snapshot) {
    const cycle = new DecisionCycle({ id: snapshot.id });
    cycle.state = snapshot.state ?? 'OBSERVE';
    cycle.history = (snapshot.history ?? []).map((x) => ({ ...x }));
    return cycle;
  }
}
