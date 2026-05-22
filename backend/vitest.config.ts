import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://admin:NGVmsEnterpriseDB2026!@127.0.0.1:27017/ng-vms-test?authSource=admin&directConnection=true',
      JWT_SECRET: 'test-jwt-secret-key-that-is-very-long-and-secure',
      REDIS_URL: 'redis://127.0.0.1:6379',
      SKIP_HW_LOCK: 'true',
    }
  },
});
