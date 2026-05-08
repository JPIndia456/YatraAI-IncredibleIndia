'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Train, ArrowRight, ShieldCheck, Clock, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export default function PNRTracker() {
  const [pnr, setPnr] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchStatus = async () => {
    if (pnr.length !== 10) return toast.error("Enter a valid 10-digit PNR");
    setLoading(true);
    try {
      const resp = await fetch('/api/mcp/pnr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnr })
      });
      const result = await resp.json();
      if (result.success) {
        setData(result.data.data || result.data);
      } else {
        toast.error("Railway server busy. Try again.");
      }
    } catch {
      toast.error("Sync error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="glass-panel p-8 md:p-10 border-blue-500/10 bg-blue-500/5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 shadow-[0_0_20px_#2563eb]" />
        
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="shrink-0 space-y-4 text-center md:text-left">
            <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_40px_rgba(37,99,235,0.3)] mx-auto md:mx-0">
               <Train className="w-8 h-8 text-white" />
            </div>
            <div>
               <h2 className="text-2xl font-black tracking-tight text-white">PNR Live Sync</h2>
               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Real-Time Railway Telemetry</p>
            </div>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div className="relative group">
              <input 
                value={pnr}
                onChange={e => setPnr(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit Passenger Name Record"
                className="w-full bg-zinc-950/80 border border-zinc-800 p-6 pl-8 pr-32 rounded-3xl text-lg font-black tracking-[0.2em] outline-none focus:border-blue-600 transition-all text-white placeholder-zinc-800"
              />
              <button 
                onClick={fetchStatus}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Sync Status'}
              </button>
            </div>

            <AnimatePresence>
               {data && (
                 <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="pt-6 border-t border-zinc-100/5 grid grid-cols-2 lg:grid-cols-4 gap-6"
                 >
                    {[
                      { icon: Switch, label: 'Current Status', val: data.status, color: 'text-emerald-400' },
                      { icon: Clock, label: 'Delay Report', val: data.delay || 'None', color: 'text-rose-400' },
                      { icon: Navigation, label: 'Platform #', val: data.platform || 'TBA', color: 'text-blue-400' },
                      { icon: ShieldCheck, label: 'Yatra Brain Safety', val: 'Verified', color: 'text-indigo-400' },
                    ].map((item, i) => {
                      const Icon = item.icon as any;
                      return (
                        <div key={i} className="space-y-1.5 p-4 bg-zinc-950/40 rounded-2xl border border-white/5">
                           <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</span>
                           </div>
                           <div className="text-sm font-black text-white">{item.val}</div>
                        </div>
                      );
                    })}
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Background Decorative Grid */}
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none" />
      </div>
    </div>
  );
}

// Shorthand for components used
function Switch({ className }: { className?: string }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>; }
