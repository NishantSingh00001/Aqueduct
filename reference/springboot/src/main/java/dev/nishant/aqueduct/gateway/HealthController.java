package dev.nishant.aqueduct.gateway;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/health — liveness and the primitives this gateway implements. */
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, Object> health() {
        return Map.of(
                "ok", true,
                "service", "aqueduct-springboot",
                "primitives", List.of("token-bucket", "lru-cache", "consistent-hash-ring"),
                "time", Instant.now().toString());
    }
}
