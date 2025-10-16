/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ImageUp, Wand2, Loader2, Trash2, Pencil, RefreshCcw, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import type { Character, UploadedImage, Aspect } from '../../types';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface CharacterManagerProps {
  characters: Character[];
  onAddCharacter: () => void;
  onImageUpload: (index: number) => void;
  onUpdate: (index: number, data: Partial<Character>) => void;
  onRemoveCharacter: (index: number) => void;
  onGenerateImage: (index: number) => void;
  onEditImage: (index: number) => void;
  isSceneBusy: (id: string) => boolean;
  onOpenPreview: (image: UploadedImage) => void;
  aspectRatio: Aspect;
  isInitialLoading: boolean;
  t: (key: any, replacements?: any) => string;
}

const CharacterListItem = React.memo<{
  character: Character;
  isSelected: boolean;
  onClick: () => void;
  t: (key: any) => string;
}>(({ character, isSelected, onClick, t }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-2 rounded-lg transition-all duration-200 flex gap-3 items-center relative overflow-hidden ${isSelected ? 'bg-teal-900/50' : 'hover:bg-slate-800/70'}`}
  >
    {isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-teal-400 rounded-r-full shadow-[0_0_8px_theme('colors.teal.400')]"></div>}
    <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center overflow-hidden">
      {character.image ? (
        <img src={character.image.dataUrl} alt={character.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-amber-950/50">
            <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
      )}
    </div>
    <div className="flex-grow overflow-hidden">
      <p className="font-semibold text-slate-200 truncate">{character.name}</p>
      <p className={`text-sm ${character.status === 'suggested' ? 'text-amber-400' : 'text-slate-400'}`}>
        {character.status === 'suggested' ? t('statusNeedsReference') : t('statusDefined')}
      </p>
    </div>
  </button>
));

interface CharacterDetailViewProps {
  character: Character;
  index: number;
  onUpdate: (index: number, data: Partial<Character>) => void;
  onGenerateImage: (index: number) => void;
  onImageUpload: (index: number) => void;
  onEditImage: (index: number) => void;
  onDeleteRequest: (index: number) => void;
  onOpenPreview: (image: UploadedImage) => void;
  isBusy: boolean;
  aspectRatio: Aspect;
  t: (key: any, replacements?: any) => string;
}

const CharacterDetailView = React.memo<CharacterDetailViewProps>(({
  character, index, onUpdate, onGenerateImage, onImageUpload, 
  onEditImage, onDeleteRequest, onOpenPreview, isBusy, aspectRatio, t
}) => {
  return (
    <div className="p-4 bg-slate-800/30 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
          <h5 className="text-xl font-bold text-slate-100">{character.name}</h5>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => onDeleteRequest(index)} title={t('deleteEntityTooltip', { entity: t('character') })}>
              <Trash2 className="h-4 w-4" />
          </Button>
      </div>

      <div className="flex-grow space-y-4">
        {character.image ? (
            <div className="space-y-2 max-w-sm mx-auto">
                <div
                    className="relative w-full bg-slate-700/50 rounded-lg group overflow-hidden"
                    style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
                >
                    <img src={character.image!.dataUrl} alt={character.name} className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
                    <button type="button" onClick={() => onOpenPreview(character.image!)} className="absolute inset-0" aria-label={`Xem ảnh ${character.name}`}></button>
                    {isBusy && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg z-10">
                            <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" onClick={() => onGenerateImage(index)} variant="secondary" title={t('regenerateImageTooltip')} disabled={isBusy}>
                        <RefreshCcw className="h-4 w-4 mr-2"/> {t('regenerateImage')}
                    </Button>
                    <Button size="sm" onClick={() => onImageUpload(index)} variant="secondary" title={t('uploadImageTooltip')} disabled={isBusy}>
                        <ImageUp className="h-4 w-4 mr-2"/> {t('uploadImage')}
                    </Button>
                    <Button size="sm" onClick={() => onEditImage(index)} variant="secondary" title={t('editImageWithAITooltip')} disabled={isBusy}>
                        <Pencil className="h-4 w-4 mr-2"/> {t('editImageWithAI')}
                    </Button>
                </div>
            </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-900/50 border border-dashed border-slate-600 space-y-3">
              <Textarea
                value={character.description}
                onChange={(e) => onUpdate(index, { description: e.target.value })}
                className="text-sm !h-24 bg-slate-800/50"
                rows={5}
                placeholder={t('characterDescriptionPlaceholder')}
              />
              <div className="flex gap-2">
                  <Button size="sm" onClick={() => onGenerateImage(index)} className="w-full" disabled={isBusy || !character.description}>
                      {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                      {t('generateImage')}
                  </Button>
                  <Button size="sm" onClick={() => onImageUpload(index)} variant="outline" className="w-full" disabled={isBusy}>
                      <ImageUp className="h-4 w-4 mr-2" /> {t('uploadImage')}
                  </Button>
              </div>
          </div>
        )}
        <div>
          <Label htmlFor={`char-name-${character.id}`}>{t('characterNameLabel')}</Label>
          <Input
            id={`char-name-${character.id}`}
            value={character.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            className="text-base"
            placeholder={t('characterNameLabel')}
          />
        </div>
        {character.image && (
          <div>
            <Label htmlFor={`char-desc-${character.id}`}>{t('descriptionLabel')}</Label>
            <Textarea
              id={`char-desc-${character.id}`}
              value={character.description}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              className="text-sm bg-slate-800/50"
              rows={4}
              placeholder={t('characterDescriptionPlaceholder')}
            />
          </div>
        )}
      </div>
    </div>
  );
});

const CharacterManagerSkeleton = () => (
    <Card>
        <CardHeader>
             <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-teal-400"/>Quản lý nhân vật</CardTitle>
                    <CardDescription>Tạo hoặc tải ảnh tham chiếu để giữ sự nhất quán cho nhân vật.</CardDescription>
                </div>
                <div className="h-9 w-36 bg-slate-800/80 rounded-md animate-pulse"></div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[300px] animate-pulse">
                <div className="md:col-span-1 border-r border-slate-700/50 pr-4 h-[300px] overflow-y-auto space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full p-2 flex gap-3 items-center">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-700/80 rounded-md"></div>
                    <div className="flex-grow space-y-2">
                        <div className="h-4 w-3/4 bg-slate-700/80 rounded"></div>
                        <div className="h-3 w-1/2 bg-slate-700/80 rounded"></div>
                    </div>
                    </div>
                ))}
                </div>
                <div className="md:col-span-2 p-4 space-y-4">
                    <div className="h-6 w-1/2 bg-slate-700/80 rounded"></div>
                    <div className="w-full max-w-sm mx-auto aspect-square bg-slate-700/80 rounded-lg"></div>
                    <div className="h-5 w-1/4 bg-slate-700/80 rounded"></div>
                    <div className="h-10 w-full bg-slate-700/80 rounded-md"></div>
                </div>
            </div>
        </CardContent>
    </Card>
);


export const CharacterManager: React.FC<CharacterManagerProps> = ({ 
  characters, onAddCharacter, onRemoveCharacter, isInitialLoading, t, ...props
}) => {
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);
  const [deletingCharIndex, setDeletingCharIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (characters.length > 0 && selectedCharIndex === null) {
      setSelectedCharIndex(0);
    }
    if (selectedCharIndex !== null && selectedCharIndex >= characters.length) {
      setSelectedCharIndex(characters.length > 0 ? characters.length - 1 : null);
    }
  }, [characters, selectedCharIndex]);

  const handleConfirmDeleteChar = () => {
    if (deletingCharIndex !== null) {
      onRemoveCharacter(deletingCharIndex);
      setDeletingCharIndex(null);
    }
  };
  
  if (isInitialLoading && characters.length === 0) {
    return <CharacterManagerSkeleton />;
  }

  const selectedCharacter = selectedCharIndex !== null ? characters[selectedCharIndex] : null;

  return (
    <>
      <ConfirmationModal
        isOpen={deletingCharIndex !== null}
        onClose={() => setDeletingCharIndex(null)}
        onConfirm={handleConfirmDeleteChar}
        title={t('confirmDeleteTitle', { name: deletingCharIndex !== null ? characters[deletingCharIndex]?.name : ''})}
        message={t('confirmDeleteCharacterMessage')}
        t={t}
      />
      <Card>
          <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                      <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-teal-400"/>{t('characterManagerTitle')}</CardTitle>
                      <CardDescription>{t('characterManagerDescription')}</CardDescription>
                  </div>
                  <Button onClick={onAddCharacter} variant="secondary" size="sm" title={t('addCharacterTooltip')}>
                      <UserPlus className="h-4 w-4 mr-2"/>{t('addCharacter')}
                  </Button>
              </div>
          </CardHeader>
          <CardContent>
              {characters.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[300px]">
                      <div className="md:col-span-1 border-r border-slate-700/50 pr-4 h-[300px] overflow-y-auto space-y-2">
                          {characters.map((char, i) => (
                              <CharacterListItem
                                  key={char.id}
                                  character={char}
                                  isSelected={selectedCharIndex === i}
                                  onClick={() => setSelectedCharIndex(i)}
                                  t={t}
                              />
                          ))}
                      </div>
                      <div className="md:col-span-2">
                          {selectedCharacter && selectedCharIndex !== null ? (
                              <CharacterDetailView
                                  character={selectedCharacter}
                                  index={selectedCharIndex}
                                  isBusy={props.isSceneBusy(selectedCharacter.id)}
                                  onDeleteRequest={setDeletingCharIndex}
                                  t={t}
                                  {...props}
                              />
                          ) : (
                             <div className="h-full flex items-center justify-center text-slate-500">
                                  <p>{t('selectEntityToViewDetails', { entity: t('character') })}</p>
                             </div>
                          )}
                      </div>
                  </div>
              ) : (
                  <div className="min-h-[300px] flex items-center justify-center text-center border-2 border-dashed border-slate-700/80 rounded-xl bg-transparent text-slate-500">
                      <div>
                          <p>{t('noCharactersYet')}</p>
                          <p className="text-base mt-1">{t('noEntitiesHint', { entity: t('character') + 's' })}</p>
                      </div>
                  </div>
              )}
          </CardContent>
      </Card>
    </>
  );
};
