import { useYatraRealtime } from './useYatraRealtime';

export function useRealtimeNotifications(userId: string) {
  const { notifications, isConnected } = useYatraRealtime(userId);
  return { notifications, isConnected };
}
