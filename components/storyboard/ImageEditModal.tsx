/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, UploadCloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { UploadedImage } from '../../types';
import { readFilesAsDataUrls } from '../../lib/fileHelper';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: UploadedImage | null;
  onSubmit: (prompt: string, referenceImages: UploadedImage[]) => Promise<void>;
  isEditing: boolean;
  t: (key: any) => string;
}

export const ImageEditModal: React.FC<ImageEditModalProps> = ({ isOpen, onClose, image, onSubmit, isEditing, t }) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setPrompt(''); // Reset prompt when modal closes
      setReferenceImages([]);
    }
  }, [isOpen]);

  if (!isOpen || !image) return null;

  const handleSubmit = async () => {
    if (!prompt.trim() || isEditing) return;
    await onSubmit(prompt, referenceImages);
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newImages = await readFilesAsDataUrls(e.target.files);
    setReferenceImages(prev => [...prev, ...newImages].slice(0, 2)); // Limit to 2
    e.target.value = ''; // Reset file input
  };
  
  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0">
      <Card className="w-full max-w-3xl relative">
        <CardHeader>
          <CardTitle>{t('editImageTitle')}</CardTitle>
          <CardDescription>{t('editImageDescription')}</CardDescription>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t('originalImageLabel')}</Label>
            <img src={image.dataUrl} alt="Original" className="rounded-lg object-contain w-full" />
          </div>
          <div className="space-y-4 flex flex-col">
             <div>
                <Label htmlFor="edit-prompt">{t('editPromptLabel')}</Label>
                <Textarea
                  id="edit-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('editPromptPlaceholder')}
                  rows={4}
                  disabled={isEditing}
                />
             </div>
             <div>
                <Label>{t('referenceImagesLabel')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    {Array.from({ length: 2 }).map((_, index) => {
                        const refImage = referenceImages[index];
                        if (refImage) {
                            return (
                                <div key={index} className="relative group aspect-video">
                                    <img src={refImage.dataUrl} alt={`Reference ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    <button
                                        onClick={() => handleRemoveReferenceImage(index)}
                                        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={t('removeImageTooltip')}
                                        disabled={isEditing}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isEditing || referenceImages.length >= 2}
                                className="aspect-video w-full flex flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-700 hover:border-teal-500 transition-colors text-slate-500 hover:text-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <UploadCloud className="h-6 w-6" />
                                <span className="text-sm mt-1">{t('uploadReferenceImage')}</span>
                            </button>
                        );
                    })}
                </div>
             </div>
          </div>
        </CardContent>
        <CardFooter>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          <Button onClick={onClose} variant="secondary" disabled={isEditing}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!prompt.trim() || isEditing} className="ml-auto">
            {isEditing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Sparkles className="h-4 w-4 mr-2" />}
            {t('generateNewImage')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
