/**
 * Production environment validation.
 * Called once at bootstrap — crashes the process if any critical
 * security config is missing or insecure. Fail loud, fail early.
 *
 * Usage in main.ts: call validateProductionEnv() before NestFactory.create()
 */
export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== 'production') return;
  
    const errors: string[] = [];
  
    // 1. JWT_SECRET must be at least 64 chars (32-byte hex = 64 chars)
    const jwt = process.env.JWT_SECRET ?? '';
    if (jwt.length < 64) {
      errors.push(
        `JWT_SECRET is too short (${jwt.length} chars). ` +
        `Generate one with: openssl rand -hex 32`,
      );
    }
    if (jwt.includes('dev') || jwt.includes('change') || jwt.includes('secret')) {
      errors.push('JWT_SECRET looks like a placeholder. Set a real random value.');
    }
  
    // 2. WEBHOOK_VALIDATION must be true in production
    if (process.env.WEBHOOK_VALIDATION !== 'true') {
      errors.push(
        'WEBHOOK_VALIDATION must be "true" in production. ' +
        'Without it anyone can forge Twilio webhook events.',
      );
    }
  
    // 3. NODE_ENV must be production (redundant guard — catches misconfigured deploys)
    if (process.env.NODE_ENV !== 'production') {
      errors.push('NODE_ENV must be "production".');
    }
  
    // 4. No localhost URLs in production
    const urlFields = ['API_URL', 'FRONTEND_URL', 'WEBHOOK_BASE_URL'];
    for (const field of urlFields) {
      if ((process.env[field] ?? '').includes('localhost')) {
        errors.push(`${field} contains "localhost" — set the real production URL.`);
      }
    }
  
    // 5. Database must not use dev credentials
    const dbUrl = process.env.DATABASE_URL ?? '';
    if (dbUrl.includes('signalhunt_dev') || dbUrl.includes('localhost')) {
      errors.push('DATABASE_URL appears to point to a dev database.');
    }
  
    if (errors.length > 0) {
      console.error('\n🚨 PRODUCTION ENVIRONMENT MISCONFIGURATION:\n');
      errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
      console.error('\nFix the above before deploying.\n');
      process.exit(1);
    }
  }