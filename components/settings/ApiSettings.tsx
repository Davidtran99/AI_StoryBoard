/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { KeyRound, Loader2, CheckCircle, AlertTriangle, Lock, Unlock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import type { ApiConfig } from '../../types';

interface ApiSettingsProps {
  apiConfig: ApiConfig;
  t: (key: any, replacements?: any) => string;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({ apiConfig, t }) => {
  const [aivideoautoTokenInput, setAivideoautoTokenInput] = useState('');
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState('');

  useEffect(() => {
    setAivideoautoTokenInput(apiConfig.aivideoautoToken || '');
  }, [apiConfig.aivideoautoToken]);
  
  useEffect(() => {
    if (apiConfig.isGoogleKeyOverridden || !apiConfig.isEnvKeyAvailable) {
      setGoogleApiKeyInput(apiConfig.googleApiKey || '');
    } else {
      setGoogleApiKeyInput('');
    }
  }, [apiConfig.googleApiKey, apiConfig.isGoogleKeyOverridden, apiConfig.isEnvKeyAvailable]);

  const handleSaveAivideoauto = () => {
    apiConfig.saveAivideoautoToken(aivideoautoTokenInput);
  };
  
  const handleSaveGoogle = () => {
    apiConfig.saveGoogleApiKey(googleApiKeyInput);
  };

  const renderAivideoautoStatus = () => {
    switch (apiConfig.aivideoautoStatus) {
      case 'validating':
        return <p className="text-sm text-yellow-400 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('checkingToken')}</p>;
      case 'valid':
        return <p className="text-sm text-green-400 flex items-center"><CheckCircle className="h-4 w-4 mr-2"/>{t('validToken', { count: apiConfig.aivideoautoModels.length })}</p>;
      case 'error':
        return <p className="text-sm text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>{t('invalidKeyError', { error: apiConfig.validationError })}</p>;
      default:
        if (aivideoautoTokenInput) {
            return <p className="text-sm text-slate-400">{t('pressSaveToValidate')}</p>;
        }
        return <p className="text-sm text-slate-400">{t('enterTokenToUse')}</p>;
    }
  };
  
  const renderGoogleApiStatus = () => {
    switch (apiConfig.googleApiStatus) {
      case 'validating':
        return <p className="text-sm text-yellow-400 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('checkingKey')}</p>;
      case 'valid':
        return <p className="text-sm text-green-400 flex items-center"><CheckCircle className="h-4 w-4 mr-2"/>{t('validKey')}</p>;
      case 'error':
        return <p className="text-sm text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-2"/>{t('invalidKeyError', { error: apiConfig.googleValidationError })}</p>;
      case 'env_configured':
         return <p className="text-sm text-green-400 flex items-center"><CheckCircle className="h-4 w-4 mr-2"/>{t('envKeyConfigured')}</p>;
      default:
        if (googleApiKeyInput) {
            return <p className="text-sm text-slate-400">{t('pressSaveToValidate')}</p>;
        }
        return <p className="text-sm text-slate-400">{t('enterKeyToUse')}</p>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Google Gemini API Section */}
      <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/40 space-y-3">
        <h4 className="font-semibold text-slate-200">{t('googleApiTitle')}</h4>
        
        {apiConfig.isEnvKeyAvailable && !apiConfig.isGoogleKeyOverridden ? (
          <>
            <div className="flex justify-between items-center pt-2">
              <div className="flex-grow pr-4">
                  {renderGoogleApiStatus()}
              </div>
              <Button onClick={apiConfig.unlockGoogleApiKey} variant="secondary" size="sm">
                <Unlock className="h-4 w-4 mr-2"/>{t('useDifferentKey')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="google-api-key">{t('apiKeyLabel')}</Label>
              <Input 
                id="google-api-key" 
                type="password" 
                value={googleApiKeyInput} 
                onChange={e => setGoogleApiKeyInput(e.target.value)} 
                placeholder={t('apiKeyPlaceholder')}
              />
            </div>
            <p className="text-sm text-slate-400">
              Lấy API Key tại: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">aistudio.google.com</a>
            </p>
            <div className="flex justify-between items-center pt-2">
              <div className="flex-grow pr-4">
                {renderGoogleApiStatus()}
              </div>
              <div className="flex items-center gap-2">
                  {apiConfig.isEnvKeyAvailable && (
                    <Button onClick={apiConfig.resetToEnvGoogleApiKey} variant="outline" size="sm" title={t('useDefaultKeyTooltip')}>
                      <Lock className="h-4 w-4 mr-2"/>{t('useDefaultKey')}
                    </Button>
                  )}
                  <Button onClick={handleSaveGoogle} size="sm" disabled={!googleApiKeyInput || apiConfig.googleApiStatus === 'validating'}>
                    {apiConfig.googleApiStatus === 'validating' ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                    {t('saveAndCheck')}
                  </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Aivideoauto API Section */}
      <div className="p-4 border border-slate-700 rounded-lg bg-slate-900/40 space-y-3">
          <h4 className="font-semibold text-slate-200">{t('aivideoautoApiTitle')}</h4>
          <div className="space-y-1">
              <Label htmlFor="aivideoauto-token">{t('accessTokenLabel')}</Label>
              <Input 
                  id="aivideoauto-token" 
                  type="password" 
                  value={aivideoautoTokenInput} 
                  onChange={e => setAivideoautoTokenInput(e.target.value)} 
                  placeholder={t('accessTokenPlaceholder')}
              />
          </div>
          <p className="text-sm text-slate-400">
              {t('getTokenHere')} <a href="https://aivideoauto.com/pages/account/apikeys" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">aivideoauto.com/pages/account/apikeys</a>
          </p>
          <div className="flex justify-between items-center pt-2">
              <div className="flex-grow pr-4">
                  {renderAivideoautoStatus()}
              </div>
              <Button size="sm" onClick={handleSaveAivideoauto} disabled={!aivideoautoTokenInput || apiConfig.aivideoautoStatus === 'validating'}>
                {apiConfig.aivideoautoStatus === 'validating' ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                {t('saveAndCheck')}
              </Button>
          </div>
      </div>
    </div>
  );
};
