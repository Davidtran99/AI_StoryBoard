/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { X, Users, MapPin, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import type { Character, Location } from '../../types';

interface BlueprintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  locations: Location[];
  storyOutline: string[];
  onUpdateCharacter: (index: number, data: Partial<Character>) => void;
  onUpdateLocation: (index: number, data: Partial<Location>) => void;
  onUpdateStoryOutline: (index: number, value: string) => void;
  t: (key: any) => string;
}

export const BlueprintPreviewModal: React.FC<BlueprintPreviewModalProps> = ({ 
  isOpen, onClose, characters, locations, storyOutline,
  onUpdateCharacter, onUpdateLocation, onUpdateStoryOutline, t 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in-0" onClick={onClose}>
      <Card className="w-full max-w-4xl relative max-h-[90vh] flex flex-col animate-[modal-content-show_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>{t('blueprintModalTitle')}</CardTitle>
          <CardDescription>{t('blueprintModalDescription')}</CardDescription>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto pr-4 space-y-6">
          {characters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-teal-300 flex items-center gap-2"><Users className="h-5 w-5" />{t('tabCharacters')}</h3>
              <div className="space-y-4">
                {characters.map((char, index) => (
                  <div key={char.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-2">
                    <Input
                      value={char.name}
                      onChange={(e) => onUpdateCharacter(index, { name: e.target.value })}
                      className="text-base font-semibold !bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
                    />
                    <Textarea
                      value={char.description}
                      onChange={(e) => onUpdateCharacter(index, { description: e.target.value })}
                      rows={3}
                      className="text-sm !bg-slate-900/50"
                      placeholder={t('characterDescriptionPlaceholder')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {locations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-teal-300 flex items-center gap-2"><MapPin className="h-5 w-5" />{t('tabLocations')}</h3>
              <div className="space-y-4">
                {locations.map((loc, index) => (
                  <div key={loc.id} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 space-y-2">
                     <Input
                      value={loc.name}
                      onChange={(e) => onUpdateLocation(index, { name: e.target.value })}
                      className="text-base font-semibold !bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
                    />
                    <Textarea
                      value={loc.description}
                      onChange={(e) => onUpdateLocation(index, { description: e.target.value })}
                      rows={3}
                      className="text-sm !bg-slate-900/50"
                      placeholder={t('locationDescriptionPlaceholder')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {storyOutline.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-teal-300 flex items-center gap-2"><ListChecks className="h-5 w-5" />{t('storyOutlineTitle')}</h3>
              <div className="space-y-3">
                {storyOutline.map((point, i) => (
                    <Textarea
                        key={i}
                        value={point}
                        onChange={(e) => onUpdateStoryOutline(i, e.target.value)}
                        rows={2}
                        className="text-sm !bg-slate-900/50"
                        placeholder="Mô tả một điểm trong cốt truyện..."
                    />
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-shrink-0 bg-slate-900/50 border-t border-slate-700/50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
        </CardFooter>
      </Card>
    </div>
  );
};