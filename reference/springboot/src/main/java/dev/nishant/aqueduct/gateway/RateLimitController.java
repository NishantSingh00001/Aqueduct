package dev.nishant.aqueduct.gateway;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * GET /api/ratelimit?key=... — enforces a per-key token-bucket limit
 * (10-request burst, refilling 2/s), returning 200 when allowed and 429 when
 * throttled. One bucket per key, held in a concurrent map.
 */
@RestController
public class RateLimitController {

    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    @GetMapping("/api/ratelimit")
    public ResponseEntity<Map<String, Object>> rateLimit(
            @RequestParam(defaultValue = "anon") String key) {
        TokenBucket bucket = buckets.computeIfAbsent(key, k -> new TokenBucket(10, 2));
        boolean allowed = bucket.take();
        Map<String, Object> body = Map.of(
                "key", key,
                "allowed", allowed,
                "remaining", bucket.available());
        return ResponseEntity
                .status(allowed ? HttpStatus.OK : HttpStatus.TOO_MANY_REQUESTS)
                .body(body);
    }
}
