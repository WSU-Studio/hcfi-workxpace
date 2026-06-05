/**
 * Form feedback helpers — small, focused, reusable.
 *
 * Why this exists:
 *   On long forms users frequently click Submit while scrolled to the bottom,
 *   and miss the validation banner that lives at the top of the page. This
 *   helper combines three feedback layers so the message is impossible to
 *   miss:
 *     1. Toast (top-right, viewport-sticky) — instant attention.
 *     2. Smooth-scroll to the offending section.
 *     3. Auto-focus the first focusable element inside that section.
 *
 * Designed to be drop-in for any form. No state coupling: callers keep their
 * own `error` state for the in-page banner; this helper just amplifies it.
 */

import type { RefObject } from 'react';
import toast from 'react-hot-toast';

const FOCUSABLE_SELECTOR = [
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]',
].join(',');

export interface NotifyFormErrorOptions {
  /** Section/element to scroll into view & focus. */
  fieldRef?: RefObject<HTMLElement | null>;
  /** Toast duration in ms. Defaults to 5000 — long enough to read on scroll. */
  durationMs?: number;
  /** Toast id, useful for replacing instead of stacking. */
  toastId?: string;
}

/**
 * Show a form-level error: toast + smooth scroll + focus the offending field.
 *
 * Safe to call on the server during build (no-ops without `window`), so it
 * can be invoked from event handlers without guards.
 */
export function notifyFormError(
  message: string,
  options: NotifyFormErrorOptions = {},
): void {
  toast.error(message, {
    duration: options.durationMs ?? 5000,
    id: options.toastId ?? 'form-error',
  });

  if (typeof window === 'undefined') return;

  const target = options.fieldRef?.current ?? null;
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const focusable = target.matches(FOCUSABLE_SELECTOR)
    ? target
    : target.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

  if (focusable) {
    // Defer focus until after the smooth-scroll begins so the focus ring lands
    // on screen rather than scrolling the viewport again.
    requestAnimationFrame(() => focusable.focus({ preventScroll: true }));
  }
}
