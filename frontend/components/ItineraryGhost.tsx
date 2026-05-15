'use client';

import { motion } from 'framer-motion';

export const ItineraryGhost = () => {
    // We mock a "10-day" skeleton
    return (
        <div className="space-y-6 w-full max-w-4xl mx-auto px-4 pb-20">
            <div className="flex flex-col gap-2 mb-10 text-center">
                <div className="h-10 w-64 bg-slate-100 rounded-2xl mx-auto animate-pulse" />
                <div className="h-4 w-40 bg-slate-200 rounded-xl mx-auto animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(10)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-panel p-6 min-h-[300px] border border-slate-100 overflow-hidden group"
                    >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="h-8 w-16 bg-blue-500/10 rounded-xl border border-blue-500/20 animate-pulse" />
                            <div className="h-6 w-24 bg-slate-100 rounded-lg animate-pulse" />
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="h-4 w-full bg-slate-100 rounded-full animate-pulse" />
                            <div className="h-4 w-5/6 bg-slate-100 rounded-full animate-pulse" />
                            <div className="h-4 w-4/6 bg-slate-100 rounded-full animate-pulse" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                            <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                        </div>

                        <div className="flex gap-2">
                             <div className="h-8 w-1/2 bg-slate-100 rounded-xl animate-pulse" />
                             <div className="h-8 w-1/2 bg-blue-600/10 rounded-xl border border-blue-600/20 animate-pulse" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
