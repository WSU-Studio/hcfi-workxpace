'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

interface MicrosoftSignInButtonProps {
  callbackUrl?: string;
  className?: string;
  label?: string;
}

/**
 * Brand-compliant Microsoft sign-in button.
 *
 * Single responsibility: trigger the NextAuth OAuth flow for the `azure-ad`
 * provider and render the official Microsoft button styling. It does NOT
 * decide whether SSO is enabled (that lives in the page that mounts it) and
 * it does NOT translate sign-in errors (those surface through the standard
 * NextAuth `?error=` redirect to the login page).
 *
 * Visual spec follows Microsoft's brand guidelines:
 * https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
 *   - White background, 1px #8C8C8C border
 *   - Segoe UI / system font, 15px, #5E5E5E text
 *   - Official 4-square logo, 21x21px
 */
export default function MicrosoftSignInButton({
  callbackUrl = '/dashboard',
  className = '',
  label = 'Sign in with Microsoft',
}: MicrosoftSignInButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    setIsSubmitting(true);
    await signIn('azure-ad', { callbackUrl });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      aria-label={label}
      className={[
        'flex w-full items-center justify-center gap-3 rounded-lg border border-[#8C8C8C] bg-white px-4 py-2.5',
        'font-medium text-[15px] text-[#5E5E5E] shadow-sm transition',
        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer',
        className,
      ].join(' ')}
    >
      <MicrosoftLogo />
      <span>{isSubmitting ? 'Redirecting to Microsoft…' : label}</span>
    </button>
  );
}

/**
 * Official Microsoft 4-square logo. Inline SVG keeps the brand mark in
 * version control alongside the button, avoiding an extra network request
 * and ensuring crisp rendering at any density.
 */
function MicrosoftLogo() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
