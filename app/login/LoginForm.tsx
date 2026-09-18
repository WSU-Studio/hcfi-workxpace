'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import PasswordInput from '@/components/ui/PasswordInput';
import Logo from '@/public/workxpace-logo.svg';
import LoadingSpin from '@/components/ui/LoadingSpin';

type LoginFormProps = {
  /** True jika AZURE_AD_* lengkap di server — tombol Microsoft ditampilkan */
  showMicrosoftLogin: boolean;
};

export default function LoginForm({ showMicrosoftLogin }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn('credentials', {
        email,
        password,
        redirect: true,
        callbackUrl: '/dashboard',
      });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = () => {
    setIsSubmitting(true);
    void signIn('azure-ad', { callbackUrl: '/dashboard' });
  };

  if (isSubmitting) return <LoadingSpin />;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-4 mb-8 text-blue-600">
          <Image src={Logo} alt="Workxpace Logo" width={64} height={64} />
          <div>
            <h1 className="text-3xl font-bold">Workxpace</h1>
            <p className="text-sm text-gray-600">eBudgeting System</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="block h-auto border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {showMicrosoftLogin ? (
            <div className="mt-6">
              <div className="relative flex items-center py-2">
                <div className="grow border-t border-gray-200" />
                <span className="mx-3 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
                  atau
                </span>
                <div className="grow border-t border-gray-200" />
              </div>
              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={isSubmitting}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <span className="text-[13px]">Sign in with Microsoft</span>
              </button>
              <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                Akun Entra dipetakan ke user di aplikasi lewat email (sama dengan email di database).
                User harus sudah terdaftar dan memiliki role.
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
