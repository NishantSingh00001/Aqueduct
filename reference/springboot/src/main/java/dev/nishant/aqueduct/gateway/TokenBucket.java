package dev.nishant.aqueduct.gateway;

/**
 * A thread-safe token-bucket rate limiter — the Java counterpart of the one in
 * shared/structures/ratelimiter.ts. The bucket refills at a steady rate up to a
 * burst capacity; each allowed request spends one token.
 */
public class TokenBucket {

    private final double capacity;
    private final double refillPerSecond;
    private double tokens;
    private long lastNanos;

    public TokenBucket(double capacity, double refillPerSecond) {
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
        this.tokens = capacity;
        this.lastNanos = System.nanoTime();
    }

    /** Attempt to spend one token. Returns whether the request is allowed. */
    public synchronized boolean take() {
        refill();
        if (tokens >= 1.0) {
            tokens -= 1.0;
            return true;
        }
        return false;
    }

    public synchronized int available() {
        refill();
        return (int) Math.floor(tokens);
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsedSeconds = (now - lastNanos) / 1_000_000_000.0;
        if (elapsedSeconds <= 0) return;
        tokens = Math.min(capacity, tokens + elapsedSeconds * refillPerSecond);
        lastNanos = now;
    }
}
