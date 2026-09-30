/**
 * Generates randomized, collision-free test data for K6 virtual users.
 */
export function generateRandomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateUserPayload() {
  const rand = generateRandomString(6);
  return {
    name: `User_${rand}`,
    job: 'QA Performance Engineer',
    email: `load_${Date.now()}_${rand}@example.com`,
  };
}
