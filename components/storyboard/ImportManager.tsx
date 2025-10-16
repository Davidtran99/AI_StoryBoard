/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo } from 'react';
import { Wand2, Users, MapPin, Loader2, Images, ClipboardList, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { CharacterManager } from './CharacterManager';
import { LocationManager } from './LocationManager';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ImageEditModal } from './ImageEditModal';
import type { UseStoryboardReturn, UploadedImage, Character, Location, VideoStyle } from '../../types';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Progress } from '../ui/Progress';
import { formatDuration } from '../../lib/utils';
import { Select } from '../ui/Select';
import { BlueprintPreviewModal } from './BlueprintPreviewModal';

interface ImportManagerProps {
  storyboard: UseStoryboardReturn;
  videoStyle: VideoStyle;
  setVideoStyle: (style: VideoStyle) => void;
  t: (key: any, replacements?: any) => string;
}

export const ImportManager: React.FC<ImportManagerProps> = ({ storyboard, videoStyle, setVideoStyle, t }) => {
  const [activeTab, setActiveTab] = useState('characters');
  const [previewingImage, setPreviewingImage] = useState<UploadedImage | null>(null);
  const [editingEntity, setEditingEntity] = useState<{ type: 'character' | 'location', index: number } | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  
  const { 
    idea, setIdea,
    generateBlueprintFromIdea, isGeneratingFromText,
    generateScenesFromBlueprint, isGeneratingScenes, 
    generateAllReferenceImages, isGeneratingReferenceImages,
    characters, addCharacter, updateCharacter, removeCharacter, handleCharacterImageUpload, generateCharacterImage, editCharacterImage,
    locations, addLocation, updateLocation, removeLocation, handleLocationImageUpload, generateLocationImage, editLocationImage,
    scenes, isSceneBusy, aspectRatio, storyOutline, updateStoryOutline,
    videoDuration, setVideoDuration,
    batchProgress,
  } = storyboard;

  const hasAssetsToGenerate = characters.some(c => !c.image && c.description) || locations.some(l => !l.image && l.description);
  const refImageBatchProgress = batchProgress && batchProgress.task === 'ảnh tham chiếu' ? batchProgress : null;
  const showGenerateScenesButton = (characters.length > 0 || locations.length > 0) && scenes.length === 0;
  const hasBlueprint = characters.length > 0 || locations.length > 0 || storyOutline.length > 0;

  const handleOpenEditModal = (type: 'character' | 'location', index: number) => {
    setEditingEntity({ type, index });
  };

  const handleCloseEditModal = () => {
    setEditingEntity(null);
  };

  const handleImageEditSubmit = async (prompt: string, referenceImages: UploadedImage[]) => {
    if (editingEntity) {
      if (editingEntity.type === 'character') {
        await editCharacterImage(editingEntity.index, prompt, referenceImages);
      } else {
        await editLocationImage(editingEntity.index, prompt, referenceImages);
      }
      handleCloseEditModal();
    }
  };

  const editingImage = editingEntity ? (editingEntity.type === 'character' ? characters[editingEntity.index].image : locations[editingEntity.index].image) : null;
  const isEditing = editingEntity ? (editingEntity.type === 'character' ? isSceneBusy(characters[editingEntity.index].id) : isSceneBusy(locations[editingEntity.index].id)) : false;

  const tabs = [
    { id: 'characters', label: t('tabCharacters'), icon: Users },
    { id: 'locations', label: t('tabLocations'), icon: MapPin },
  ];

  const AiResultsPanel = () => {
    if (isGeneratingFromText) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <Loader2 className="h-10 w-10 text-teal-400 animate-spin mb-4" />
          <p className="text-lg font-semibold text-slate-200">{t('aiResultsLoading')}</p>
          <p className="text-slate-400">{t('aiResultsLoadingDescription')}</p>
        </div>
      );
    }
    if (!hasBlueprint) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-900/30 rounded-lg border-2 border-dashed border-slate-700/50">
          <ClipboardList className="h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300">{t('aiResultsPlaceholderTitle')}</h3>
          <p className="text-slate-400 mt-1">{t('aiResultsPlaceholderDescription')}</p>
        </div>
      );
    }
    return (
        <Card className="h-full flex flex-col bg-slate-900/70 border-slate-700/80">
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('aiResultsTitle')}</CardTitle>
                    <CardDescription>{t('aiResultsDescription')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsPreviewModalOpen(true)}>
                    <Eye className="h-4 w-4 mr-2"/>
                    {t('previewPlanButton')}
                </Button>
            </CardHeader>
            <CardContent className="flex-grow space-y-4 overflow-y-auto max-h-[400px]">
                {characters.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-2">{t('tabCharacters')}</h4>
                        <ul className="space-y-3 list-disc list-inside text-slate-400">
                            {characters.map(char => (
                                <li key={char.id} className="text-sm">
                                    <strong className="text-slate-300">{char.name}:</strong> {char.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                 {locations.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-2">{t('tabLocations')}</h4>
                        <ul className="space-y-3 list-disc list-inside text-slate-400">
                            {locations.map(loc => (
                                <li key={loc.id} className="text-sm">
                                    <strong className="text-slate-300">{loc.name}:</strong> {loc.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                 {storyOutline.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-2">{t('storyOutlineTitle')}</h4>
                        <ol className="space-y-2 list-decimal list-inside text-slate-400">
                           {storyOutline.map((point, i) => <li key={i} className="text-sm">{point}</li>)}
                        </ol>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <BlueprintPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        characters={characters}
        locations={locations}
        storyOutline={storyOutline}
        onUpdateCharacter={updateCharacter}
        onUpdateLocation={updateLocation}
        onUpdateStoryOutline={updateStoryOutline}
        t={t}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t('ideaTitle')}</CardTitle>
          <CardDescription>{t('ideaDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left Column: Input */}
                <div className="space-y-4">
                    <Textarea
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder={t('ideaPlaceholder')}
                        rows={8}
                        disabled={isGeneratingFromText}
                        className="text-base leading-relaxed"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                        <div>
                            <Label htmlFor="video-duration">{t('videoDurationLabel')}</Label>
                            <Input
                                id="video-duration"
                                type="number"
                                value={videoDuration}
                                onChange={(e) => setVideoDuration(Number(e.target.value))}
                                placeholder={t('videoDurationPlaceholder')}
                                className="w-full"
                                min={8}
                                step={1}
                            />
                            <p className="text-sm text-slate-500 mt-1.5">{t('scenesToBeCreated', { count: Math.max(1, Math.ceil(videoDuration / 8))})}</p>
                        </div>
                        <div>
                            <Label htmlFor="video-style">{t('videoStyleLabel')}</Label>
                            <Select
                                id="video-style"
                                value={videoStyle}
                                onChange={(e) => setVideoStyle(e.target.value as VideoStyle)}
                                className="w-full"
                            >
                                <option value="cinematic">{t('styleCinematic')}</option>
                                <option value="hyper-realistic-3d">{t('styleHyperRealistic3D')}</option>
                                <option value="3d-pixar">{t('style3DPixar')}</option>
                            </Select>
                            <p className="text-sm text-slate-500 mt-1.5">{t('videoStyleDescription')}</p>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button onClick={() => generateBlueprintFromIdea()} disabled={!idea.trim() || isGeneratingFromText}>
                            {isGeneratingFromText ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Wand2 className="h-4 w-4 mr-2" />}
                            {t('generateBlueprintButton')}
                        </Button>
                    </div>
                </div>

                {/* Right Column: AI Results */}
                <div className="min-h-[300px] lg:min-h-full">
                  <AiResultsPanel />
                </div>
            </div>
          
          {showGenerateScenesButton && (
            <div className="mt-6 p-4 border border-dashed border-teal-500/50 rounded-lg bg-teal-950/20 text-center animate-in fade-in-0 duration-500">
              <h3 className="text-lg font-semibold text-teal-200">{t('blueprintReadyTitle')}</h3>
              <p className="text-slate-300 my-2">{t('blueprintReadyDescription')}</p>
              <Button onClick={generateScenesFromBlueprint} disabled={isGeneratingScenes}>
                {isGeneratingScenes ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Images className="h-4 w-4 mr-2" />}
                {t('generateScenesButton')}
              </Button>
            </div>
          )}

          <div className="my-6 border-t border-slate-700/50"></div>
          
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-base font-medium transition-all duration-300 ${
                                activeTab === tab.id
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex-grow flex items-center justify-end gap-4">
                    {refImageBatchProgress && (
                        <div className="flex-grow max-w-xs text-right">
                            <p className="text-sm text-slate-300 mb-1">
                                {t('generatingReferenceImagesProgress', { completed: refImageBatchProgress.completed, total: refImageBatchProgress.total, eta: formatDuration(refImageBatchProgress.eta) })}
                            </p>
                            <Progress value={(refImageBatchProgress.completed / refImageBatchProgress.total) * 100} />
                        </div>
                    )}
                    <Button
                        onClick={() => generateAllReferenceImages()}
                        disabled={isGeneratingReferenceImages || !hasAssetsToGenerate}
                        variant="outline"
                        size="sm"
                    >
                        {isGeneratingReferenceImages ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Wand2 className="h-4 w-4 mr-2" />}
                        {t('generateAllReferenceImages')}
                    </Button>
                </div>
            </div>
            {activeTab === 'characters' && (
                <div className="animate-in fade-in-0">
                    <CharacterManager 
                        characters={characters}
                        onAddCharacter={addCharacter}
                        onUpdate={updateCharacter}
                        onRemoveCharacter={removeCharacter}
                        onImageUpload={handleCharacterImageUpload}
                        onGenerateImage={generateCharacterImage}
                        onEditImage={(index) => handleOpenEditModal('character', index)}
                        isSceneBusy={isSceneBusy}
                        onOpenPreview={setPreviewingImage}
                        aspectRatio={aspectRatio}
                        isInitialLoading={isGeneratingFromText}
                        t={t}
                    />
                </div>
            )}
            {activeTab === 'locations' && (
                <div className="animate-in fade-in-0">
                    <LocationManager
                        locations={locations}
                        onAddLocation={addLocation}
                        onUpdate={updateLocation}
                        onRemoveLocation={removeLocation}
                        onImageUpload={handleLocationImageUpload}
                        onGenerateImage={generateLocationImage}
                        onEditImage={(index) => handleOpenEditModal('location', index)}
                        isSceneBusy={isSceneBusy}
                        onOpenPreview={setPreviewingImage}
                        aspectRatio={aspectRatio}
                        isInitialLoading={isGeneratingFromText}
                        t={t}
                    />
                </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <ImagePreviewModal
        isOpen={!!previewingImage}
        onClose={() => setPreviewingImage(null)}
        image={previewingImage}
        t={t}
      />

      <ImageEditModal
        isOpen={!!editingEntity}
        onClose={handleCloseEditModal}
        image={editingImage}
        isEditing={isEditing}
        onSubmit={handleImageEditSubmit}
        t={t}
      />
    </>
  );
};