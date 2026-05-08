import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

/**
 * SysTourPlan Logger
 * Performance-optimized structured logger for the TourPlan Ecosystem.
 */
export const SysLogger = {
  async log(service: string, message: string, level: LogLevel = 'INFO', metadata: any = {}) {
    console.log(`[${service}] [${level}]: ${message}`);
    
    // Fire and forget to Supabase (Observability)
    try {
      await supabaseAdmin.from('tourplan_sys_logs').insert([{
        service,
        level,
        message,
        metadata
      }]);
    } catch (err) {
      console.error('SysLogger Internal Failure:', err);
    }
  },

  info: (service: string, msg: string, meta?: any) => SysLogger.log(service, msg, 'INFO', meta),
  warn: (service: string, msg: string, meta?: any) => SysLogger.log(service, msg, 'WARN', meta),
  error: (service: string, msg: string, meta?: any) => SysLogger.log(service, msg, 'ERROR', meta),
  critical: (service: string, msg: string, meta?: any) => SysLogger.log(service, msg, 'CRITICAL', meta),

  /**
   * Idempotency Check
   * Returns true if the claim is successful (not a duplicate)
   */
  async claim(service: string, claimId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.from('tourplan_automation_claims').insert({
        claim_id: claimId,
        service
      });
      return !error;
    } catch {
      return false;
    }
  }
};
