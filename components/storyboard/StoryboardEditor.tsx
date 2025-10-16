/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { PlusSquare, Image as ImageIcon, Wand2, Loader2, Trash2, Pencil, Users, MapPin, X, RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { imageShotTypeOptions } from '../../constants';
import type { UseStoryboardReturn, Scene, UploadedImage, ApiConfig, Character, Location } from '../../types';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ImageEditModal } from './ImageEditModal';
import { Progress } from '../ui/Progress';
import { formatDuration } from '../../lib/utils';
import { ConfirmationModal } from '../ui/ConfirmationModal';


// --- SceneDetailModal Component ---
interface SceneDetailModalProps {
  scene: Scene | null;
  index: number | null;
  storyboard: UseStoryboardReturn;
  onClose: () => void;
  t: (key: any, replacements?: any) => string;
}

const SceneDetailModal: React.FC<SceneDetailModalProps> = ({ scene, index, storyboard, onClose, t }) => {
  if (!scene || index === null) return null;

  const { updateScene, characters, locations } = storyboard;

  const handleFieldChange = (field: keyof Scene, value: any) => {
    updateScene(index, { [field]: value });
  };

  const handleCharacterChange = (charId: string) => {
    const currentIds = scene.characterIds || [];
    const newIds = currentIds.includes(charId)
      ? currentIds.filter(id => id !== charId)
      : [...currentIds, charId];
    updateScene(index, { characterIds: newIds });
  };

  const handleLocationChange = (locId: string) => {
    const currentIds = scene.locationIds || [];
    const newIds = currentIds.includes(locId)
      ? currentIds.filter(id => id !== locId)
      : [...currentIds, locId];
    updateScene(index, { locationIds: newIds });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0" onClick={onClose}>
      <Card className="w-full max-w-2xl relative max-h-[90vh] flex flex-col animate-[modal-content-show_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>{t('sceneDetailTitle', { index: index + 1 })}</CardTitle>
          <CardDescription>{t('sceneDetailDescription')}</CardDescription>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto pr-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`action-${scene.id}`}>{t('actionLabel')}</Label>
                <Textarea id={`action-${scene.id}`} value={scene.action} onChange={e => handleFieldChange('action', e.target.value)} rows={3} />
              </div>
              <div>
                <Label htmlFor={`setting-${scene.id}`}>{t('settingLabel')}</Label>
                <Textarea id={`setting-${scene.id}`} value={scene.setting} onChange={e => handleFieldChange('setting', e.target.value)} rows={3} />
              </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('charactersInSceneLabel')}</Label>
                {characters.length > 0 ? (
                    <div className="p-2 max-h-24 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/50 space-y-1.5">
                        {characters.map(char => (
                            <div key={char.id} className="flex items-center gap-2">
                                <input type="checkbox" id={`char-modal-${scene.id}-${char.id}`} checked={scene.characterIds?.includes(char.id)} onChange={() => handleCharacterChange(char.id)} className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500" />
                                <label htmlFor={`char-modal-${scene.id}-${char.id}`} className="text-sm text-slate-300">{char.name}</label>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-500 italic mt-1">{t('noCharactersAvailable')}</p>}
            </div>
            <div>
                <Label>{t('mainLocationLabel')}</Label>
                {locations.length > 0 ? (
                  <div className="p-2 max-h-24 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/50 space-y-1.5">
                    {locations.map(loc => (
                      <div key={loc.id} className="flex items-center gap-2">
                        <input type="checkbox" id={`loc-modal-${scene.id}-${loc.id}`} checked={scene.locationIds?.includes(loc.id)} onChange={() => handleLocationChange(loc.id)} className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500" />
                        <label htmlFor={`loc-modal-${scene.id}-${loc.id}`} className="text-sm text-slate-300">{loc.name}</label>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-500 italic mt-1">{t('noLocationsAvailable')}</p>}
            </div>
          </div>
           <div>
              <Label htmlFor={`shot-type-modal-${scene.id}`}>{t('imageShotTypeLabel')}</Label>
              <Select id={`shot-type-modal-${scene.id}`} value={scene.imageShotType || ''} onChange={e => handleFieldChange('imageShotType', e.target.value)}>
                {imageShotTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
          <div>
              <Label htmlFor={`image-prompt-modal-${scene.id}`}>{t('imagePromptLabel')}</Label>
              <Textarea 
                  id={`image-prompt-modal-${scene.id}`} 
                  value={scene.imagePrompt} 
                  onChange={e => handleFieldChange('imagePrompt', e.target.value)} 
                  rows={6} 
                  placeholder={t('imagePromptPlaceholder')}
              />
          </div>
        </CardContent>
         <CardFooter className="flex-shrink-0 bg-slate-900/50 border-t border-slate-700/50 flex justify-end">
          <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
        </CardFooter>
      </Card>
    </div>
  );
};


// --- SceneCard Component ---
interface SceneCardProps {
  scene: Scene;
  index: number;
  storyboard: UseStoryboardReturn;
  apiConfig: ApiConfig;
  onOpenPreview: (image: UploadedImage) => void;
  onOpenEditModal: (index: number) => void;
  onOpenDetailModal: (index: number) => void;
  onDeleteRequest: (index: number) => void;
  t: (key: any, replacements?: any) => string;
}

const SceneCard: React.FC<SceneCardProps> = React.memo(({ scene, index, storyboard, apiConfig, onOpenPreview, onOpenEditModal, onOpenDetailModal, onDeleteRequest, t }) => {
  const { 
    updateScene, generateImageForScene, 
    handleReplaceImage, isSceneBusy,
    generateMoreImageOptionsForScene,
  } = storyboard;

  const isBusy = isSceneBusy(scene.id);
  
  const isGoogle = apiConfig.service === 'google';
  const modelOptions = isGoogle
      ? [
          { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Nhanh, chất lượng)' },
          { id: 'gemini-2.5-flash-image-preview', name: 'Nano-banana (Sửa ảnh & Tham chiếu)' },
        ]
      : apiConfig.aivideoautoModels;
  const defaultModel = isGoogle ? apiConfig.googleModel : apiConfig.aivideoautoModel;

  const sceneCharacters = (scene.characterIds || [])
    .map(id => storyboard.characters.find(c => c.id === id))
    .filter((c): c is Character => !!c);
  const sceneLocations = (scene.locationIds || [])
    .map(id => storyboard.locations.find(l => l.id === id))
    .filter((l): l is Location => !!l);


  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-4 flex-row items-start justify-between gap-2">
          <div className="flex-grow flex items-baseline gap-2">
              <h3 className="text-xl font-bold text-slate-100 flex-shrink-0">{t('sceneCardTitle', { index: index + 1 })}:</h3>
              <Input
                  value={scene.title}
                  onChange={e => updateScene(index, { title: e.target.value })}
                  placeholder={t('sceneCardTitlePlaceholder')}
                  className="text-lg w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto font-semibold text-slate-200"
              />
          </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-grow flex flex-col gap-4">
          <div 
            className="relative w-full bg-slate-800/50 rounded-lg overflow-hidden group"
            style={{ aspectRatio: storyboard.aspectRatio.replace(':', ' / ')}}
          >
            {scene.mainImage ? (
                <>
                    <img src={scene.mainImage.dataUrl} alt={`Cảnh ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <button type="button" onClick={() => onOpenPreview(scene.mainImage!)} className="absolute inset-0" aria-label={`Xem ảnh Cảnh ${index + 1}`}></button>
                </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-base rounded-lg border-2 border-dashed border-slate-700 bg-gradient-to-br from-slate-900/50 to-slate-800/40">
                <div className="text-center">
                  <ImageIcon className="h-10 w-10 text-slate-600 mx-auto mb-2"/>
                  <p>{t('noImageYet')}</p>
                </div>
              </div>
            )}

            {isBusy && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg z-10">
                <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm">{t('imageOptionsLabel')}</Label>
                {scene.mainImage && scene.imageOptions.length < 3 && (
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-xs h-7 px-2"
                        onClick={() => generateMoreImageOptionsForScene(index)} 
                        disabled={isBusy}
                        title={t('addMoreOptionsTooltip')}
                    >
                        <RefreshCcw className="h-3 w-3 mr-1.5" />
                        {t('addMoreOptions')}
                    </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {isBusy && scene.imageOptions.length === 0 ? (
                  // Loading state for all 3 placeholders
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="aspect-video bg-slate-800/80 rounded-md animate-pulse"></div>
                  ))
                ) : (
                  // Render available options or empty slots
                  Array.from({ length: 3 }).map((_, i) => {
                    const option = scene.imageOptions[i];
                    if (option) {
                      const isSelected = scene.mainImage?.dataUrl === option.dataUrl;
                      return (
                        <button
                          key={option.dataUrl}
                          onClick={() => updateScene(index, { mainImage: option })}
                          disabled={isBusy}
                          className={`relative aspect-video rounded-md overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ring-offset-2 ring-offset-slate-900 ${isSelected ? 'ring-2 ring-teal-400 shadow-lg shadow-teal-500/20' : 'ring-1 ring-slate-700 hover:ring-slate-500'}`}
                        >
                          <img src={option.dataUrl} alt={`Tùy chọn ảnh ${i + 1}`} className="w-full h-full object-cover" />
                          {isSelected && <div className="absolute inset-0 bg-teal-500/30"></div>}
                        </button>
                      );
                    }
                    // Empty slot
                    return <div key={i} className="aspect-video bg-slate-800/50 rounded-md ring-1 ring-slate-700/50"></div>;
                  })
                )}
              </div>
          </div>
          
          <div>
              <Label htmlFor={`model-select-${scene.id}`} className="text-sm mb-1">{t('imageModelLabel')}</Label>
               <Select
                  id={`model-select-${scene.id}`}
                  value={scene.imageModel || defaultModel}
                  onChange={e => updateScene(index, { imageModel: e.target.value })}
                  disabled={isBusy || (!isGoogle && apiConfig.aivideoautoStatus !== 'valid')}
                  className="h-9 text-sm"
              >
                  {modelOptions.length > 0 ? (
                      modelOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  ) : (
                      <option disabled>{t('noModelAvailable')}</option>
                  )}
              </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => generateImageForScene(index)} disabled={isBusy} title={t('generateImageTooltip')}>
              <Wand2 className="h-4 w-4 mr-2" /> {t('generate')}
            </Button>
             <Button size="sm" onClick={() => handleReplaceImage(index)} disabled={isBusy} variant="secondary" title={t('replaceImageTooltip')}>
                <ImageIcon className="h-4 w-4 mr-2" /> {t('replace')}
            </Button>
            <Button size="sm" onClick={() => onOpenEditModal(index)} disabled={!scene.mainImage || isBusy} variant="secondary" title={t('editImageWithAITooltip')}>
                <Pencil className="h-4 w-4 mr-2" /> {t('edit')}
            </Button>
          </div>
      </CardContent>
       <CardFooter className="p-4 pt-0 mt-auto flex items-center justify-between gap-2 text-sm text-slate-400">
          <div className="flex-grow flex flex-col gap-1.5 overflow-hidden">
            {(sceneCharacters.length > 0 || sceneLocations.length > 0) ? (
                <>
                    {sceneCharacters.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap" title={t('charactersLabel', { names: sceneCharacters.map(c => c.name).join(', ') })}>
                            <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {sceneCharacters.map(char => (
                                    <div key={char.id} className="flex items-center gap-1.5 bg-slate-800/60 rounded-full pl-0.5 pr-2 py-0.5 text-sm">
                                        {char.image ?
                                          <img src={char.image.dataUrl} alt={char.name} className="h-4 w-4 rounded-full object-cover" />
                                          : <div className="h-4 w-4 rounded-full bg-slate-700 flex-shrink-0"></div>
                                        }
                                        <span className="text-slate-300 text-xs truncate">{char.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {sceneLocations.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap" title={t('locationLabel', { names: sceneLocations.map(c => c.name).join(', ') })}>
                            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {sceneLocations.map(loc => (
                                    <div key={loc.id} className="flex items-center gap-1.5 bg-slate-800/60 rounded-full pl-0.5 pr-2 py-0.5 text-sm">
                                        {loc.image ?
                                          <img src={loc.image.dataUrl} alt={loc.name} className="h-4 w-4 rounded-full object-cover" />
                                          : <div className="h-4 w-4 rounded-full bg-slate-700 flex-shrink-0"></div>
                                        }
                                        <span className="text-slate-300 text-xs truncate">{loc.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-xs text-slate-500 italic">{t('noCharacterOrLocation')}</p>
            )}
        </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => onOpenDetailModal(index)} title={t('editDetailsTooltip')}>
                <Pencil className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteRequest(index)}
                title={t('deleteSceneTooltip')}
                className="h-8 w-8 text-slate-500 hover:text-red-500"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
          </div>
      </CardFooter>
    </Card>
  );
});


// --- StoryboardEditor Component ---
interface StoryboardEditorProps {
  storyboard: UseStoryboardReturn;
  apiConfig: ApiConfig;
  t: (key: any, replacements?: any) => string;
}

export const StoryboardEditor: React.FC<StoryboardEditorProps> = ({ storyboard, apiConfig, t }) => {
  const { scenes, addBlankScene, regenerateAllImages, isBatchGenerating, batchProgress, regenerateMissingImages, reorderScenes } = storyboard;

  const [previewingImage, setPreviewingImage] = useState<UploadedImage | null>(null);
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [detailSceneIndex, setDetailSceneIndex] = useState<number | null>(null);
  const [deletingSceneIndex, setDeletingSceneIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const imageBatchProgress = batchProgress && batchProgress.task === 'ảnh' ? batchProgress : null;
  const analysisBatchProgress = batchProgress && batchProgress.task === 'phân tích ảnh' ? batchProgress : null;
  const hasAnyImage = scenes.some(s => s.mainImage);

  const handleOpenEditModal = (index: number) => {
    setEditingSceneIndex(index);
  };

  const handleCloseEditModal = () => {
    setEditingSceneIndex(null);
  };
  
  const handleImageEditSubmit = async (prompt: string, referenceImages: UploadedImage[]) => {
    if (editingSceneIndex !== null) {
      await storyboard.editImageForScene(editingSceneIndex, prompt, referenceImages);
      handleCloseEditModal();
    }
  };

  const handleConfirmDeleteScene = () => {
    if (deletingSceneIndex !== null) {
      storyboard.removeScene(deletingSceneIndex);
      setDeletingSceneIndex(null);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    reorderScenes(draggedIndex, dropIndex);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };


  const editingScene = editingSceneIndex !== null ? scenes[editingSceneIndex] : null;
  const isEditing = editingSceneIndex !== null ? storyboard.isSceneBusy(scenes[editingSceneIndex].id) : false;

  const detailScene = detailSceneIndex !== null ? scenes[detailSceneIndex] : null;

  const gridColsClass = storyboard.aspectRatio === '16:9'
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

  return (
    <>
      <ConfirmationModal
        isOpen={deletingSceneIndex !== null}
        onClose={() => setDeletingSceneIndex(null)}
        onConfirm={handleConfirmDeleteScene}
        title={t('confirmDeleteSceneTitle', { index: deletingSceneIndex !== null ? deletingSceneIndex + 1 : '' })}
        message={t('confirmDeleteSceneMessage')}
        t={t}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div>
              <CardTitle>{t('storyboardEditorTitle')}</CardTitle>
              <CardDescription>{t('storyboardEditorDescription')}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {scenes.some(s => !s.mainImage) && (
                <Button onClick={regenerateMissingImages} disabled={isBatchGenerating} title={t('regenerateMissingImagesTooltip')}>
                  {isBatchGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                  {t('regenerateMissingImages')}
                </Button>
              )}
              {scenes.length > 0 && (
                <Button onClick={regenerateAllImages} disabled={isBatchGenerating} title={hasAnyImage ? t('regenerateAllImagesTooltip') : t('generateAllImagesTooltip')}>
                  {isBatchGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {hasAnyImage ? t('regenerateAllImages') : t('generateAllImages')}
                </Button>
              )}
              <Button onClick={addBlankScene} title={t('addBlankSceneTooltip')}>
                <PlusSquare className="h-4 w-4 mr-2"/>{t('addBlankScene')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analysisBatchProgress && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-300 mb-2 text-center">
                    {t('analyzingUploadedImages', { completed: analysisBatchProgress.completed, total: analysisBatchProgress.total, eta: formatDuration(analysisBatchProgress.eta) })}
                </p>
                <Progress value={(analysisBatchProgress.completed / analysisBatchProgress.total) * 100} />
            </div>
          )}
          {imageBatchProgress && (
            <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-300 mb-2 text-center">
                    {t('batchGeneratingImages', { completed: imageBatchProgress.completed, total: imageBatchProgress.total, eta: formatDuration(imageBatchProgress.eta) })}
                </p>
                <Progress value={(imageBatchProgress.completed / imageBatchProgress.total) * 100} />
            </div>
          )}
          {scenes.length > 0 ? (
            <div className={`grid ${gridColsClass} gap-6`}>
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-opacity duration-300 cursor-grab ${draggedIndex === index ? 'opacity-30' : 'opacity-100'}`}
                >
                  <SceneCard
                    scene={scene}
                    index={index}
                    storyboard={storyboard}
                    apiConfig={apiConfig}
                    onOpenPreview={setPreviewingImage}
                    onOpenEditModal={handleOpenEditModal}
                    onOpenDetailModal={setDetailSceneIndex}
                    onDeleteRequest={setDeletingSceneIndex}
                    t={t}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-[200px] flex items-center justify-center text-center border-2 border-dashed border-slate-700/80 rounded-xl bg-slate-900/30 text-slate-500 [background-image:radial-gradient(theme('colors.slate.800/50')_1px,transparent_1px)] [background-size:1.5rem_1.5rem]">
              <div className="flex flex-col items-center gap-4">
                <ImageIcon className="h-16 w-16 text-slate-600"/>
                 {storyboard.characters.length > 0 || storyboard.locations.length > 0 ? (
                    <div>
                        <p className="font-semibold text-slate-300">{t('storyboardAwaitingGenerationTitle')}</p>
                        <p className="text-base mt-1">{t('storyboardAwaitingGenerationDescription')}</p>
                    </div>
                ) : (
                    <div>
                        <p className="font-semibold text-slate-300">{t('storyboardEmptyTitle')}</p>
                        <p className="text-base mt-1">{t('storyboardEmptyDescription')}</p>
                    </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ImagePreviewModal
        isOpen={!!previewingImage}
        onClose={() => setPreviewingImage(null)}
        image={previewingImage}
        t={t}
      />

      <ImageEditModal
        isOpen={!!editingScene}
        onClose={handleCloseEditModal}
        image={editingScene?.mainImage || null}
        isEditing={isEditing}
        onSubmit={handleImageEditSubmit}
        t={t}
      />

      <SceneDetailModal
        scene={detailScene}
        index={detailSceneIndex}
        storyboard={storyboard}
        onClose={() => setDetailSceneIndex(null)}
        t={t}
      />
    </>
  );
}