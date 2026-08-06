import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/session';
import LoginClient from './LoginClient';

export default async function LoginPage() {
  const session = await getAdminSession();
  if (session) redirect('/dashboard');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginClient />
    </div>
  );
}
