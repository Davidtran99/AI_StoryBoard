/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './Card';
import { Button } from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  t: (key: any) => string;
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message, t }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md relative animate-[modal-content-show_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-base text-slate-300 whitespace-pre-wrap">{message}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onClose} variant="secondary" className="ml-auto">
            {t('close')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};