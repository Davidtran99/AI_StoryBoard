/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { X, Wand2, KeyRound, SlidersHorizontal, Settings, HelpCircle, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Switch } from '../ui/Switch';
import { ApiSettings } from './ApiSettings';
import { Select } from '../ui/Select';
import { ApiConfig, Aspect, VideoStyle } from '../../types';
import { Language } from '../../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  autoPrompt: boolean;
  setAutoPrompt: (value: boolean) => void;
  aspectRatio: Aspect;
  setAspectRatio: (value: Aspect) => void;
  fps: number;
  setFps: (value: number) => void;
  onOpenHelp: () => void;
  t: (key: any, replacements?: any) => string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiConfig,
  autoPrompt,
  setAutoPrompt,
  aspectRatio,
  setAspectRatio,
  fps,
  setFps,
  onOpenHelp,
  t,
}) => {
  const [activeTab, setActiveTab] = useState('general');

  if (!isOpen) return null;
  
  const tabs = [
    { id: 'general', label: t('tabGeneral'), icon: SlidersHorizontal },
    { id: 'api', label: t('tabApi'), icon: KeyRound },
  ];

  return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0" onClick={onClose}>
        <Card className="w-full max-w-4xl relative max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-6 w-6 text-teal-400"/>{t('settingsTitle')}</CardTitle>
            <CardDescription>{t('settingsDescription')}</CardDescription>
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-slate-700/50 flex items-center gap-2 -mt-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-base font-medium border-b-2 transition-all duration-200 focus:outline-none focus-visible:bg-slate-800/50 rounded-t-md ${
                  activeTab === tab.id
                    ? 'border-teal-400 text-slate-100'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <CardContent className="flex-grow overflow-y-auto">
            {/* General Settings Tab */}
            <div className={`pt-6 space-y-6 ${activeTab !== 'general' ? 'hidden' : ''}`}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-6">
                      <div>
                        <Label>{t('aspectRatioLabel')}</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setAspectRatio('16:9')} 
                            className={`p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${aspectRatio === '16:9' ? 'border-teal-500 bg-teal-950/50 shadow-lg shadow-teal-950' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'}`}
                          >
                            <div className="w-6 h-6 flex items-center justify-center"><div className="w-5 h-3 rounded-sm bg-slate-400"></div></div>
                            <h5 className="font-semibold text-slate-100">{t('aspectRatioLandscape')}</h5>
                          </button>
                          <button 
                            onClick={() => setAspectRatio('9:16')} 
                            className={`p-3 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3 ${aspectRatio === '9:16' ? 'border-teal-500 bg-teal-950/50 shadow-lg shadow-teal-950' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'}`}
                          >
                            <div className="w-6 h-6 flex items-center justify-center"><div className="w-3 h-5 rounded-sm bg-slate-400"></div></div>
                            <h5 className="font-semibold text-slate-100">{t('aspectRatioPortrait')}</h5>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 border p-4 rounded-lg bg-slate-800/50 border-slate-700">
                          <Wand2 className="h-6 w-6 text-teal-400 flex-shrink-0" />
                          <div className="flex-grow">
                              <Label htmlFor="auto-prompt-modal" className="font-semibold text-slate-200 mb-0">{t('autoAnalyzeLabel')}</Label>
                              <p className="text-sm text-slate-400">{t('autoAnalyzeDescription')}</p>
                          </div>
                          <Switch id="auto-prompt-modal" checked={autoPrompt} onCheckedChange={setAutoPrompt} />
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <Label htmlFor="fps-input">{t('fpsLabel')}</Label>
                          <Input id="fps-input" type="number" min={12} max={60} value={fps} onChange={(e) => setFps(Number(e.target.value))} />
                      </div>
                       <div className="border p-4 rounded-lg bg-slate-800/50 border-slate-700 space-y-3">
                          <h4 className="font-semibold text-slate-200">{t('helpTitle')}</h4>
                          <p className="text-sm text-slate-400">{t('helpDescription')}</p>
                          <Button variant="outline" onClick={onOpenHelp}><HelpCircle className="h-4 w-4 mr-2"/>{t('viewHelp')}</Button>
                      </div>
                  </div>
              </div>
            </div>

            {/* AI & API Config Tab */}
            <div className={`pt-6 space-y-6 ${activeTab !== 'api' ? 'hidden' : ''}`}>
              <Card className="bg-slate-900/40">
                  <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <Label>{t('aiServiceLabel')}</Label>
                              <Select value={apiConfig.service} onChange={e => apiConfig.setService(e.target.value as ApiConfig['service'])}>
                                  <option value="google">Google API</option>
                                  <option value="openai" disabled={apiConfig.openaiApiStatus !== 'valid'}>OpenAI (Prompt)</option>
                                  <option value="aivideoauto" disabled={apiConfig.aivideoautoStatus !== 'valid'}>Aivideoauto</option>
                              </Select>
                          </div>
                          <div>
                              {apiConfig.service !== 'openai' && (
                                <Label>{t('imageModelLabelSettings')}</Label>
                              )}
                              {/* If Service = OpenAI and OpenAI is ready, allow choosing single image provider and filter models */}
                              {apiConfig.service === 'openai' && apiConfig.openaiApiStatus === 'valid' && apiConfig.openaiApiKey ? (
                                <>
                                  <div className="mb-2">
                                    <Label>Dịch vụ tạo ảnh & Video khi dùng OpenAI</Label>
                                    <Select value={apiConfig.imageProvider || 'aivideoauto'} onChange={e => apiConfig.setImageProvider && apiConfig.setImageProvider(e.target.value as any)}>
                                      <option value="aivideoauto" disabled={apiConfig.aivideoautoStatus !== 'valid'}>Aivideoauto</option>
                                      <option value="google" disabled={!(apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured')}>Google (Gemini Image)</option>
                                    </Select>
                                  </div>
                                  {/* Ẩn chọn model ảnh khi ở chế độ OpenAI theo yêu cầu */}
                                </>
                              ) : apiConfig.service === 'openai' ? (
                                <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">Vui lòng nhập API Key để sử dụng.</div>
                              ) : apiConfig.service === 'google' ? (
                                (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') ? (
                                  <Select value={apiConfig.googleModel} onChange={e => apiConfig.setGoogleModel(e.target.value)}>
                                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Mặc định)</option>
                                    <option value="imagen-4.0-generate-001">Imagen 4 (Tạo ảnh nhanh)</option>
                                    <option value="gemini-2.5-flash-image-preview">Nano-banana (Sửa ảnh &amp; tham chiếu)</option>
                                  </Select>
                                ) : (
                                  <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">Vui lòng nhập API Key để sử dụng.</div>
                                )
                              ) : (
                                apiConfig.aivideoautoStatus === 'valid' ? (
                                  <Select value={apiConfig.aivideoautoModel} onChange={e => apiConfig.setAivideoautoModel(e.target.value)}>
                                    {apiConfig.aivideoautoModels.length > 0 ? (
                                      apiConfig.aivideoautoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                    ) : (
                                      <option>Chưa có model</option>
                                    )}
                                  </Select>
                                ) : (
                                  <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">Vui lòng nhập API Key để sử dụng.</div>
                                )
                              )}
                          </div>
                          <div>
                              {apiConfig.service !== 'openai' && (
                                <Label>{t('videoModelLabel')}</Label>
                              )}
                              {apiConfig.service === 'google' ? (
                                  (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') ? (
                                      <Select 
                                          value={apiConfig.googleVideoModel} 
                                          onChange={e => apiConfig.setGoogleVideoModel(e.target.value)}
                                      >
                                          <option value="veo-2.0-generate-001">Veo 2 (8 giây, 720p/1080p)</option>
                                      </Select>
                                  ) : (
                                      <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">Vui lòng nhập API Key để sử dụng.</div>
                                  )
                              ) : apiConfig.service === 'aivideoauto' ? (
                                  apiConfig.aivideoautoStatus === 'valid' ? (
                                    <Select value={apiConfig.aivideoautoVideoModel} onChange={e => apiConfig.setAivideoautoVideoModel(e.target.value)}>
                                      {apiConfig.aivideoautoVideoModels.length > 0 ? (
                                        apiConfig.aivideoautoVideoModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                      ) : (
                                        <option>Chưa có model video</option>
                                      )}
                                    </Select>
                                  ) : (
                                    <div className="flex h-10 w-full items-center rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-base text-slate-500">Vui lòng nhập API Key để sử dụng.</div>
                                  )
                              ) : null}
                          </div>
                      </div>
                  </CardContent>
              </Card>
              {/* OpenAI API (Prompt) - luôn hiển thị để người dùng nhập/lưu key */}
              <Card className="bg-slate-900/40">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>OpenAI API (Prompt) - API Key</Label>
                      <Input
                        type="password"
                        placeholder="sk-..."
                        defaultValue={apiConfig.openaiApiKey || ''}
                        onBlur={(e) => apiConfig.saveOpenaiApiKey && apiConfig.saveOpenaiApiKey(e.target.value)}
                      />
                      <div className="text-sm">
                        {apiConfig.openaiApiStatus === 'validating' && (
                          <p className="text-yellow-400 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Đang kiểm tra key...</p>
                        )}
                        {apiConfig.openaiApiStatus === 'valid' && (
                          <p className="text-green-400 flex items-center"><CheckCircle className="h-4 w-4 mr-2"/>Key hợp lệ. Đã tải {apiConfig.openaiTextModels?.length || 0} model.</p>
                        )}
                        {apiConfig.openaiApiStatus === 'error' && (
                          <p className="text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>Key không hợp lệ hoặc bị từ chối.</p>
                        )}
                        {(!apiConfig.openaiApiStatus || apiConfig.openaiApiStatus === 'idle') && (
                          <p className="text-slate-400">Nhập key và rời khỏi ô để kiểm tra.</p>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Chỉ được sử dụng để sinh prompt khi "Dịch vụ AI" = OpenAI.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Model (OpenAI)</Label>
                      <Select
                        value={apiConfig.openaiTextModel || 'gpt-4o'}
                        onChange={(e) => apiConfig.setOpenaiTextModel && apiConfig.setOpenaiTextModel(e.target.value)}
                        disabled={apiConfig.openaiApiStatus !== 'valid'}
                      >
                        {(apiConfig.openaiTextModels && apiConfig.openaiTextModels.length > 0) ? (
                          apiConfig.openaiTextModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        ) : (
                          <option>gpt-4o</option>
                        )}
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <ApiSettings apiConfig={apiConfig} t={t} />
            </div>
          </CardContent>

          <CardFooter className="flex-shrink-0 bg-slate-900/50 border-t border-slate-700/50 mt-auto flex justify-end">
            <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
          </CardFooter>
        </Card>
      </div>
  );
};