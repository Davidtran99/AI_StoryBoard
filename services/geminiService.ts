/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import GenerateContentResponse and GenerateImagesResponse to correctly type API responses.
import { GoogleGenAI, Type, Modality, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import type { UploadedImage, Scene, Character, Location, VideoStyle, Aspect } from "../types";
import { cameraAngleOptions, transitionOptions, colorPaletteOptions, imageShotTypeOptions, cuttingStyleOptions } from '../constants';

// This will be used as a default negative prompt for image generation.
const NEGATIVE_PROMPT_NO_TEXT = "subtitles, text, words, letters, captions, watermark, signature, labels, typography, writing, logo, credits, title, branding, user interface elements, overlays";

// --- Retry Logic for API stability ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let attempt = 0;
  let delay = initialDelay;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('"code":503') || errorMessage.includes('UNAVAILABLE');

      if (isRetryable && attempt < maxRetries) {
        console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries}) with a retryable error. Retrying in ${delay}ms...`);
        await sleep(delay);
        attempt++;
        delay *= 2; // Exponential backoff
      } else {
        console.error(`API call failed after ${attempt} retries or with a non-retryable error.`, error);
        throw error; // Re-throw the error to be handled by the caller
      }
    }
  }
}
// --- End Retry Logic ---

const textModel = "gemini-2.5-flash";

const getStylePrefix = (style: VideoStyle): string => {
  switch (style) {
    case 'hyper-realistic-3d':
      return 'Phong cách 3D Siêu thực:';
    case '3d-pixar':
      return 'Phong cách 3D Hoạt hình Pixar:';
    case 'cinematic':
    default:
      return 'Phong cách Ảnh Điện ảnh:';
  }
};

/**
 * Validates a Google Gemini API key by making a simple test call.
 */
export const validateApiKey = async (apiKey: string): Promise<void> => {
  console.log('🔑 [GEMINI API] Validating API key...');
  const ai = new GoogleGenAI({ apiKey });
  try {
    // A very simple, low-cost call to check if the key is valid.
    console.log('🔵 [GEMINI API] Making validation request to Gemini API...');
    await ai.models.generateContent({
      model: textModel,
      contents: 'test',
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1,
      },
    });
    console.log('🟢 [GEMINI API] API key validation successful');
  } catch (error) {
    console.error("🔴 [GEMINI API] API Key validation failed:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
      throw new Error('API key không hợp lệ. Vui lòng kiểm tra lại.');
    }
    throw new Error('Không thể xác thực API key. Vui lòng kiểm tra kết nối và key.');
  }
};

/**
 * Lists available Gemini models for the provided API key and categorizes them.
 * Falls back to curated defaults if listing is unavailable.
 */
export const listAvailableModels = async (apiKey: string): Promise<{ imageModels: { id: string; name: string }[]; videoModels: { id: string; name: string }[] }> => {
  const ai = new GoogleGenAI({ apiKey });
  const defaults = {
    imageModels: [
      { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image' },
      { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Generate)' },
    ],
    videoModels: [
      { id: 'veo-2.0-generate-001', name: 'Veo 2 (8s 720p/1080p)' },
    ],
  };
  try {
    // @ts-ignore SDK may not type list() yet; use any
    const r: any = await (ai as any).models.list?.({}) || { models: [] };
    const models: any[] = r.models || r || [];
    const toPair = (id: string) => ({ id, name: id });
    const image = new Map<string, { id: string; name: string }>();
    const video = new Map<string, { id: string; name: string }>();

    (models as any[]).forEach((m: any) => {
      const id: string = m?.name || m?.id || '';
      if (!id) return;
      const lower = id.toLowerCase();
      if (lower.includes('image') || lower.includes('imagen') || lower.includes('flash-image')) {
        image.set(id, toPair(id));
      }
      if (lower.includes('veo')) {
        video.set(id, toPair(id));
      }
    });

    const imageModels = image.size > 0 ? Array.from(image.values()) : defaults.imageModels;
    const videoModels = video.size > 0 ? Array.from(video.values()) : defaults.videoModels;
    return { imageModels, videoModels };
  } catch (e) {
    console.warn('⚠️ [GEMINI API] List models not available, using defaults.', e);
    return defaults;
  }
};


/**
 * Generates scene details (prompt, duration, etc.) for a given image.
 */
export const generateSceneDetailsForImage = async (image: UploadedImage, apiKey: string): Promise<Partial<Scene>> => {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const imagePart = {
      inlineData: {
        data: image.dataUrl.split(",")[1], // remove the "data:image/jpeg;base64," part
        mimeType: image.type,
      },
    };
    const textPart = {
      text: `You are a professional cinematographer analyzing a single frame to break it down for a storyboard. Your task is to extract key details from the provided image. Be descriptive, objective, and focus only on what is visually present in the image. Do not invent details that are not in the frame.

      Fill out the following parameters in a JSON object, providing a detailed description for each field based *only* on the visual content. All descriptions and text values in the JSON output MUST be in Vietnamese.`,
    };
    
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: textModel,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'A short, simple title for the scene.' },
            action: { type: Type.STRING, description: 'The primary action happening in the scene.' },
            setting: { type: Type.STRING, description: 'A detailed description of the setting, time of day, and environment.' },
            cameraAngle: { type: Type.STRING, enum: cameraAngleOptions.map(o => o.value), description: 'The most fitting camera angle from the provided list.' },
            lighting: { type: Type.STRING, description: 'A description of the lighting in the scene.' },
            colorPalette: { type: Type.STRING, enum: colorPaletteOptions.map(o => o.value), description: 'The most fitting color palette from the provided list.' },
            soundDesign: { type: Type.STRING, description: 'Suggested background sounds, sound effects, or music.' },
            emotionalTone: { type: Type.STRING, description: 'The dominant emotional tone of the scene.' },
            vfx: { type: Type.STRING, description: 'Any visual effects needed, or "None".' },
            transition: { type: Type.STRING, enum: transitionOptions.map(o => o.value), description: 'The most fitting transition to the next scene.' },
            duration: { type: Type.INTEGER, description: 'Duration in seconds (e.g., 8).' },
            notes: { type: Type.STRING, description: "Brief director's notes (e.g., sound effects, mood)." },
          },
          required: ['title', 'action', 'setting', 'cameraAngle', 'lighting', 'colorPalette', 'soundDesign', 'emotionalTone', 'vfx', 'transition', 'duration', 'notes'],
        },
      },
    }));

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    return result as Partial<Scene>;

  } catch (error) {
    console.error("Error generating scene details for image:", error);
    return { notes: "Lỗi: Không thể tạo chi tiết cho ảnh này." };
  }
};

/**
 * Edits an image using a text prompt with the nano-banana model.
 * @param image The original image.
 * @param prompt The editing instruction.
 * @param referenceImages Optional array of images for style/content reference.
 * @returns A promise that resolves to the new image's data URL.
 */
export const editImageWithPrompt = async (
  image: UploadedImage, 
  prompt: string,
  apiKey: string,
  aspect: Aspect,
  referenceImages?: UploadedImage[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey });
  try {
    const parts: any[] = [];

    // The base image to be edited
    parts.push({
      inlineData: {
        data: image.dataUrl.split(",")[1],
        mimeType: image.type,
      },
    });

    // Optional reference images
    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach(refImg => {
        parts.push({
          inlineData: {
            data: refImg.dataUrl.split(",")[1],
            mimeType: refImg.type,
          },
        });
      });
    }
    
    // The text prompt with instructions
    const instructionBase = (referenceImages && referenceImages.length > 0)
      ? `Edit the first image based on the following instructions. Use the subsequent image(s) as a style or content reference where applicable. Instructions: ${prompt}`
      : prompt;
      
    const instruction = `${instructionBase}. IMPORTANT: Strictly adhere to a ${aspect} aspect ratio for the final image. Do not change the dimensions or crop the image. Do not add any text, subtitles, or words to the image.`;

    parts.push({ text: instruction });


    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    }));

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Yêu cầu bị chặn vì lý do: ${response.promptFeedback.blockReason}.`);
    }

    if (!response.candidates || response.candidates.length === 0) {
      const textResponse = response.text?.trim();
      if (textResponse) {
          throw new Error(`API không trả về ảnh. Phản hồi: "${textResponse}"`);
      }
      throw new Error("API không trả về kết quả.");
    }

    const candidate = response.candidates[0];

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      const textResponse = response.text?.trim();
      if (textResponse) {
        throw new Error(`Tạo ảnh thất bại (${candidate.finishReason}). Phản hồi: "${textResponse}"`);
      }
      throw new Error(`Tạo ảnh thất bại. Lý do: ${candidate.finishReason}.`);
    }

    const imagePartResponse = candidate.content?.parts?.find(part => part.inlineData);

    if (imagePartResponse?.inlineData) {
      const newBase64Data = imagePartResponse.inlineData.data;
      return `data:${imagePartResponse.inlineData.mimeType};base64,${newBase64Data}`;
    }
    
    const textResponse = response.text?.trim();
    if (textResponse) {
      throw new Error(`API chỉ trả về văn bản, không có ảnh: "${textResponse}"`);
    }

    throw new Error("API không trả về ảnh đã chỉnh sửa.");

  } catch (error) {
    console.error("Error editing image:", error);
    if (error instanceof Error) {
      // Re-throw the specific error message.
      throw error;
    }
    throw new Error("Lỗi không xác định khi chỉnh sửa ảnh.");
  }
};

/**
 * Asks the AI to suggest three creative and relevant shot types for a scene.
 */
export const suggestShotTypesForScene = async (scenePrompt: string, apiKey: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const shotOptions = imageShotTypeOptions.map(o => o.value).join(', ');

  const instruction = `You are an expert cinematographer. Based on the following scene description, choose the THREE most compelling, diverse, and story-driven camera shot types from the provided list. Your choices should enhance the narrative and emotional impact of the scene. Do not choose simple shots like "Cinematic Wide Shot" or "Cinematic Medium Shot" unless they are absolutely essential. Prioritize creative and dynamic angles.

  Scene Description: "${scenePrompt}"

  Available Shot Types: [${shotOptions}]

  Respond with ONLY a JSON array containing exactly three strings from the list above. Example: ["High-angle Shot", "Point of View (POV) Shot", "Dutch Angle Shot"]`;

  try {
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: textModel,
      contents: instruction,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    }));

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    
    if (Array.isArray(result) && result.length === 3 && result.every(item => typeof item === 'string')) {
      return result;
    }
    
    console.warn("Failed to get 3 valid shot types, falling back to default.", result);
    return ["Cinematic Wide Shot", "Cinematic Medium Shot", "Cinematic Close-up Shot"];

  } catch (error) {
    console.error("Error suggesting shot types:", error);
    return ["Cinematic Wide Shot", "Cinematic Medium Shot", "Cinematic Close-up Shot"];
  }
};

/**
 * Generates a "blueprint" from an idea, including characters, locations, and a story outline.
 */
export const generateBlueprintFromIdea = async (
  idea: string,
  apiKey: string,
  numScenes: number,
  videoStyle: VideoStyle
): Promise<{ characters: Omit<Character, 'id' | 'image' | 'status'>[], locations: Omit<Location, 'id' | 'image' | 'status'>[], story_outline: string[] }> => {
  console.log('🔵 [GEMINI API] Generating blueprint from idea...', { idea, numScenes, videoStyle });
  const ai = new GoogleGenAI({ apiKey });
  const styleDescription = "Mô tả phong cách ảnh"; // Placeholder as full description is in the prompt
  const systemPrompt = `You are a creative director specializing in the visual style of **${videoStyle}**. Your task is to analyze a video idea and break it down into its core creative components, ensuring all descriptions align with this specific aesthetic.

  **Core Idea:** "${idea}"
  **Approximate number of scenes desired:** ${numScenes}
  **Target Visual Style:** ${videoStyle}

  **Instructions:**
  1.  **Identify Main Characters:** List the key characters. For each, provide a name and a detailed visual description. The description MUST be rich and evocative, tailored specifically to the **${videoStyle}** style, making it ready for an AI image generator.
  2.  **Identify Main Locations:** List the key settings or locations. For each, provide a name and a detailed visual description, also crafted to perfectly match the **${videoStyle}** aesthetic.
  3.  **Create a Story Outline:** Write a brief, high-level story outline with 3-5 key plot points that cover the beginning, middle, and end of the story.
  4.  **Copyright Consideration:** If the idea mentions specific copyrighted characters (e.g., Batman, Elsa from Frozen), do NOT use their names or exact likenesses. Instead, create new, original characters that are heavily *inspired* by them. Give them a new name and describe their appearance in a way that captures the essence and style of the original, but is legally distinct. For example, for "Batman", you might create a character named "Hiệp sĩ Bóng đêm" and describe his dark, high-tech suit and brooding demeanor.
  5.  **Language:** All output content (names, descriptions, outline points) MUST be in Vietnamese.

  **Output Format:** Respond with a single JSON object with the keys "characters", "locations", and "story_outline".`;

  try {
    console.log('🔵 [GEMINI API] Making request to generate blueprint...');
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: textModel,
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name', 'description'],
              },
            },
            locations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name', 'description'],
              },
            },
            story_outline: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['characters', 'locations', 'story_outline'],
        },
      },
    }));

    console.log('🟢 [GEMINI API] Blueprint generated successfully');
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    console.log('🟢 [GEMINI API] Blueprint parsed successfully:', { 
      charactersCount: result.characters?.length || 0, 
      locationsCount: result.locations?.length || 0, 
      outlinePoints: result.story_outline?.length || 0 
    });
    return result;
  } catch(error) {
    console.error("🔴 [GEMINI API] Blueprint generation failed:", error);
    throw new Error(`Lỗi tạo kế hoạch chi tiết: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generates detailed scenes based on a pre-approved creative blueprint.
 */
export const generateScenesFromBlueprint = async (
  blueprint: { characters: Character[], locations: Location[], storyOutline: string[] }, 
  apiKey: string, 
  numScenes: number
): Promise<Partial<Scene>[]> => {
  console.log('🔵 [GEMINI API] Generating scenes from blueprint...', { 
    charactersCount: blueprint.characters.length, 
    locationsCount: blueprint.locations.length, 
    numScenes 
  });
  const ai = new GoogleGenAI({ apiKey });

  const characterDescriptions = blueprint.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
  const locationDescriptions = blueprint.locations.map(l => `- ${l.name}: ${l.description}`).join('\n');

  const systemPrompt = `You are an expert cinematic storyteller. Your task is to generate a detailed storyboard based on a pre-approved creative blueprint.

  **CREATIVE BLUEPRINT:**
  **Characters (Use these EXACTLY):**
  ${characterDescriptions}

  **Locations (Use these EXACTLY):**
  ${locationDescriptions}

  **Story Outline:**
  ${blueprint.storyOutline.map(p => `- ${p}`).join('\n')}

  **RULES:**
  1.  **Total Scenes:** Generate exactly ${numScenes} scenes.
  2.  **Consistency:** The scenes must ONLY use the characters and locations provided in the blueprint. Assign the correct characters and location to each scene.
  3.  **Visual Storytelling:** Create scenes with dynamic composition and diverse camera angles. Describe what is visually happening.
  4.  **Scene Duration:** Each scene must have a "duration" field set to 8.
  5.  **Cutting Style:** For each scene, choose the most appropriate 'cuttingStyle' from the provided list to describe how shots are edited *within* the 8-second clip.
  6.  **Output Format:** Respond with a JSON array of scene objects. For each scene, include which characters are present ('characterNames') and the primary location ('locationNames').
  7.  **Language:** All text-based field values (title, action, setting, lighting, soundDesign, emotionalTone, notes, etc.) MUST be in Vietnamese.`;

  try {
    console.log('🔵 [GEMINI API] Making request to generate scenes...');
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: textModel,
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              action: { type: Type.STRING },
              setting: { type: Type.STRING },
              cameraAngle: { type: Type.STRING, enum: cameraAngleOptions.map(o => o.value) },
              cuttingStyle: { type: Type.STRING, enum: cuttingStyleOptions.map(o => o.value), description: 'The editing cut style used within the scene.' },
              lighting: { type: Type.STRING },
              colorPalette: { type: Type.STRING, enum: colorPaletteOptions.map(o => o.value) },
              soundDesign: { type: Type.STRING },
              emotionalTone: { type: Type.STRING },
              vfx: { type: Type.STRING },
              transition: { type: Type.STRING, enum: transitionOptions.map(o => o.value) },
              duration: { type: Type.INTEGER },
              notes: { type: Type.STRING },
              characterNames: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of characters present in this scene." },
              locationNames: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of locations for this scene." },
            },
            required: ['title', 'action', 'setting', 'cameraAngle', 'cuttingStyle', 'lighting', 'colorPalette', 'soundDesign', 'emotionalTone', 'vfx', 'transition', 'duration', 'notes', 'characterNames', 'locationNames'],
          },
        },
      },
    }));
    console.log('🟢 [GEMINI API] Scenes generated successfully');
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    const scenes = Array.isArray(result) ? result : [];
    console.log('🟢 [GEMINI API] Scenes parsed successfully:', { scenesCount: scenes.length });
    return scenes;
  } catch(error) {
    console.error("🔴 [GEMINI API] Scenes generation failed:", error);
    throw new Error(`Lỗi triển khai storyboard: ${error instanceof Error ? error.message : String(error)}`);
  }
};


/**
 * Generates a character reference image from a description using the selected model.
 */
export const generateCharacterReferenceImage = async (
  description: string, 
  style: VideoStyle, 
  aspect: Aspect,
  model: string,
  apiKey: string
): Promise<UploadedImage> => {
  const corePrompt = `Full-body reference shot of a single character on a plain background. Only one character should be in the image. The character must be fully visible from head to toe. Character description: "${description}". IMPORTANT: The image must not contain any text, subtitles, or words.`;
  const image = await generateImageFromPrompt(corePrompt, 0, undefined, undefined, model, style, aspect, apiKey);
  image.name = `character_ref.png`;
  return image;
};

/**
 * Generates a location reference image from a description using the selected model.
 */
export const generateLocationReferenceImage = async (
  description: string,
  style: VideoStyle,
  aspect: Aspect,
  model: string,
  apiKey: string
): Promise<UploadedImage> => {
    const corePrompt = `CRITICAL INSTRUCTION: Create a wide, establishing shot of a location. The image's primary focus MUST be the environment. Absolutely no main characters or prominent figures should be visible. The scene should feel like an empty set, ready for characters to enter. Location description: "${description}". IMPORTANT: The image must not contain any text, subtitles, or words.`;
    const image = await generateImageFromPrompt(corePrompt, 0, undefined, undefined, model, style, aspect, apiKey);
    image.name = `location_ref.png`;
    return image;
};

/**
 * Generates an image from a text prompt, optionally with character and location references.
 */
export const generateImageFromPrompt = async (
  prompt: string, 
  index: number, 
  characterRefs: Character[] | undefined, 
  locationRefs: Location[] | undefined,
  model: string,
  style: VideoStyle,
  aspect: Aspect,
  apiKey: string
): Promise<UploadedImage> => {
  console.log('🖼️ [GEMINI API] Generating image from prompt...', { 
    index, 
    model, 
    style, 
    aspect, 
    hasCharacterRefs: characterRefs?.length || 0, 
    hasLocationRefs: locationRefs?.length || 0 
  });
  const ai = new GoogleGenAI({ apiKey });
  const stylePrefix = getStylePrefix(style);
  try {
    const hasReferences = (characterRefs && characterRefs.length > 0) || (locationRefs && locationRefs.length > 0);
    
    if (hasReferences || model === 'gemini-2.5-flash-image') {
      console.log('🔵 [GEMINI API] Using gemini-2.5-flash-image model for image generation');
      const parts: any[] = [];
      let instruction = prompt;

      // Prepend a clear, direct instruction if references are being used.
      if (hasReferences) {
          const characterNames = (characterRefs || []).map(c => c.name).filter(Boolean).join(', ');
          const locationNames = (locationRefs || []).map(l => l.name).filter(Boolean).join(', ');

          let referencePreamble = "CRITICAL INSTRUCTION: Generate an image based on the prompt below, using the attached reference images with the following rules:\n";
          if (characterNames) {
            referencePreamble += `- For characters (${characterNames}): Adhere STRICTLY to their appearance, clothing, and details from their reference image.\n`;
          }
          if (locationNames) {
            referencePreamble += `- For locations (${locationNames}): Recreate the artistic STYLE, atmosphere, and key elements from the reference image, but compose a NEW camera angle or viewpoint that fits the scene's action. Do NOT just copy the reference shot.\n`;
          }
          referencePreamble += `\nPROMPT: `;
          
          instruction = referencePreamble + prompt;
      }
      
      const fullPrompt = `${stylePrefix} ${instruction}. IMPORTANT: Strictly adhere to a ${aspect} aspect ratio. Do not output a square image. Do not include any form of text, subtitles, or words in the generated image.`;
      
      parts.push({ text: fullPrompt });

      (locationRefs || []).forEach(loc => {
        if (loc.image) {
          parts.push({ inlineData: { data: loc.image.dataUrl.split(",")[1], mimeType: loc.image.type } });
        }
      });

      (characterRefs || []).forEach(char => {
        if (char.image) {
          parts.push({ inlineData: { data: char.image.dataUrl.split(",")[1], mimeType: char.image.type } });
        }
      });

      console.log('🔵 [GEMINI API] Making request to generate image with references...');
      const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
          config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      }));

      console.log('🟢 [GEMINI API] Image generation response received');

      // --- Detailed Error Handling Block ---
      if (response.promptFeedback?.blockReason) {
        console.error('🔴 [GEMINI API] Request blocked:', response.promptFeedback.blockReason);
        throw new Error(`Yêu cầu bị chặn vì lý do: ${response.promptFeedback.blockReason}.`);
      }
      if (!response.candidates || response.candidates.length === 0) {
          const textResponse = response.text?.trim();
          console.error('🔴 [GEMINI API] No candidates in response:', textResponse);
          if (textResponse) throw new Error(`API không trả về ảnh. Phản hồi: "${textResponse}"`);
          throw new Error("API không trả về kết quả.");
      }
      const candidate = response.candidates[0];
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          const textResponse = response.text?.trim();
          console.error('🔴 [GEMINI API] Generation failed with reason:', candidate.finishReason, textResponse);
          if (textResponse) throw new Error(`Tạo ảnh thất bại (${candidate.finishReason}). Phản hồi: "${textResponse}"`);
          throw new Error(`Tạo ảnh thất bại. Lý do: ${candidate.finishReason}.`);
      }
      const imagePartResponse = candidate.content?.parts?.find(part => part.inlineData);
      if (imagePartResponse?.inlineData) {
          const { data, mimeType } = imagePartResponse.inlineData;
          console.log('🟢 [GEMINI API] Image generated successfully with references');
          return { name: `${String(index + 1).padStart(2, '0')}.png`, type: mimeType, size: 0, dataUrl: `data:${mimeType};base64,${data}` };
      }
      const textResponse = response.text?.trim();
      console.error('🔴 [GEMINI API] No image data in response:', textResponse);
      if (textResponse) throw new Error(`API chỉ trả về văn bản, không có ảnh: "${textResponse}"`);
      throw new Error("Không thể trích xuất ảnh từ phản hồi của API.");
      // --- End Detailed Error Handling Block ---
    }

  // Default to Imagen model for text-only generation (with auto-fallback)
  console.log('🔵 [GEMINI API] Using Imagen model for text-only generation');
    const finalPromptForImagen = `${stylePrefix} ${prompt}. A cinematic photograph with an aspect ratio of ${aspect}.`;
    const promptWithNegative = `${finalPromptForImagen}. Do not include: ${NEGATIVE_PROMPT_NO_TEXT}.`;
    console.log('🔵 [GEMINI API] Making request to Imagen model...');
    let response: GenerateImagesResponse;
    try {
      response = await withRetry(() => ai.models.generateImages({
        model: model, // Typically 'imagen-4.0-generate-001'
        prompt: promptWithNegative,
        config: { 
          numberOfImages: 1, 
          outputMimeType: 'image/jpeg',
          aspectRatio: aspect,
        },
      }));
    } catch (err) {
      const msg = String(err);
      // Auto-fallback when Imagen requires billing
      if (msg.includes('Imagen API is only accessible to billed users')) {
        console.warn('🔁 [GEMINI API] Imagen requires billing. Falling back to gemini-2.5-flash-image');
        const parts: any[] = [{ text: `${stylePrefix} ${prompt}. IMPORTANT: Strictly adhere to a ${aspect} aspect ratio. Do not include any text.` }];
        const fallback: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
          config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        }));
        const imagePart = fallback.candidates?.[0]?.content?.parts?.find(p => (p as any).inlineData) as any;
        if (imagePart?.inlineData) {
          const { data, mimeType } = imagePart.inlineData;
          return { name: `${String(index + 1).padStart(2, '0')}.png`, type: mimeType, size: 0, dataUrl: `data:${mimeType};base64,${data}` };
        }
      }
      throw err;
    }

    console.log('🟢 [GEMINI API] Imagen response received');

    if (!response.generatedImages?.[0]?.image?.imageBytes) {
      console.error('🔴 [GEMINI API] No image data in Imagen response');
      throw new Error("API response did not contain image data.");
    }
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    console.log('🟢 [GEMINI API] Image generated successfully with Imagen');
    return { name: `${String(index + 1).padStart(2, '0')}.jpeg`, type: 'image/jpeg', size: 0, dataUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
  } catch (error) {
    console.error("🔴 [GEMINI API] Error generating image from prompt:", error);
    throw new Error(`Lỗi tạo ảnh: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generates a simple sketch image for a scene.
 */
export const generateSketchForImage = async (
  scene: Scene,
  index: number,
  style: VideoStyle,
  aspect: Aspect,
  apiKey: string,
): Promise<UploadedImage> => {
  const ai = new GoogleGenAI({ apiKey });
  const stylePrefix = getStylePrefix(style);
  const prompt = `Create a very simple, minimalist, black and white line drawing sketch that visually represents the following scene description. The style should be like a quick storyboard sketch, focusing on composition and character placement, not detail. Scene: "${scene.action}, ${scene.setting}". Style hint: ${stylePrefix}.`;

  try {
    const response: GenerateImagesResponse = await withRetry(() => ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: aspect,
      },
    }));

    if (!response.generatedImages?.[0]?.image?.imageBytes) {
      throw new Error("API response did not contain image data for sketch.");
    }
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return { name: `sketch_${String(index + 1).padStart(2, '0')}.png`, type: 'image/png', size: 0, dataUrl: `data:image/png;base64,${base64ImageBytes}` };
  } catch (error) {
    console.error("Error generating sketch image:", error);
    throw new Error(`Lỗi tạo phác thảo: ${error instanceof Error ? error.message : String(error)}`);
  }
};