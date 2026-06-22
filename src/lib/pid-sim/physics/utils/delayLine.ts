/** Fixed-length delay buffer — ported from controls_js_sim utils/delay-line.js */
export class DelayLine {
  private readonly items: number[] = [];
  private readonly desiredLength: number;

  constructor(numSamples: number, initialValue = 0) {
    this.desiredLength = numSamples;
    for (let i = 0; i < numSamples; i++) {
      this.items.push(initialValue);
    }
  }

  addSample(value: number): void {
    this.items.push(value);
    if (this.items.length > this.desiredLength) {
      this.items.shift();
    }
  }

  getSample(): number {
    if (this.items.length >= this.desiredLength) {
      return this.items.shift() ?? 0;
    }
    return 0;
  }

  reset(value: number): void {
    this.items.length = 0;
    for (let i = 0; i < this.desiredLength; i++) {
      this.items.push(value);
    }
  }
}
