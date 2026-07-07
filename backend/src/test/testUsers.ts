// Fixed credentials seeded fresh into the test database before each run
// (see setup.ts) — shared here so e2e tests don't hardcode the password
// in more than one place.
export const TEST_ADMIN = {
  username: "test_admin",
  password: "test-password-123",
};
