import http from 'k6/http';
import { check, sleep } from 'k6';
import { standardThresholds, stressStages, defaultBaseUrl } from '../k6.config.js';

export const options = {
  stages: stressStages,
  thresholds: standardThresholds,
};

export default function () {
  const baseUrl = defaultBaseUrl;

  const res = http.get(`${baseUrl}/users?delay=1`);
  check(res, {
    'Stress endpoint returns valid status': (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.5);
}
