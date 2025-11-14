import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Verify admin access server-side
    await requireAdmin();
  } catch {
    // Redirect non-admins to home page
    redirect('/');
  }

  return <>{children}</>;
}
