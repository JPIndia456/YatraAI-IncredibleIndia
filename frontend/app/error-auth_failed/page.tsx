import { redirect } from 'next/navigation';

export default function LegacyAuthErrorRedirect() {
  // Backward compatibility for older auth callback error URL.
  redirect('/?error=auth_failed');
}
