/**
 * Shared K6 performance configuration, SLAs, and execution stages.
 */
export const standardThresholds = {
  // 95% of requests must complete below 500ms; 99% below 1000ms
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  // HTTP failure rate must stay strictly below 1%
  http_req_failed: ['rate<0.01'],
};

export const loadStages = [
  { duration: '10s', target: 5 }, // Ramp-up to 5 Virtual Users
  { duration: '20s', target: 5 }, // Steady state under expected traffic
  { duration: '5s', target: 0 }, // Graceful ramp-down
];

export const stressStages = [
  { duration: '10s', target: 10 }, // Phase 1: Normal load
  { duration: '15s', target: 25 }, // Phase 2: Moderate traffic surge
  { duration: '15s', target: 50 }, // Phase 3: Stress capacity test
  { duration: '10s', target: 0 }, // Recovery: Verify graceful scale down
];

export const defaultBaseUrl = __ENV.API_BASE_URL || 'https://reqres.in/api';
