/**
 * Top‑level seed runner. Executes individual seed modules sequentially.
 * Run with `npm run seed` (script to be added by the developer) or via
 * `node -r ts-node/register src/db/seed.ts`.
 */
async function main() {
  console.log('🔧 Starting database seed...');
  try {
    await import('./seedRoles');
    await import('./seedPermissions');
    await import('./seedSettings');
    console.log('✅ Seed completed successfully');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
