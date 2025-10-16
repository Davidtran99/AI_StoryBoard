/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { Play, Loader2, Download, RefreshCw, Wand2, VideoOff, Pencil, X } from 'lucide-react';
import type { UseStoryboardReturn, Scene, Aspect } from '../../types';
import { Timeline } from './Timeline';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { formatDuration, download } from '../../lib/utils';
import { cameraAngleOptions, transitionOptions, cuttingStyleOptions } from '../../constants';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';


// --- VideoPreviewModal Component ---
interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  t: (key: any) => string;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ isOpen, onClose, videoUrl, t }) => {
  if (!isOpen || !videoUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in-0"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl animate-[modal-content-show_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <Button variant="secondary" size="icon" className="h-9 w-9 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white" onClick={onClose}>
                <X className="h-5 w-5" />
            </Button>
        </div>
        <video 
          src={videoUrl}
          controls
          autoPlay
          loop
          className="rounded-lg object-contain w-full max-h-[80vh] shadow-2xl shadow-black/50" 
        />
      </div>
    </div>
  );
};


// --- VideoSettingsModal Component ---
interface VideoSettingsModalProps {
  scene: Scene | null;
  index: number | null;
  storyboard: UseStoryboardReturn;
  onClose: () => void;
  t: (key: any, replacements?: any) => string;
}

const VideoSettingsModal: React.FC<VideoSettingsModalProps> = ({ scene, index, storyboard, onClose, t }) => {
  if (!scene || index === null) return null;

  const { updateScene } = storyboard;

  const handleFieldChange = (field: keyof Scene, value: any) => {
    updateScene(index, { [field]: value });
  };
  
  const areSettingsEnabled = scene.useAdvancedVideoSettings !== false; // Default to true if undefined

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0" onClick={onClose}>
      <Card className="w-full max-w-2xl relative max-h-[90vh] flex flex-col animate-[modal-content-show_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>{t('videoSettingsModalTitle', { index: index + 1 })}</CardTitle>
          <CardDescription>{t('videoSettingsModalDescription')}</CardDescription>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto pr-4 space-y-4">
          <div className="flex items-center space-x-4 border p-4 rounded-lg bg-slate-800/50 border-slate-700">
              <Wand2 className="h-6 w-6 text-teal-400 flex-shrink-0" />
              <div className="flex-grow">
                  <Label htmlFor="advanced-video-settings" className="font-semibold text-slate-200 mb-0">{t('advancedVideoSettingsLabel')}</Label>
                  <p className="text-sm text-slate-400">{t('advancedVideoSettingsDescription')}</p>
              </div>
              <Switch 
                id="advanced-video-settings" 
                checked={areSettingsEnabled} 
                onCheckedChange={(checked) => handleFieldChange('useAdvancedVideoSettings', checked)} 
              />
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity duration-300 ${!areSettingsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <Label htmlFor={`cameraAngle-modal-${scene.id}`}>{t('cameraAngleLabel')}</Label>
              <Select id={`cameraAngle-modal-${scene.id}`} value={scene.cameraAngle} onChange={e => handleFieldChange('cameraAngle', e.target.value)} disabled={!areSettingsEnabled}>
                {cameraAngleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor={`cuttingStyle-modal-${scene.id}`}>{t('cuttingStyleLabel')}</Label>
              <Select id={`cuttingStyle-modal-${scene.id}`} value={scene.cuttingStyle} onChange={e => handleFieldChange('cuttingStyle', e.target.value)} disabled={!areSettingsEnabled}>
                {cuttingStyleOptions.map(o => <option key={o.value} value={o.value} title={o.description}>{o.label}</option>)}
              </Select>
            </div>
          </div>
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4`}>
              <div className={`transition-opacity duration-300 ${!areSettingsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <Label htmlFor={`transition-modal-${scene.id}`}>{t('transitionLabel')}</Label>
                <Select id={`transition-modal-${scene.id}`} value={scene.transition} onChange={e => handleFieldChange('transition', e.target.value)} disabled={!areSettingsEnabled}>
                  {transitionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor={`duration-modal-${scene.id}`}>{t('durationLabel')}</Label>
                <Input
                    id={`duration-modal-${scene.id}`}
                    type="number"
                    value={scene.duration || ''}
                    onChange={e => handleFieldChange('duration', Number(e.target.value))}
                    min={1}
                />
            </div>
          </div>
          <div>
            <Label htmlFor={`video-prompt-modal-${scene.id}`}>{t('videoPromptLabel')}</Label>
            <Textarea 
                id={`video-prompt-modal-${scene.id}`} 
                value={scene.videoPrompt} 
                onChange={e => handleFieldChange('videoPrompt', e.target.value)} 
                rows={6} 
                placeholder={t('videoPromptPlaceholder')}
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



// --- SceneVideoCard Component ---
interface SceneVideoCardProps {
  scene: Scene;
  index: number;
  generateVideoForScene: (index: number) => void;
  aspectRatio: Aspect;
  onOpenSettings: () => void;
  onOpenPreview: (url: string) => void;
  t: (key: any, replacements?: any) => string;
}

const EmptyVideoPlaceholder: React.FC<{ aspectRatio: Aspect }> = ({ aspectRatio }) => (
    <div className="rounded-lg border-2 border-dashed border-slate-700/80 p-3 bg-transparent flex flex-col group">
        <div className={`${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} bg-slate-800/20 rounded-lg flex items-center justify-center bg-gradient-to-br from-slate-900/50 to-slate-800/40 relative overflow-hidden`}>
            <div className="absolute inset-0 bg-grid-slate-700/10 [background-size:32px_32px] [mask-image:radial-gradient(ellipse_100%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            <VideoOff className="h-10 w-10 text-slate-600 z-10" />
        </div>
        <div className="pt-2 mt-auto">
            <div className="h-5 w-3/4 bg-slate-700/50 rounded mt-1 animate-pulse"></div>
            <div className="h-4 w-full bg-slate-800/60 rounded mt-2 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-4 w-1/2 bg-slate-800/60 rounded mt-1 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
    </div>
);

const SceneVideoCard: React.FC<SceneVideoCardProps> = ({ scene, index, generateVideoForScene, aspectRatio, onOpenSettings, onOpenPreview, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const handleMouseEnter = () => {
    videoRef.current?.play().catch(console.error);
  };
  const handleMouseLeave = () => {
    videoRef.current?.pause();
  };

  return (
    <div className="rounded-lg border border-slate-700/50 p-3 bg-slate-900/40 flex flex-col">
      <div 
        className={`${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} bg-slate-800/50 rounded-lg relative overflow-hidden group`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {scene.videoStatus === 'done' && scene.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={scene.videoUrl}
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
             <button 
                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => onOpenPreview(scene.videoUrl!)}
                aria-label={t('previewVideo')}
            >
                <div className="h-14 w-14 text-white bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="h-8 w-8 ml-1" />
                </div>
            </button>
          </>
        ) : (
          scene.mainImage ? (
             <img src={scene.mainImage.dataUrl} alt={`Cảnh ${index + 1}`} className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-500 text-base">{t('noImageYet')}</div>
          )
        )}

        {(scene.videoStatus === 'idle' || !scene.videoStatus) && (
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="default" size="icon" onClick={() => generateVideoForScene(index)} title={t('generateVideoTooltip')}>
                 <Play className="h-6 w-6" />
              </Button>
           </div>
        )}

        {scene.videoStatus === 'generating' && (
           <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-4">
                {scene.mainImage && <img src={scene.mainImage.dataUrl} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-105" />}
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative">
                    <Loader2 className="h-8 w-8 text-teal-400 animate-spin" />
                    <p className="text-base text-slate-300 mt-3">{t('generatingVideo')}</p>
                    <p className="text-sm text-slate-400 mt-1 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" title={scene.videoStatusMessage}>
                        {scene.videoStatusMessage || t('generatingVideoETA')}
                    </p>
                </div>
           </div>
        )}

        {scene.videoStatus === 'error' && (
           <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center text-center p-4">
              <p className="text-base text-red-200">{t('videoGenerationFailed')}</p>
              {scene.videoStatusMessage && <p className="text-xs text-red-300 mt-1 max-w-full px-2 truncate" title={scene.videoStatusMessage}>{scene.videoStatusMessage}</p>}
               <Button variant="secondary" size="sm" className="mt-3 gap-2" onClick={() => generateVideoForScene(index)}>
                 <RefreshCw className="h-4 w-4" /> {t('retry')}
              </Button>
           </div>
        )}
      </div>
      <div className="pt-2 mt-auto flex items-end justify-between gap-2">
        <div className="flex-grow overflow-hidden">
            <p className="text-base font-medium text-slate-200 truncate">{t('sceneCardTitle', { index: index + 1 })}</p>
            <p className="text-sm text-slate-400 line-clamp-2 h-8">{scene.action || t('sceneActionPlaceholder')}</p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
            {scene.videoStatus === 'done' && scene.videoUrl && (
              <>
                <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    title={t('regenerateImage')}
                    onClick={() => generateVideoForScene(index)}
                >
                    <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8" 
                onClick={onOpenSettings} 
                title={t('editVideoSettingsTooltip')}
            >
                <Pencil className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
};


interface TimelinePreviewerProps {
  storyboard: UseStoryboardReturn;
  fps: number;
  t: (key: any, replacements?: any) => string;
}

const MIN_DISPLAY_SLOTS = 6;

export const TimelinePreviewer: React.FC<TimelinePreviewerProps> = ({ storyboard, fps, t }) => {
  const { scenes, generateVideoForScene, generateAllSceneVideos, isBatchGenerating, aspectRatio, batchProgress } = storyboard;
  
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);

  const scenesToGenerateCount = scenes.filter(s => s.mainImage && (!s.videoStatus || s.videoStatus === 'idle' || s.videoStatus === 'error')).length;
  const isGeneratingAnyVideo = scenes.some(s => s.videoStatus === 'generating') || isBatchGenerating;
  const displaySlots = Math.max(MIN_DISPLAY_SLOTS, scenes.length);
  
  const videoBatchProgress = batchProgress && batchProgress.task === 'video' ? batchProgress : null;

  const gridColsClass = aspectRatio === '16:9'
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
  
  return (
    <div className="mt-4">
       <VideoPreviewModal
        isOpen={!!previewingVideoUrl}
        onClose={() => setPreviewingVideoUrl(null)}
        videoUrl={previewingVideoUrl}
        t={t}
      />
      <VideoSettingsModal
        scene={editingSceneIndex !== null ? scenes[editingSceneIndex] : null}
        index={editingSceneIndex}
        storyboard={storyboard}
        onClose={() => setEditingSceneIndex(null)}
        t={t}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div>
              <CardTitle>{t('timelineTitle')}</CardTitle>
              <CardDescription>
                {t('timelineDescription')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {scenesToGenerateCount > 0 && (
                <Button onClick={generateAllSceneVideos} disabled={isGeneratingAnyVideo}>
                  {isGeneratingAnyVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {isGeneratingAnyVideo ? t('generating') : t('generateAllVideos', { count: scenesToGenerateCount })}
                </Button>
              )}
            </div>
          </div>
          {videoBatchProgress && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <p className="text-sm text-slate-300 mb-2 text-center">
                {t('batchGeneratingVideos', { completed: videoBatchProgress.completed, total: videoBatchProgress.total, eta: formatDuration(videoBatchProgress.eta) })}
              </p>
              <Progress value={(videoBatchProgress.completed / videoBatchProgress.total) * 100} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Timeline scenes={scenes} fps={fps} t={t} />
          
           <div className={`mt-6 grid ${gridColsClass} gap-4`}>
                {Array.from({ length: displaySlots }).map((_, index) => {
                    const scene = scenes[index];
                    if (scene) {
                        return (
                           <SceneVideoCard 
                                key={scene.id}
                                scene={scene}
                                index={index}
                                generateVideoForScene={generateVideoForScene}
                                aspectRatio={aspectRatio}
                                t={t}
                                onOpenSettings={() => setEditingSceneIndex(index)}
                                onOpenPreview={(url) => setPreviewingVideoUrl(url)}
                            />
                        );
                    }
                    return <EmptyVideoPlaceholder key={`placeholder-${index}`} aspectRatio={aspectRatio} />;
                })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};