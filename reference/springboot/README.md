# Aqueduct — Spring Boot reference service

The live site runs its backend on Netlify Functions (Node/TypeScript), so it deploys in one
step. This folder is the **same gateway logic written in Java with Spring Boot**, as a reference
implementation — the stack from the Scaler *Spring Boot* course (REST controllers, dependency
injection, a service layer). It mirrors the TypeScript endpoints in `netlify/functions/api.mts`.

It isn't deployed with the site (a JVM service needs its own host — Render, Railway or a container
platform), but it builds and runs locally.

```
src/main/java/dev/nishant/aqueduct/
  AqueductApplication.java        # Spring Boot entry point
  gateway/TokenBucket.java        # the same token-bucket algorithm, in Java
  gateway/RateLimitController.java # GET /api/ratelimit — real rate limiting
  gateway/HealthController.java    # GET /api/health
```

## Run it

```bash
cd reference/springboot
./mvnw spring-boot:run        # starts on http://localhost:8080
curl "http://localhost:8080/api/ratelimit?key=demo"
```

## Why both

Netlify Functions keep the demo's deploy a single step, which matters for a portfolio site. The
Java version shows the same design — a gateway enforcing a token-bucket limit — in the Spring Boot
idiom (constructor injection, `@RestController`, a thread-safe service bean), which is what most
backend roles interview on.
