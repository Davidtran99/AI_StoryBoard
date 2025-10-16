/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { UploadedImage } from '../../types';
import { download } from '../../lib/utils';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: UploadedImage | null;
  t: (key: any) => string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, image, t }) => {
  if (!isOpen || !image) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in-0"
      onClick={onClose}
    >
      <div 
        className="relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 rounded-md px-3"
              onClick={() => download(image.dataUrl, image.name)}
            >
                <Download className="h-4 w-4 mr-2" /> {t('downloadImage')}
            </Button>
            <Button variant="secondary" size="icon" className="h-9 w-9" onClick={onClose}>
                <X className="h-5 w-5" />
            </Button>
        </div>
        <img 
          src={image.dataUrl} 
          alt={image.name} 
          className="rounded-lg object-contain max-w-[80vw] max-h-[80vh] shadow-2xl shadow-black/50" 
        />
      </div>
    </div>
  );
};