/** Executado antes dos imports do teste (setupFiles) — evita throw em jerp/index por env ausente. */
process.env.JERP_API = process.env.JERP_API || 'http://127.0.0.1/jerp-test-api';
process.env.JERP_TOKEN = process.env.JERP_TOKEN || 'jest-test-token';
