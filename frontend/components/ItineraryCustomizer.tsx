'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';

interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  cost?: number;
  type: 'travel' | 'activity' | 'meal' | 'stay';
}

interface ItineraryCustomizerProps {
  initialItinerary: any;
  onSave: (updatedItinerary: any) => void;
}

export default function ItineraryCustomizer({ initialItinerary, onSave }: ItineraryCustomizerProps) {
  const [activities, setActivities] = useState<Activity[]>(
    initialItinerary?.activities || []
  );

  const [isEditing, setIsEditing] = useState(false);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    time: '',
    title: '',
    description: '',
    type: 'activity',
  });

  const addActivity = () => {
    if (!newActivity.time || !newActivity.title) return;

    const activity: Activity = {
      id: Date.now().toString(),
      time: newActivity.time,
      title: newActivity.title,
      description: newActivity.description || '',
      cost: newActivity.cost,
      type: newActivity.type as any,
    };

    setActivities([...activities, activity]);
    setNewActivity({ time: '', title: '', description: '', type: 'activity' });
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const updateActivity = (id: string, field: keyof Activity, value: any) => {
    setActivities(activities.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const handleSave = () => {
    onSave({ ...initialItinerary, activities });
    setIsEditing(false);
  };

  const totalCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);

  return (
    <div className="shell-panel p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">Customize Your Itinerary</h2>
        
        <div className="flex gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" /> Customize
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-sm font-medium"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-6 bg-zinc-900 p-6 rounded-3xl group"
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                {activity.type === 'travel' ? '✈️' : activity.type === 'stay' ? '🏨' : activity.type === 'meal' ? '🍽️' : '🎯'}
              </div>

              <div className="flex-1">
                <div className="flex justify-between">
                  <input
                    type="text"
                    value={activity.time}
                    onChange={(e) => updateActivity(activity.id, 'time', e.target.value)}
                    className="bg-transparent font-mono text-blue-400 focus:outline-none w-20"
                    disabled={!isEditing}
                  />
                  <div className="font-semibold">{activity.title}</div>
                </div>
                <input
                  type="text"
                  value={activity.description}
                  onChange={(e) => updateActivity(activity.id, 'description', e.target.value)}
                  className="bg-transparent text-zinc-400 text-sm mt-1 w-full focus:outline-none"
                  disabled={!isEditing}
                />
              </div>

              {activity.cost && (
                <div className="text-right font-medium text-blue-700">₹{activity.cost}</div>
              )}

              {isEditing && (
                <button
                  onClick={() => removeActivity(activity.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add New Activity Form */}
      {isEditing && (
        <div className="mt-10 p-6 border border-dashed border-zinc-700 rounded-3xl">
          <h3 className="font-medium mb-4">Add New Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Time (e.g. 14:30)"
              value={newActivity.time}
              onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3"
            />
            <input
              type="text"
              placeholder="Activity Title"
              value={newActivity.title}
              onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 md:col-span-2"
            />
            <button
              onClick={addActivity}
              className="bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Add
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-right text-lg font-semibold">
        Estimated Total: <span className="text-blue-700 font-black">₹{totalCost}</span>
      </div>
    </div>
  );
}
