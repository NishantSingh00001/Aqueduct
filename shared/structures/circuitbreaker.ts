// A circuit breaker: the resilience pattern that stops hammering a failing
// dependency. Closed = traffic flows; too many failures trip it Open; after a
// cooldown it goes Half-open and lets one probe through, closing again on
// success or re-opening on failure.

export type BreakerState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private state: BreakerState = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 5000,
  ) {}

  get current(): BreakerState {
    return this.state;
  }

  /** Whether a request may be attempted right now. */
  allow(now: number = Date.now()): boolean {
    if (this.state === "open") {
      if (now - this.openedAt >= this.cooldownMs) {
        this.state = "half-open";
        return true;
      }
      return false;
    }
    return true;
  }

  record(ok: boolean, now: number = Date.now()): void {
    if (ok) {
      this.failures = 0;
      this.state = "closed";
      return;
    }
    this.failures++;
    if (this.state === "half-open" || this.failures >= this.threshold) {
      this.state = "open";
      this.openedAt = now;
    }
  }
}
