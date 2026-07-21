import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login?error=not_authorized');

  return children;
}
