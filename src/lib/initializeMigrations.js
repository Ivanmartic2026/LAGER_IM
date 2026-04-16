import { base44 } from '@/api/base44Client';

// Check if running in browser (not during SSR)
const isBrowser = typeof window !== 'undefined';

export async function runMigrationsOnce() {
  if (!isBrowser) return;

  // Check if migrations already ran this session
  if (sessionStorage.getItem('migrations_completed')) {
    return;
  }

  try {
    // Check if user is authenticated
    const isAuthenticated = await base44.auth.isAuthenticated();
    if (!isAuthenticated) {
      return;
    }

    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return;
    }

    // Run the migration
    const response = await base44.functions.invoke('migrateExistingPurchaseOrders', {});
    
    // Mark migrations as completed in this session
    if (response.data?.success) {
      sessionStorage.setItem('migrations_completed', 'true');
      console.log('Data migrations completed:', response.data);
    }
  } catch (error) {
    // Silently fail if migration already ran or user not authenticated
    if (error.message?.includes('already completed') || error.status === 403) {
      sessionStorage.setItem('migrations_completed', 'true');
      return;
    }
    console.error('Migration error:', error);
  }
}