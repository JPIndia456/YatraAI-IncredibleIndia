'use client';

import { motion } from 'framer-motion';

export default function ItineraryReview({ itinerary, onProceed }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 shell-panel p-8">
        <h2 className="text-2xl font-semibold mb-6">Trip Summary</h2>
        <div className="space-y-8">
          {itinerary?.segments?.map((segment: any, i: number) => (
            <div key={i} className="flex gap-6">
              <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
              <div>
                <div className="font-medium">{segment.from} → {segment.to}</div>
                <div className="text-sm text-zinc-400">{segment.date} • {segment.duration}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-5 shell-panel p-8">
        <h3 className="text-xl font-semibold mb-8">Price Details</h3>
        <div className="space-y-4 text-lg">
          <div className="flex justify-between">
            <span>Base Fare</span>
            <span className="text-blue-700 font-black">₹{itinerary?.baseFare || 0}</span>
          </div>
          <div className="flex justify-between border-t border-zinc-700 pt-4 font-semibold text-xl">
            <span>Total Amount</span>
            <span className="text-blue-700 font-black">₹{itinerary?.total || 0}</span>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          onClick={onProceed}
          className="mt-12 w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl font-semibold text-lg shadow-xl"
        >
          Continue to Passenger Details →
        </motion.button>
      </div>
    </div>
  );
}
