import http from 'k6/http';
import { check, sleep } from 'k6';
import { standardThresholds, loadStages, defaultBaseUrl } from '../k6.config.js';
import { generateUserPayload } from '../helpers/data-generator.js';

export const options = {
  stages: loadStages,
  thresholds: standardThresholds,
};

export default function () {
  const baseUrl = defaultBaseUrl;

  // 1. GET: Fetch list of users
  const listRes = http.get(`${baseUrl}/users?page=1`);
  check(listRes, {
    'GET /users status is 200': (r) => r.status === 200,
    'GET /users response duration < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // 2. POST: Create dynamic user
  const payload = JSON.stringify(generateUserPayload());
  const postRes = http.post(`${baseUrl}/users`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(postRes, {
    'POST /users status is 201': (r) => r.status === 201,
    'POST /users has generated id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && Boolean(body.id);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
