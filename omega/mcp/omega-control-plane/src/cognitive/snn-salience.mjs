export class SpikingSalienceModulator {
  constructor({ threshold = 1, decay = 0.85, reset = 0 } = {}) {
    if (!(threshold > 0)) throw new RangeError('threshold must be > 0');
    if (!(decay >= 0 && decay <= 1)) throw new RangeError('decay must be in [0,1]');
    this.threshold = threshold;
    this.decay = decay;
    this.reset = reset;
    this.potential = 0;
    this.spikeCount = 0;
  }

  step(input) {
    const x = Number(input);
    if (!Number.isFinite(x) || x < 0) throw new TypeError('input must be a finite non-negative number');
    this.potential = this.potential * this.decay + x;
    const spike = this.potential >= this.threshold;
    if (spike) {
      this.spikeCount += 1;
      this.potential = this.reset;
    }
    return { spike, potential: this.potential, spikeCount: this.spikeCount };
  }
}
