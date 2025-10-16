/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import axios from 'axios';
import type { UploadedImage, AivideoautoModel, Character, Location, Aspect, Scene } from '../types';

const API_BASE_URL = 'https://api.gommo.net/ai';

const NEGATIVE_PROMPT_NO_TEXT = "subtitles, text, words, letters, captions, watermark, signature, labels, typography, writing, logo, credits, title, branding, user interface elements, overlays";

const handleError = (error: any): string => {
  if (axios.isAxiosError(error) && error.response) {
    if (error.response.data && error.response.data.message) {
      return error.response.data.message;
    }
    return `Lỗi API: ${error.response.status} ${error.response.statusText}`;
  } else if (error instanceof Error) {
    return error.message;
  }
  return 'Lỗi kết nối hoặc một lỗi không xác định đã xảy ra.';
};

const fetchImageAsDataUrl = async (imageUrl: string): Promise<{ dataUrl: string; mimeType: string }> => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from ${imageUrl}. Status: ${response.status}`);
        }
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return { dataUrl, mimeType: blob.type };
    } catch (error) {
        console.error("Error fetching image as data URL:", error);
        throw new Error("Could not download the generated image.");
    }
};

const postToApi = async (endpoint: string, token: string, data: Record<string, any>) => {
  console.log('🌐 [AIVIDEOAUTO] Making API request...', { endpoint, hasToken: !!token });
  const payload = {
    access_token: token,
    domain: 'aivideoauto.com',
    ...data,
  };

  try {
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('🟢 [AIVIDEOAUTO] API request successful:', { endpoint, status: response.status });
    return response.data;
  } catch (error) {
    console.error('🔴 [AIVIDEOAUTO] API request failed:', { endpoint, error });
    throw new Error(handleError(error));
  }
};

export const getModels = async (token: string, type: 'image' | 'video'): Promise<AivideoautoModel[]> => {
  console.log('🌐 [AIVIDEOAUTO] Getting models...', { type });
  const data = await postToApi('/models', token, { type });
  if (data.data && Array.isArray(data.data)) {
    const models = data.data.map((model: any) => ({
      id: model.model, // Use 'model' field as the ID
      name: model.name,
    }));
    console.log('🟢 [AIVIDEOAUTO] Models retrieved successfully:', { type, count: models.length });
    return models;
  }
  console.error('🔴 [AIVIDEOAUTO] Invalid models response format');
  throw new Error('Định dạng phản hồi từ API models không hợp lệ.');
};

// Helper function to upload an image to AIVideoAuto and get its reference info
const uploadImageForReference = async (token: string, image: UploadedImage): Promise<{ id_base: string, url: string }> => {
    const payload = {
        data: image.dataUrl.split(",")[1],
        project_id: 'default',
        file_name: image.name,
        size: image.size,
    };
    const response = await postToApi('/image-upload', token, payload);
    if (response.success && response.imageInfo) {
        return { id_base: response.imageInfo.id_base, url: response.imageInfo.url };
    }
    throw new Error(response.message || 'Tải ảnh tham chiếu lên thất bại.');
};


export const generateImageFromPrompt = async (
  token: string, 
  prompt: string, 
  index: number, 
  model: string,
  characterRefs: Character[] | undefined,
  locationRefs: Location[] | undefined,
  aspect: Aspect
): Promise<UploadedImage> => {
    console.log('🌐 [AIVIDEOAUTO] Generating image from prompt...', { 
        index, 
        model, 
        aspect, 
        hasCharacterRefs: characterRefs?.length || 0, 
        hasLocationRefs: locationRefs?.length || 0 
    });
    
    const ratio = aspect.replace(':', '_');

    const payload: Record<string, any> = {
        action_type: 'create',
        model,
        prompt,
        negative_prompt: NEGATIVE_PROMPT_NO_TEXT,
        editImage: 'false',
        project_id: 'default',
        ratio,
    };

    const referenceImages: UploadedImage[] = [];
    (locationRefs || []).forEach(loc => {
        if (loc.image) {
            referenceImages.push(loc.image);
        }
    });
    (characterRefs || []).forEach(char => {
        if (char.image) {
            referenceImages.push(char.image);
        }
    });

    if (referenceImages.length > 0) {
        console.log('🌐 [AIVIDEOAUTO] Uploading reference images...', { count: referenceImages.length });
        const uploadPromises = referenceImages.map(img => uploadImageForReference(token, img));
        const uploadedSubjects = await Promise.all(uploadPromises);
        payload.subjects = uploadedSubjects.map(sub => ({ id_base: sub.id_base, url: sub.url }));
        console.log('🟢 [AIVIDEOAUTO] Reference images uploaded successfully');
    }

    console.log('🌐 [AIVIDEOAUTO] Making image generation request...');
    const response = await postToApi('/generateImage', token, payload);
    
    if (response.success && response.imageInfo && response.imageInfo.url && response.imageInfo.id_base) {
        console.log('🟢 [AIVIDEOAUTO] Image generated successfully, downloading...');
        const { dataUrl, mimeType } = await fetchImageAsDataUrl(response.imageInfo.url);
        const imageName = index === -1
            ? `ref_${response.imageInfo.id_base}.png`
            : `${String(index + 1).padStart(2, '0')}.png`;
        const image: UploadedImage = {
            name: imageName,
            type: mimeType,
            size: 0,
            dataUrl,
            aivideoautoImageInfo: {
                id_base: response.imageInfo.id_base,
                url: response.imageInfo.url,
            },
        };
        console.log('✅ [AIVIDEOAUTO] Image downloaded and processed successfully');
        return image;
    }
    console.error('🔴 [AIVIDEOAUTO] Invalid image generation response:', response);
    throw new Error(response.message || 'API không trả về dữ liệu ảnh hợp lệ.');
};

export const editImageWithPrompt = async (
  token: string, 
  image: UploadedImage, 
  prompt: string,
  model: string,
  aspect: Aspect,
  referenceImages?: UploadedImage[]
): Promise<string> => {
    const ratio = aspect.replace(':', '_');

    const payload: Record<string, any> = {
        action_type: 'create',
        model,
        prompt,
        negative_prompt: NEGATIVE_PROMPT_NO_TEXT,
        editImage: 'true',
        base64Image: image.dataUrl, // Doc requires full data URL for this field
        project_id: 'default',
        ratio,
    };

    if (referenceImages && referenceImages.length > 0) {
        const uploadPromises = referenceImages.map(img => uploadImageForReference(token, img));
        const uploadedSubjects = await Promise.all(uploadPromises);
        payload.subjects = uploadedSubjects.map(sub => ({ id_base: sub.id_base, url: sub.url }));
    }
    
    const response = await postToApi('/generateImage', token, payload);

    if (response.success && response.imageInfo && response.imageInfo.url) {
        const { dataUrl } = await fetchImageAsDataUrl(response.imageInfo.url);
        return dataUrl;
    }
    throw new Error(response.message || 'API không trả về ảnh đã chỉnh sửa hợp lệ.');
};

// Video Generation Functions
const uploadImage = async (token: string, image: UploadedImage): Promise<{ id_base: string, url: string }> => {
    const payload = {
        data: image.dataUrl.split(",")[1],
        project_id: 'default',
        file_name: image.name,
        size: image.size,
    };
    const response = await postToApi('/image-upload', token, payload);
    if (response.success && response.imageInfo) {
        return { id_base: response.imageInfo.id_base, url: response.imageInfo.url };
    }
    throw new Error(response.message || 'Tải ảnh lên thất bại.');
};

export const createVideo = async (token: string, scene: Scene, model: string): Promise<string> => {
    console.log('🌐 [AIVIDEOAUTO] Creating video...', { 
        sceneTitle: scene.title, 
        model, 
        hasImage: !!scene.mainImage 
    });
    
    const payload: Record<string, any> = {
        model,
        privacy: 'PRIVATE',
        prompt: scene.videoPrompt || 'Animate this image based on its content.',
        translate_to_en: 'true', // Assuming prompts might be in Vietnamese
    };

    if (scene.mainImage) {
        // Check if the currently selected main image has pre-existing aivideoauto info
        if (scene.mainImage.aivideoautoImageInfo) {
            console.log('🌐 [AIVIDEOAUTO] Using existing image reference');
            payload.images = [{ 
                id_base: scene.mainImage.aivideoautoImageInfo.id_base, 
                url: scene.mainImage.aivideoautoImageInfo.url 
            }];
        } else {
            // Otherwise, it's a user-uploaded image or an edited one, so we need to upload it.
            console.log('🌐 [AIVIDEOAUTO] Uploading new image for video generation');
            const uploadedImg = await uploadImage(token, scene.mainImage);
            payload.images = [{ id_base: uploadedImg.id_base, url: uploadedImg.url }];
        }
    }
    
    console.log('🌐 [AIVIDEOAUTO] Making video creation request...');
    const response = await postToApi('/create-video', token, payload);
    if (response.videoInfo && response.videoInfo.id_base) {
        console.log('🟢 [AIVIDEOAUTO] Video creation request successful:', response.videoInfo.id_base);
        return response.videoInfo.id_base;
    }
    console.error('🔴 [AIVIDEOAUTO] Video creation failed:', response);
    throw new Error(response.message || "Không thể gửi yêu cầu tạo video.");
};

export const checkVideoStatus = async (token: string, videoId: string): Promise<any> => {
    console.log('🌐 [AIVIDEOAUTO] Checking video status...', { videoId });
    const response = await postToApi('/video', token, { videoId });
    if (response.videoInfo && response.videoInfo.status) {
        // As per user feedback, status is nested in videoInfo
        console.log('🟢 [AIVIDEOAUTO] Video status retrieved:', response.videoInfo.status);
        return response.videoInfo;
    }
    if (response.status) {
        // Fallback for the previous API structure
        console.log('🟢 [AIVIDEOAUTO] Video status retrieved (fallback):', response.status);
        return response;
    }
    console.error('🔴 [AIVIDEOAUTO] Invalid video status response:', response);
    throw new Error(response.message || "Không thể kiểm tra trạng thái video: Phản hồi không hợp lệ.");
};