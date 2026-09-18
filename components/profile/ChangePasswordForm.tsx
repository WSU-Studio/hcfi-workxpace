'use client';

import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import PasswordInput from '@/components/ui/PasswordInput';
import {
  MIN_PASSWORD_LENGTH,
  validateChangePasswordInput,
  type ChangePasswordField,
} from '@/lib/auth/password';

const emptyForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordForm() {
  const [form, setForm] = useState(emptyForm);
  const [fieldError, setFieldError] = useState<{ field: ChangePasswordField; message: string } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: ChangePasswordField, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (fieldError?.field === field) setFieldError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = validateChangePasswordInput(form);
    if (!parsed.ok) {
      setFieldError({ field: parsed.field, message: parsed.error });
      toast.error(parsed.error);
      return;
    }

    setIsSubmitting(true);
    setFieldError(null);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: parsed.currentPassword,
          newPassword: parsed.newPassword,
          confirmPassword: form.confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.error === 'string' ? data.error : 'Failed to change password';
        const field =
          data.field === 'currentPassword' ||
          data.field === 'newPassword' ||
          data.field === 'confirmPassword'
            ? data.field
            : 'currentPassword';
        setFieldError({ field, message });
        toast.error(message);
        return;
      }
      setForm(emptyForm);
      toast.success('Password changed');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className="mb-1.5 block font-medium">
          Current password <span className="text-red-500">*</span>
        </label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(event) => setField('currentPassword', event.target.value)}
          required
        />
        {fieldError?.field === 'currentPassword' ? (
          <p className="mt-1 text-sm text-red-600">{fieldError.message}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="newPassword" className="mb-1.5 block font-medium">
          New password <span className="text-red-500">*</span>
        </label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={form.newPassword}
          onChange={(event) => setField('newPassword', event.target.value)}
          required
        />
        <p className="mt-1 text-xs text-gray-500">Minimum {MIN_PASSWORD_LENGTH} characters.</p>
        {fieldError?.field === 'newPassword' ? (
          <p className="mt-1 text-sm text-red-600">{fieldError.message}</p>
        ) : null}
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1.5 block font-medium">
          Confirm new password <span className="text-red-500">*</span>
        </label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={form.confirmPassword}
          onChange={(event) => setField('confirmPassword', event.target.value)}
          required
        />
        {fieldError?.field === 'confirmPassword' ? (
          <p className="mt-1 text-sm text-red-600">{fieldError.message}</p>
        ) : null}
      </div>
      <div className="pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Change password'}
        </Button>
      </div>
    </form>
  );
}
