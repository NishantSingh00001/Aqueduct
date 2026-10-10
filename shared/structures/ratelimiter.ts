// A token-bucket rate limiter: the shape most API gateways use. The bucket
// refills at a steady rate up to a burst capacity; each request spends a token.
// Deterministic in `now`, so it's testable without real time.

export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    now: number = Date.now(),
  ) {
    this.tokens = capacity;
    this.last = now;
  }

  /** Try to spend one token. Returns whether the request is allowed. */
  take(now: number = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  get available(): number {
    return Math.floor(this.tokens);
  }

  private refill(now: number): void {
    const elapsed = (now - this.last) / 1000;
    if (elapsed <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSecond);
    this.last = now;
  }
}
