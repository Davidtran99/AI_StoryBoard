/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState, useEffect, useCallback } from 'react';
import type { ApiService, AivideoautoModel, ApiConfig } from '../types';
import * as aivideoautoService from '../services/aivideoautoService';
import * as geminiService from '../services/geminiService';
import * as openaiService from '../services/openaiService';

const AIVIDEOAUTO_TOKEN_KEY = 'aivideoauto_access_token';
const GOOGLE_API_KEY_KEY = 'google_gemini_api_key';

interface UseApiConfigProps {
  onError: (message: string) => void;
}

export default function useApiConfig({ onError }: UseApiConfigProps): ApiConfig {
  // Persist service selection across reloads
  const [service, _setService] = useState<ApiService>(() => {
    const stored = localStorage.getItem('api_service') as ApiService | null;
    return stored === 'aivideoauto' || stored === 'google' || stored === 'openai' ? stored : 'google';
  });
  
  // Google State
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [googleApiStatus, setGoogleApiStatus] = useState<'idle' | 'validating' | 'valid' | 'error' | 'env_configured'>('idle');
  const [googleValidationError, setGoogleValidationError] = useState<string | null>(null);
  const [isEnvKeyAvailable, setIsEnvKeyAvailable] = useState(false);
  const [isGoogleKeyOverridden, setIsGoogleKeyOverridden] = useState(false);
  // Default to gemini flash image to avoid Imagen billing issues by default
  const [googleModel, setGoogleModel] = useState<string>('gemini-2.5-flash-image');
  const [googleVideoModel, setGoogleVideoModel] = useState<string>('veo-2.0-generate-001');
  const [googleImageModels, setGoogleImageModels] = useState<{ id: string; name: string }[]>([]);
  const [googleVideoModels, setGoogleVideoModels] = useState<{ id: string; name: string }[]>([]);
  
  // Aivideoauto State
  const [aivideoautoToken, setAivideoautoToken] = useState<string>('');
  const [aivideoautoModels, setAivideoautoModels] = useState<AivideoautoModel[]>([]);
  const [aivideoautoModel, setAivideoautoModel] = useState<string>('');
  const [aivideoautoVideoModels, setAivideoautoVideoModels] = useState<AivideoautoModel[]>([]);
  const [aivideoautoVideoModel, setAivideoautoVideoModel] = useState<string>('');
  const [aivideoautoStatus, setAivideoautoStatus] = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  // OpenAI (prompt-only) State
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [openaiApiStatus, setOpenaiApiStatus] = useState<'idle' | 'validating' | 'valid' | 'error'>('idle');
  const [openaiTextModel, setOpenaiTextModel] = useState<string>('gpt-4o');
  const [openaiTextModels, setOpenaiTextModels] = useState<{ id: string; name: string }[]>([]);
  const [useOpenAIForPrompt, setUseOpenAIForPrompt] = useState<boolean>(false);

  // Image provider selection (active image service when GPT is used for prompts)
  const [imageProvider, setImageProvider] = useState<'aivideoauto' | 'google'>(() => {
    const stored = localStorage.getItem('image_provider');
    return stored === 'google' ? 'google' : 'aivideoauto';
  });

  const validateAndSetGoogleKey = useCallback(async (key: string) => {
    if (!key) {
      console.log('⚙️ [CONFIG] Clearing Google API key');
      setGoogleApiStatus('idle');
      setGoogleApiKey('');
      setGoogleValidationError(null);
      localStorage.removeItem(GOOGLE_API_KEY_KEY);
      return;
    }

    console.log('🔑 [CONFIG] Validating Google API key...');
    setGoogleApiStatus('validating');
    setGoogleValidationError(null);
    try {
      await geminiService.validateApiKey(key);
      // Load available models per key
      try {
        const { imageModels, videoModels } = await geminiService.listAvailableModels(key);
        setGoogleImageModels(imageModels);
        setGoogleVideoModels(videoModels);
        // Keep current selection if still valid, else set to first available
        if (!imageModels.find(m => m.id === googleModel)) {
          setGoogleModel(imageModels[0]?.id || 'gemini-2.5-flash-image');
        }
        if (!videoModels.find(m => m.id === googleVideoModel)) {
          setGoogleVideoModel(videoModels[0]?.id || 'veo-2.0-generate-001');
        }
      } catch (e) {
        console.warn('Failed to list Gemini models for key, using defaults.', e);
      }
      console.log('🟢 [CONFIG] Google API key validation successful');
      setGoogleApiKey(key);
      setGoogleApiStatus('valid');
      localStorage.setItem(GOOGLE_API_KEY_KEY, key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
      console.error('🔴 [CONFIG] Google API key validation failed:', message);
      setGoogleApiStatus('error');
      setGoogleValidationError(message);
      // Don't clear the key from state, so the user can see their invalid key
    }
  }, []);

  const validateAndSetAivideoautoToken = useCallback(async (token: string) => {
    if (!token) {
      console.log('⚙️ [CONFIG] Clearing Aivideoauto token');
      setAivideoautoStatus('idle');
      setAivideoautoToken('');
      setAivideoautoModels([]);
      setAivideoautoModel('');
      setAivideoautoVideoModels([]);
      setAivideoautoVideoModel('');
      localStorage.removeItem(AIVIDEOAUTO_TOKEN_KEY);
      return;
    }

    console.log('🔑 [CONFIG] Validating Aivideoauto token...');
    setAivideoautoStatus('validating');
    setValidationError(null);
    try {
      // Fetch both image and video models
      console.log('🔑 [CONFIG] Fetching Aivideoauto models...');
      const [imageModels, videoModels] = await Promise.all([
        aivideoautoService.getModels(token, 'image'),
        aivideoautoService.getModels(token, 'video'),
      ]);

      if (imageModels.length > 0 || videoModels.length > 0) {
        console.log('🟢 [CONFIG] Aivideoauto token validation successful:', { 
          imageModelsCount: imageModels.length, 
          videoModelsCount: videoModels.length 
        });
        setAivideoautoToken(token);
        
        if (imageModels.length > 0) {
          setAivideoautoModels(imageModels);
          setAivideoautoModel(prev => imageModels.some(m => m.id === prev) ? prev : imageModels[0].id);
        }
        
        if (videoModels.length > 0) {
            setAivideoautoVideoModels(videoModels);
            setAivideoautoVideoModel(prev => videoModels.some(m => m.id === prev) ? prev : videoModels[0].id);
        }

        setAivideoautoStatus('valid');
        localStorage.setItem(AIVIDEOAUTO_TOKEN_KEY, token);
      } else {
        console.error('🔴 [CONFIG] No models found for Aivideoauto token');
        setAivideoautoStatus('error');
        setValidationError('Không tìm thấy model nào cho token này.');
        onError('Token hợp lệ nhưng không tìm thấy model nào.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
      console.error('🔴 [CONFIG] Aivideoauto token validation failed:', message);
      setAivideoautoStatus('error');
      setValidationError(message);
      setAivideoautoToken('');
      setAivideoautoModels([]);
      setAivideoautoVideoModels([]);
      localStorage.removeItem(AIVIDEOAUTO_TOKEN_KEY);
    }
  }, [onError]);

  useEffect(() => {
    const envKey = process.env.API_KEY;
    const storedKey = localStorage.getItem(GOOGLE_API_KEY_KEY);
    
    if (envKey) {
        setIsEnvKeyAvailable(true);
        if (storedKey) {
            setIsGoogleKeyOverridden(true);
            validateAndSetGoogleKey(storedKey);
        } else {
            setIsGoogleKeyOverridden(false);
            setGoogleApiKey(envKey);
            setGoogleApiStatus('env_configured');
        }
    } else {
        setIsEnvKeyAvailable(false);
        setIsGoogleKeyOverridden(false);
        if (storedKey) {
            validateAndSetGoogleKey(storedKey);
        }
    }
    
    const storedToken = localStorage.getItem(AIVIDEOAUTO_TOKEN_KEY);
    if (storedToken) {
      validateAndSetAivideoautoToken(storedToken);
    }

    // Load OpenAI persisted config
    const storedOpenaiKey = localStorage.getItem('openai_api_key');
    const storedOpenaiModel = localStorage.getItem('openai_text_model');
    const storedUseOpenAI = localStorage.getItem('use_openai_for_prompt');
    if (storedUseOpenAI != null) {
      setUseOpenAIForPrompt(storedUseOpenAI === 'true');
    }
    if (storedOpenaiModel) {
      setOpenaiTextModel(storedOpenaiModel);
    }
    if (storedOpenaiKey) {
      (async () => {
        await (async (key: string) => {
          console.log('🔑 [CONFIG] Validating OpenAI API key...');
          setOpenaiApiStatus('validating');
          try {
            const models = await openaiService.getTextModels(key);
            setOpenaiApiKey(key);
            setOpenaiApiStatus('valid');
            setOpenaiTextModels(models);
            if (!models.find(m => m.id === openaiTextModel)) {
              setOpenaiTextModel(models[0]?.id || 'gpt-4o');
            }
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Lỗi không xác định.';
            console.error('🔴 [CONFIG] OpenAI API key validation failed:', message);
            setOpenaiApiStatus('error');
          }
        })(storedOpenaiKey);
      })();
    }
    // ensure persisted provider
    const storedProvider = localStorage.getItem('image_provider');
    if (storedProvider === 'google' || storedProvider === 'aivideoauto') {
      setImageProvider(storedProvider);
    }
  }, [validateAndSetGoogleKey, validateAndSetAivideoautoToken]);

  // Persist service selection explicitly and never auto-switch it
  useEffect(() => {
    localStorage.setItem('api_service', service);
  }, [service]);

  const setService = (next: ApiService) => {
    _setService(next);
    localStorage.setItem('api_service', next);
  };

  // persist provider changes
  useEffect(() => {
    if (imageProvider) localStorage.setItem('image_provider', imageProvider);
  }, [imageProvider]);

  const saveAivideoautoToken = async (token: string) => {
    await validateAndSetAivideoautoToken(token);
  };
  
  const saveGoogleApiKey = async (key: string) => {
    if (isEnvKeyAvailable) {
        setIsGoogleKeyOverridden(true);
    }
    await validateAndSetGoogleKey(key);
  };
  
  const unlockGoogleApiKey = () => {
      setIsGoogleKeyOverridden(true);
      setGoogleApiStatus('idle');
      setGoogleApiKey('');
      setGoogleValidationError(null);
  };

  const resetToEnvGoogleApiKey = () => {
      const envKey = process.env.API_KEY;
      if (envKey) {
          localStorage.removeItem(GOOGLE_API_KEY_KEY);
          setIsGoogleKeyOverridden(false);
          setGoogleApiKey(envKey);
          setGoogleApiStatus('env_configured');
          setGoogleValidationError(null);
      }
  };

  const saveOpenaiApiKey = async (key: string) => {
    if (!key) {
      setOpenaiApiStatus('idle');
      setOpenaiApiKey('');
      setOpenaiTextModels([]);
      localStorage.removeItem('openai_api_key');
      return;
    }
    console.log('🔑 [CONFIG] Validating OpenAI API key...');
    setOpenaiApiStatus('validating');
    try {
      const models = await openaiService.getTextModels(key);
      console.log('🟢 [CONFIG] OpenAI API key validation successful');
      setOpenaiApiKey(key);
      setOpenaiApiStatus('valid');
      setOpenaiTextModels(models);
      if (!models.find(m => m.id === openaiTextModel)) {
        setOpenaiTextModel(models[0]?.id || 'gpt-4o');
        localStorage.setItem('openai_text_model', models[0]?.id || 'gpt-4o');
      }
      localStorage.setItem('openai_api_key', key);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
      console.error('🔴 [CONFIG] OpenAI API key validation failed:', message);
      setOpenaiApiStatus('error');
    }
  };

  useEffect(() => {
    localStorage.setItem('use_openai_for_prompt', String(useOpenAIForPrompt));
  }, [useOpenAIForPrompt]);

  useEffect(() => {
    if (openaiTextModel) localStorage.setItem('openai_text_model', openaiTextModel);
  }, [openaiTextModel]);
  
  return {
    service,
    setService,
    imageProvider,
    setImageProvider,
    // Google
    googleApiKey,
    saveGoogleApiKey,
    googleApiStatus,
    googleValidationError,
    isEnvKeyAvailable,
    isGoogleKeyOverridden,
    unlockGoogleApiKey,
    resetToEnvGoogleApiKey,
    googleModel,
    setGoogleModel,
    googleVideoModel,
    setGoogleVideoModel,
    // dynamic lists
    googleImageModels,
    googleVideoModels,
    // OpenAI (prompt-only)
    openaiApiKey,
    saveOpenaiApiKey,
    openaiApiStatus,
    openaiTextModel,
    setOpenaiTextModel,
    openaiTextModels,
    useOpenAIForPrompt,
    setUseOpenAIForPrompt,
    // Aivideoauto
    aivideoautoToken,
    aivideoautoModel,
    setAivideoautoModel,
    aivideoautoModels,
    aivideoautoVideoModel,
    setAivideoautoVideoModel,
    aivideoautoVideoModels,
    aivideoautoStatus,
    validationError,
    saveAivideoautoToken,
  };
}