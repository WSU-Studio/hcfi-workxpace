'use client';

import { useEscapeKey } from '@/hooks/useEscapeKey';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayClassName?: string;
  panelClassName?: string;
  closeOnEscape?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4',
  panelClassName,
  closeOnEscape = true,
}: ModalProps) {
  useEscapeKey(onClose, isOpen && closeOnEscape);

  if (!isOpen) return null;

  return (
    <div className={overlayClassName} role="presentation">
      <div className={panelClassName} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
