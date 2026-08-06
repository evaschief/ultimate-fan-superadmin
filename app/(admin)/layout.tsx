import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';
import Sidebar from '@/components/Sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={session.email} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
