import { test, expect } from '../../src/fixtures';
import { UserFactory } from '../../src/factories';

test.describe('API Test Suite - User Management (Service Object Model)', () => {
  test('GET /users - should return paginated users adhering to SLA threshold @smoke @api', async ({
    userService,
    apiClient,
  }) => {
    // 1. Act: Fetch users via typed Service Object
    const response = await userService.listUsers(2);

    // 2. Assert: HTTP status and SLA response time
    apiClient.expectStatus(response, 200);
    apiClient.expectResponseTimeLessThan(response, 3000);

    // 3. Assert: Schema and data integrity
    expect(response.data.page).toBe(2);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeGreaterThan(0);

    // Verify properties on user item
    const firstUser = response.data.data[0];
    apiClient.expectProperties(firstUser, ['id', 'email', 'first_name', 'last_name']);
  });

  test('POST /users - should create a new user profile with valid attributes @api', async ({
    userService,
    apiClient,
  }) => {
    // 1. Arrange: Generate dynamic test data
    const fakeUser = UserFactory.createValidUser();
    const payload = {
      name: fakeUser.fullName,
      job: 'Senior Test Automation Architect',
    };

    // 2. Act: Call API service
    const response = await userService.createUser(payload);

    // 3. Assert: Status, SLA, and response body
    apiClient.expectStatus(response, 201);
    apiClient.expectResponseTimeLessThan(response, 3000);
    apiClient.expectProperties(response.data, ['id', 'createdAt', 'name', 'job']);
    expect(response.data.name).toBe(payload.name);
    expect(response.data.job).toBe(payload.job);
  });

  test('GET /users/:id - should fetch a single user profile @api', async ({
    userService,
    apiClient,
  }) => {
    const response = await userService.getUser(2);

    apiClient.expectStatus(response, 200);
    apiClient.expectProperties(response.data.data, ['id', 'email', 'first_name']);
    expect(response.data.data.id).toBe(2);
  });
});
