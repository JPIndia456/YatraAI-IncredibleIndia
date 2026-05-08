import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogService = 'TELEGRAM' | 'PAYMENT' | 'AI' | 'AI_BRAIN' | 'MCP' | 'SYSTEM' | 'DISCOVERY';

export async function logSystemEvent(
  service: LogService,
  level: LogLevel,
  message: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabaseAdmin
      .from('yatra_sys_logs')
      .insert([
        { 
          service, 
          level, 
          message, 
          metadata 
        }
      ]);
    
    if (error) {
      console.error(`[Logging Error]: Failed to save log to Supabase:`, error);
    }
  } catch (err) {
    console.error(`[Logging Error]: Internal failure:`, err);
  }
}

export const logger = {
  info: (service: LogService, message: string, meta?: any) => logSystemEvent(service, 'INFO', message, meta),
  warn: (service: LogService, message: string, meta?: any) => logSystemEvent(service, 'WARN', message, meta),
  error: (service: LogService, message: string, meta?: any) => logSystemEvent(service, 'ERROR', message, meta),
  critical: (service: LogService, message: string, meta?: any) => logSystemEvent(service, 'CRITICAL', message, meta),
};
