/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Film, Images, Settings, Sparkles, PlayCircle, Video, CheckCircle } from 'lucide-react';
import { Button } from './components/ui/Button';
import { AlertModal } from './components/ui/AlertModal';
import useStoryboard from './hooks/useStoryboard';
import { StoryboardEditor } from './components/storyboard/StoryboardEditor';
import { ImportManager } from './components/storyboard/ImportManager';
import useApiConfig from './hooks/useApiConfig';
import { TimelinePreviewer } from './components/storyboard/TimelinePreviewer';
import { SettingsModal } from './components/settings/SettingsModal';
import { Aspect, VideoStyle } from './types';
import { HelpModal } from './components/ui/HelpModal';
import { ToastHost } from './components/ui/ToastHost';
import { getTranslator, Language } from './i18n';


export default function App() {
  const [activeTab, setActiveTab] = useState('images');
  const [fps, setFps] = useState(30);
  const [autoPrompt, setAutoPrompt] = useState(true);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<Aspect>('16:9');
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const t = getTranslator('vi');

  const handleApiError = useCallback((errorMessage: string) => {
    console.error('🔴 [APP ERROR]', errorMessage);
    setApiError(errorMessage);
  }, []);

  // FIX: Removed the `t` property from the `useApiConfig` hook call as it is not a valid prop, resolving a TypeScript error.
  const apiConfig = useApiConfig({ onError: handleApiError });
  
  const storyboard = useStoryboard({
    autoGeneratePrompt: autoPrompt,
    apiConfig,
    onError: handleApiError,
    videoStyle,
    aspectRatio,
  });

  const hasImagesToDownload = useMemo(() => storyboard.scenes.some(s => s.mainImage), [storyboard.scenes]);
  const hasVideosToDownload = useMemo(() => storyboard.scenes.some(s => s.videoStatus === 'done' && s.videoUrl), [storyboard.scenes]);
  
  const workflowSteps = [
    { value: 'images', label: t('tabIdea'), icon: Sparkles },
    { value: 'storyboard', label: t('tabStoryboard'), icon: Images },
    { value: 'timeline', label: t('tabTimeline'), icon: PlayCircle },
  ];

  const progressStatus = useMemo(() => {
    const { scenes } = storyboard;
    const status = {
      images: false,
      storyboard: false,
      timeline: false,
    };

    if (storyboard.characters.length > 0 || storyboard.locations.length > 0) {
      status.images = true;
    }
    if (scenes.length > 0) {
        status.storyboard = true;
    }
    if (scenes.length > 0 && scenes.every(s => s.videoStatus === 'done' && s.videoUrl)) {
      status.timeline = true;
    }
    return status;
  }, [storyboard.scenes, storyboard.characters, storyboard.locations]);

  const Navigation = () => (
    <div className="flex items-center gap-2 rounded-xl bg-slate-900/50 border border-slate-700/50 shadow-lg p-1.5 backdrop-blur-lg">
      {workflowSteps.map(step => {
        const isCompleted = progressStatus[step.value as keyof typeof progressStatus];
        const isActive = activeTab === step.value;
        const Icon = step.icon;
        
        const isStoryboardDisabled = step.value === 'storyboard' && !progressStatus.images;
        const isTimelineDisabled = step.value === 'timeline' && !progressStatus.storyboard;

        return (
          <button
            key={step.value}
            onClick={() => setActiveTab(step.value)}
            disabled={isStoryboardDisabled || isTimelineDisabled}
            className={`relative flex-1 justify-center gap-2.5 inline-flex items-center rounded-lg text-base font-medium transition-all duration-300 h-10 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isActive 
                ? 'bg-teal-600/40 text-teal-100 shadow-inner shadow-black/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70 hover:text-teal-300'
            } ${ (isStoryboardDisabled || isTimelineDisabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className={`h-4 w-4 ${isActive ? 'text-teal-300' : ''}`} />
            {step.label}
            {isCompleted && <div className={`absolute top-2 right-2 h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white/80' : 'bg-green-500/80'}`}></div>}
            {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-teal-300 rounded-full shadow-[0_0_12px_theme('colors.teal.400')]"></div>}
          </button>
        )
      })}
    </div>
  );

  return (
    <div className="min-h-screen w-full text-slate-200">
      <ToastHost />
      <AlertModal
        isOpen={!!apiError}
        onClose={() => setApiError(null)}
        title={t('apiErrorTitle')}
        message={apiError || ''}
        t={t}
      />
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        t={t}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiConfig={apiConfig}
        autoPrompt={autoPrompt}
        setAutoPrompt={setAutoPrompt}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        fps={fps}
        setFps={setFps}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        t={t}
      />
      
      <div className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="py-4 sm:py-6 space-y-6">
            <header className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Sparkles className="h-8 w-8 text-teal-400"/>
                    <div className="absolute inset-0 -z-10 bg-teal-500/50 blur-lg rounded-full"></div>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-100 via-slate-300 to-teal-200" style={{textShadow: '0 2px 20px rgba(20, 184, 166, 0.3), 0 0 5px rgba(20, 184, 166, 0.2)'}}>
                    {t('appTitle')}
                  </h1>
                  <p className="text-base text-slate-400 leading-relaxed">{t('appDescription')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={storyboard.downloadAllSceneImages} disabled={!hasImagesToDownload} title={t('downloadAllImagesTooltip')}><Images className="h-4 w-4 mr-2"/>{t('downloadAllImages')}</Button>
                <Button variant="outline" onClick={storyboard.downloadAllSceneVideos} disabled={!hasVideosToDownload} title={t('downloadAllVideosTooltip')}><Video className="h-4 w-4 mr-2"/>{t('downloadAllVideos')}</Button>
                <Button 
                    variant="secondary" 
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="h-10 w-10 p-0 flex-shrink-0"
                    size="icon"
                    title={t('openSettingsTooltip')}
                >
                    <Settings className="h-5 w-5"/>
                </Button>
              </div>
            </header>
            <Navigation />
          </div>
        </div>
      </div>
      
      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="py-6 space-y-6">
          {activeTab === 'images' && <div className="animate-in fade-in-0 duration-300"><ImportManager storyboard={storyboard} videoStyle={videoStyle} setVideoStyle={setVideoStyle} t={t}/></div>}
          {activeTab === 'storyboard' && <div className="animate-in fade-in-0 duration-300"><StoryboardEditor storyboard={storyboard} apiConfig={apiConfig} t={t}/></div>}
          {activeTab === 'timeline' && <div className="animate-in fade-in-0 duration-300"><TimelinePreviewer storyboard={storyboard} fps={fps} t={t} /></div>}
          
          <footer className="pt-8 text-center text-sm text-slate-500">
            <p>{t('footerTip')}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
