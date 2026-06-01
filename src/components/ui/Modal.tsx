'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Desktop max width class, e.g. max-w-4xl. Default max-w-4xl. */
  maxWidth?: string;
  /** Hide the default close button (top-right X) */
  hideClose?: boolean;
}

/**
 * Responsive modal:
 * - Desktop: centered with rounded corners, shadow, backdrop blur
 * - Mobile (< md): fullscreen inset-0, no rounded corners
 */
export default function Modal({ open, onClose, children, maxWidth = 'max-w-4xl', hideClose = false }: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal body */}
      <div className={`
        relative bg-white shadow-2xl overflow-y-auto animate-fadeIn
        ${maxWidth} w-full
        /* Desktop */
        max-md:inset-0 max-md:rounded-none max-md:max-w-none max-md:h-[100dvh]
        /* Default */
        rounded-2xl border border-slate-200/80 max-h-[90vh] m-4
      `}>
        {!hideClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
