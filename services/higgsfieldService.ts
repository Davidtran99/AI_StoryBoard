/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Aspect, Character, Location, Scene, UploadedImage, VideoStyle } from '../types';
import { parseApiError } from '../lib/utils';

const HF_BASE = '';

const handleError = (error: any): string => {
  return parseApiError(error);
};

const getAuthHeaders = (apiKey: string, secret?: string) => ({
  'x-higgsfield-api-key': apiKey,
  'x-higgsfield-secret': secret || '',
  'Content-Type': 'application/json',
});

const mapHiggsfieldError = (error: any, context: string): string => {
  console.error(`[HIGGSFIELD ${context}] Error:`, error);
  
  // Parse response nếu là string JSON
  let errorObj = error;
  if (typeof error === 'string') {
    try {
      errorObj = JSON.parse(error);
    } catch {
      errorObj = { message: error };
    }
  }
  
  // Kiểm tra detail field (Higgsfield format)
  if (errorObj.detail) {
    if (errorObj.detail === 'Not enough credits') {
      return `Higgsfield (${context}): Tài khoản không đủ credits. Vui lòng nạp thêm.`;
    }
    if (errorObj.detail.includes('Unauthorized')) {
      return `Higgsfield (${context}): Lỗi xác thực. Kiểm tra API Key và Secret.`;
    }
  }
  
  // Fallback to parseApiError
  const parsed = parseApiError(errorObj);
  return `Higgsfield (${context}): ${parsed}`;
};

export interface ConnectionTestResult {
  success: boolean;
  endpoints: {
    models: { success: boolean; status?: number; error?: string };
    soulStyles: { success: boolean; status?: number; error?: string };
  };
  overallError?: string;
}

export const testConnection = async (apiKey: string, secret?: string): Promise<ConnectionTestResult> => {
  const result: ConnectionTestResult = {
    success: false,
    endpoints: {
      models: { success: false },
      soulStyles: { success: false }
    }
  };

  // Test with the working soul-styles endpoint
  try {
    console.log('🔍 [HIGGSFIELD] Testing API key with soul-styles endpoint...');
    const soulStylesResponse = await fetch('/api/higgsfield/soul-styles', { 
      method: 'GET',
      headers: getAuthHeaders(apiKey, secret) 
    });
    
    const responseText = await soulStylesResponse.text();
    console.log('🔍 [HIGGSFIELD] Soul-styles response:', {
      status: soulStylesResponse.status,
      responseLength: responseText.length,
      isJson: responseText.startsWith('[') || responseText.startsWith('{')
    });
    
    if (soulStylesResponse.ok) {
      try {
        const soulStyles = JSON.parse(responseText);
        if (Array.isArray(soulStyles) && soulStyles.length > 0) {
          result.endpoints.soulStyles.success = true;
          result.endpoints.models.success = true; // Use same success for both
          result.success = true;
          console.log(`✅ [HIGGSFIELD] API key validation successful - loaded ${soulStyles.length} soul styles`);
        } else {
          result.endpoints.soulStyles.error = 'No soul styles returned';
          result.endpoints.models.error = 'No soul styles returned';
          console.log('❌ [HIGGSFIELD] No soul styles returned');
        }
      } catch (parseError) {
        result.endpoints.soulStyles.error = 'Invalid JSON response';
        result.endpoints.models.error = 'Invalid JSON response';
        console.log('❌ [HIGGSFIELD] Invalid JSON response:', parseError);
      }
    } else {
      const errorText = responseText;
      result.endpoints.soulStyles.error = errorText;
      result.endpoints.models.error = errorText;
      console.log('❌ [HIGGSFIELD] Soul-styles endpoint failed:', soulStylesResponse.status, errorText);
    }
  } catch (e: any) {
    const errorMsg = e.message;
    result.endpoints.soulStyles.error = errorMsg;
    result.endpoints.models.error = errorMsg;
    console.log('❌ [HIGGSFIELD] Soul-styles endpoint error:', errorMsg);
  }

  // Determine overall success
  result.success = result.endpoints.models.success || result.endpoints.soulStyles.success;
  
  if (!result.success) {
    const errors = [];
    if (result.endpoints.models.error) errors.push(`Test: ${result.endpoints.models.error}`);
    if (result.endpoints.soulStyles.error) errors.push(`Test: ${result.endpoints.soulStyles.error}`);
    result.overallError = errors.join('; ');
  }

  return result;
};

export const validateApiKey = async (apiKey: string, secret?: string): Promise<void> => {
  try {
    const testResult = await testConnection(apiKey);
    if (!testResult.success) {
      throw new Error(testResult.overallError || 'API key validation failed');
    }
  } catch (e: any) {
    throw new Error(handleError(e));
  }
};

export const listAvailableModels = async (apiKey: string, secret?: string): Promise<{ imageModels: { id: string; name: string }[]; videoModels: { id: string; name: string }[] }> => {
  try {
    // Get actual soul styles from the API
    const response = await fetch('/api/higgsfield/soul-styles', {
      headers: getAuthHeaders(apiKey)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch soul styles: ${response.status} ${response.statusText}`);
    }
    
    const soulStyles = await response.json();
    
    // Convert soul styles to image models format
    const imageModels = soulStyles.map((style: any) => ({
      id: style.id,
      name: `${style.name} (${style.description || 'Soul Style'})`
    }));
    
    // Add the main Soul model
    imageModels.unshift({ id: 'soul', name: 'Soul (Text to Image)' });
    
    const videoModels = [
      { id: 'dop-turbo', name: 'DoP Turbo (Image to Video)' },
      { id: 'dop-lite', name: 'DoP Lite (Image to Video)' },
      { id: 'dop-preview', name: 'DoP Preview (Image to Video)' },
      { id: 'speak-v2', name: 'Speak v2 (Speech to Video)' }
    ];
    
    console.log(`✅ [HIGGSFIELD] Loaded ${imageModels.length} image models (including ${soulStyles.length} soul styles) and ${videoModels.length} video models`);
    return { imageModels, videoModels };
  } catch (e: any) {
    console.error('🔴 [HIGGSFIELD] Failed to load models, using defaults:', e.message);
    
    // Fallback to default models
    const imageModels = [
      { id: 'soul', name: 'Soul (Text to Image)' }
    ];
    
    const videoModels = [
      { id: 'dop-turbo', name: 'DoP Turbo (Image to Video)' },
      { id: 'dop-lite', name: 'DoP Lite (Image to Video)' },
      { id: 'dop-preview', name: 'DoP Preview (Image to Video)' },
      { id: 'speak-v2', name: 'Speak v2 (Speech to Video)' }
    ];
    
    return { imageModels, videoModels };
  }
};

export const generateImageFromPrompt = async (
  token: string,
  prompt: string,
  index: number,
  characterRefs: Character[] | undefined,
  locationRefs: Location[] | undefined,
  model: string,
  style: VideoStyle,
  aspect: Aspect,
  secret?: string,
): Promise<UploadedImage> => {
  try {
    const modelToUse = model && model.trim().length > 0 ? model : 'auto';
    const body = {
      prompt,
      model: modelToUse,
      aspect,
      refs: [
        ...(characterRefs || []).map(c => c.image?.dataUrl).filter(Boolean),
        ...(locationRefs || []).map(l => l.image?.dataUrl).filter(Boolean),
      ],
    };
    const r = await fetch('/api/higgsfield/images/generate', {
      method: 'POST',
      headers: {
        'x-higgsfield-api-key': token,
        'x-higgsfield-secret': secret || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(mapHiggsfieldError(errorText, 'Text2Image'));
    }
    const data = await r.json();
    const dataUrl: string = data?.image?.dataUrl || data?.dataUrl || '';
    if (!dataUrl) throw new Error('Không nhận được ảnh từ Higgsfield.');
    return {
      name: `scene_${index + 1}.png`,
      type: 'image/png',
      size: dataUrl.length,
      dataUrl,
    };
  } catch (e: any) {
    throw new Error(handleError(e));
  }
};

export const editImageWithPrompt = async (
  image: UploadedImage,
  prompt: string,
  apiKey: string,
  aspect: Aspect,
  referenceImages?: UploadedImage[]
): Promise<string> => {
  try {
    const body = {
      image: image.dataUrl,
      prompt,
      aspect,
      refs: (referenceImages || []).map(x => x.dataUrl),
    };
    const r = await fetch('/api/higgsfield/images/edit', {
      method: 'POST',
      headers: getAuthHeaders(apiKey),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const url: string = data?.image?.dataUrl || data?.dataUrl || '';
    if (!url) throw new Error('Không nhận được ảnh đã chỉnh sửa.');
    return url;
  } catch (e: any) {
    throw new Error(handleError(e));
  }
};

export const generateVideoForScene = async (
  scene: Scene,
  apiKey: string,
  model: string,
  onProgress: (message: string) => void
): Promise<string> => {
  try {
    const modelToUse = model && model.trim().length > 0 ? model : 'auto';
    const body = {
      prompt: scene.videoPrompt,
      model: modelToUse,
      image: scene.mainImage?.dataUrl,
      aspect: scene.aspect,
    };
    const start = Date.now();
    const r = await fetch('/api/higgsfield/videos/generate', {
      method: 'POST',
      headers: getAuthHeaders(apiKey),
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const videoId: string = data?.id || data?.videoId;
    if (!videoId) throw new Error('Không nhận được videoId.');

    const poll = async (): Promise<string> => {
      const s = await fetch(`/api/higgsfield/videos/${encodeURIComponent(videoId)}`, { headers: getAuthHeaders(apiKey) });
      if (!s.ok) throw new Error(await s.text());
      const st = await s.json();
      const status: string = (st?.status || '').toLowerCase();
      if (status.includes('done') || status.includes('success') || st?.downloadUrl) {
        const downloadUrl: string = st?.downloadUrl || st?.videoUrl || '';
        if (!downloadUrl) throw new Error('Thiếu downloadUrl.');
        const resp = await fetch(downloadUrl, { headers: getAuthHeaders(apiKey) });
        const blob = await resp.blob();
        return URL.createObjectURL(blob);
      }
      if (status.includes('error') || status.includes('fail')) {
        throw new Error(st?.message || 'Tạo video thất bại.');
      }
      const elapsed = Math.floor((Date.now() - start) / 1000);
      onProgress(st?.message || `Đang tạo video... (${elapsed}s)`);
      await new Promise(res => setTimeout(res, 8000));
      return poll();
    };

    return await poll();
  } catch (e: any) {
    throw new Error(handleError(e));
  }
};

/**
 * Generates a blueprint from an idea using Higgsfield API.
 * Note: This is a fallback implementation that creates a simple template-based blueprint
 * since Higgsfield doesn't have text generation models.
 */
export const generateBlueprintFromIdea = async (
  idea: string,
  apiKey: string,
  secret: string,
  numScenes: number,
  videoStyle: VideoStyle
): Promise<{ characters: Omit<Character, 'id' | 'image' | 'status'>[]; locations: Omit<Location, 'id' | 'image' | 'status'>[]; story_outline: string[] }> => {
  console.log('🔵 [HIGGSFIELD] Generating blueprint from idea (template-based)...', { idea, numScenes, videoStyle });
  
  try {
    // Since Higgsfield doesn't have text generation, we create a simple template-based blueprint
    const characters = [
      {
        name: "Nhân vật chính",
        description: `Nhân vật chính trong câu chuyện "${idea}". Mô tả chi tiết về ngoại hình, trang phục và tính cách phù hợp với phong cách ${videoStyle}.`
      }
    ];

    const locations = [
      {
        name: "Địa điểm chính",
        description: `Địa điểm chính của câu chuyện "${idea}". Mô tả chi tiết về môi trường, ánh sáng và không khí phù hợp với phong cách ${videoStyle}.`
      }
    ];

    const story_outline = [
      `Mở đầu: Giới thiệu câu chuyện "${idea}"`,
      `Phát triển: Các sự kiện chính diễn ra`,
      `Cao trào: Điểm nhấn quan trọng nhất`,
      `Kết thúc: Kết luận của câu chuyện`
    ];

    console.log('✅ [HIGGSFIELD] Template-based blueprint generated successfully');
    return { characters, locations, story_outline };
  } catch (error) {
    console.error('🔴 [HIGGSFIELD] Blueprint generation failed:', error);
    throw new Error(`Lỗi tạo kế hoạch chi tiết: ${parseApiError(error)}`);
  }
};

/**
 * Generates detailed scenes based on a pre-approved creative blueprint using Higgsfield API.
 * Note: This is a fallback implementation that creates template-based scenes
 * since Higgsfield doesn't have text generation models.
 */
export const generateScenesFromBlueprint = async (
  blueprint: { characters: Character[]; locations: Location[]; storyOutline: string[] },
  apiKey: string,
  secret: string,
  numScenes: number
): Promise<Partial<Scene>[]> => {
  console.log('🔵 [HIGGSFIELD] Generating scenes from blueprint (template-based)...', { 
    charactersCount: blueprint.characters.length, 
    locationsCount: blueprint.locations.length, 
    numScenes 
  });
  
  try {
    const scenes: Partial<Scene>[] = [];
    
    for (let i = 0; i < numScenes; i++) {
      const sceneNumber = i + 1;
      const outlinePoint = blueprint.storyOutline[i] || blueprint.storyOutline[blueprint.storyOutline.length - 1];
      
      const scene: Partial<Scene> = {
        title: `Cảnh ${sceneNumber}`,
        action: `Hành động chính trong ${outlinePoint}`,
        setting: `Môi trường và bối cảnh cho ${outlinePoint}`,
        cameraAngle: 'Cinematic Wide Shot',
        cuttingStyle: 'Standard Cut',
        lighting: 'Ánh sáng tự nhiên, cân bằng',
        colorPalette: 'Warm Tones',
        soundDesign: 'Âm thanh nền phù hợp với cảnh',
        emotionalTone: 'Trung tính, phù hợp với câu chuyện',
        vfx: 'Không',
        transition: 'Standard Cut',
        duration: 8,
        notes: `Cảnh ${sceneNumber} dựa trên: ${outlinePoint}. Nhân vật: ${blueprint.characters.map(c => c.name).join(', ')}. Địa điểm: ${blueprint.locations.map(l => l.name).join(', ')}.`
      };
      
      scenes.push(scene);
    }

    console.log('✅ [HIGGSFIELD] Template-based scenes generated successfully');
    return scenes;
  } catch (error) {
    console.error('🔴 [HIGGSFIELD] Scenes generation failed:', error);
    throw new Error(`Lỗi triển khai storyboard: ${parseApiError(error)}`);
  }
};

/**
 * Generates video from image using Higgsfield DoP (Depth of Perspective) API
 */
export const generateVideoFromImage = async (
  token: string,
  secret: string,
  params: {
    image_url: string;
    motion_id?: string;
    duration?: number;
    quality?: '720p' | '1080p';
    seed?: number;
  }
): Promise<{ id: string; status: string; results?: any }> => {
  try {
    console.log('🔵 [HIGGSFIELD] Generating video from image...', { params });
    
    const body = { params };
    
    const r = await fetch('/api/higgsfield/image2video/generate', {
      method: 'POST',
      headers: {
        'x-higgsfield-api-key': token,
        'x-higgsfield-secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
    
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(mapHiggsfieldError(errorText, 'Image2Video'));
    }
    
    const data = await r.json();
    console.log('✅ [HIGGSFIELD] Video generation initiated:', data);
    
    return data;
  } catch (e: any) {
    console.error('🔴 [HIGGSFIELD] Video generation failed:', e);
    throw new Error(handleError(e));
  }
};

/**
 * Generates video from speech using Higgsfield Speak v2 API
 */
export const generateSpeakVideo = async (
  token: string,
  secret: string,
  params: {
    text: string;
    voice_id?: string;
    language?: string;
    quality?: '720p' | '1080p';
    seed?: number;
  }
): Promise<{ id: string; status: string; results?: any }> => {
  try {
    console.log('🔵 [HIGGSFIELD] Generating speak video...', { params });
    
    const body = { params };
    
    const r = await fetch('/api/higgsfield/speech2video/generate', {
      method: 'POST',
      headers: {
        'x-higgsfield-api-key': token,
        'x-higgsfield-secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });
    
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(mapHiggsfieldError(errorText, 'Speak v2'));
    }
    
    const data = await r.json();
    console.log('✅ [HIGGSFIELD] Speak video generation initiated:', data);
    
    return data;
  } catch (e: any) {
    console.error('🔴 [HIGGSFIELD] Speak video generation failed:', e);
    throw new Error(handleError(e));
  }
};


