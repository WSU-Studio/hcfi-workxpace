'use client';

import { signIn } from 'next-auth/react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Logo from '@/public/workxpace-logo.svg';
import LoadingSpin from '@/components/ui/LoadingSpin';
import MicrosoftSignInButton from '@/components/auth/MicrosoftSignInButton';

const CALLBACK_URL = '/dashboard';

const ssoEnabled = process.env.NEXT_PUBLIC_AZURE_AD_SSO_ENABLED === 'true';

/**
 * Translate NextAuth `signIn` error codes into user-facing messages.
 *
 * Single responsibility: keep this mapping in one place so the login UI
 * stays declarative and we can extend with new codes (e.g. account locked)
 * without touching the rendering logic.
 */
function describeLoginError(code: string | undefined | null): string {
  if (!code) return 'Login failed. Please try again.';
  switch (code) {
    case 'CredentialsSignin':
      return 'Email or password is incorrect. Please check your credentials and try again.';
    case 'AccessDenied':
      return 'Your Microsoft account is not provisioned in this application. Please contact your administrator.';
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'Callback':
      return 'Microsoft sign-in could not be completed. Please try again in a moment.';
    case 'CallbackRouteError':
      return 'Login could not be completed. Please try again in a moment.';
    default:
      return 'Login failed. Please try again.';
  }
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpin />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setErrorMessage(describeLoginError(errorCode));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      // `redirect: false` so the browser stays on /login when credentials
      // are wrong — otherwise NextAuth would bounce to /login?error=... and
      // we'd lose the chance to render an inline message in the same flow.
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: CALLBACK_URL,
      });

      if (!result) {
        setErrorMessage(describeLoginError(null));
        return;
      }

      if (result.error) {
        setErrorMessage(describeLoginError(result.error));
        return;
      }

      // Successful sign-in: navigate to the post-login destination. Use a
      // full reload so server components pick up the fresh session cookie.
      window.location.href = result.url ?? CALLBACK_URL;
    } catch (error) {
      console.error('Login failed:', error);
      setErrorMessage(describeLoginError(null));
    } finally {
      setIsSubmitting(false);
    }
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
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 shadow-sm"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden />
                <div className="flex-1">
                  <p className="font-semibold">Login failed</p>
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter your email"
                aria-invalid={Boolean(errorMessage)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Enter your password"
                aria-invalid={Boolean(errorMessage)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium cursor-pointer"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            {ssoEnabled && (
              <>
                <div
                  className="relative flex items-center"
                  role="separator"
                  aria-label="Or sign in with single sign-on"
                >
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="mx-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                    or
                  </span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>

                <MicrosoftSignInButton callbackUrl={CALLBACK_URL} />

                <p className="text-center text-xs text-gray-500">
                  Use your Hyundai Capital corporate account.
                </p>
              </>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
