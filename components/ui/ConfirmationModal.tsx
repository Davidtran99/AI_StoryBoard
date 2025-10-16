/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './Card';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  t: (key: any) => string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isConfirming = false,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md relative animate-[modal-content-show_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <Trash2 className="h-6 w-6 text-rose-500" />
          </div>
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-base text-slate-300">{message}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button onClick={onClose} variant="secondary" disabled={isConfirming}>
            {cancelText || t('cancel')}
          </Button>
          <Button onClick={onConfirm} variant="destructive" disabled={isConfirming}>
            {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText || t('delete')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};