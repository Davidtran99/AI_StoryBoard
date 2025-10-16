/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

export type VideoStyle = 'cinematic' | 'hyper-realistic-3d' | '3d-pixar';
export type Aspect = '16:9' | '9:16';

export interface UploadedImage {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  aivideoautoImageInfo?: { id_base: string; url: string };
}

// Fix: Removed unused and outdated `Transition` type. The `Scene.transition` property is a flexible string.

export interface Annotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  type: 'note' | 'pose' | 'camera';
}

export interface Scene {
  id:string;
  mainImage: UploadedImage | null;
  imageOptions: UploadedImage[];
  sketchImage?: UploadedImage | null;
  sketchAnnotations?: Annotation[];
  title: string;
  promptName?: string;
  imageShotType?: string;
  imagePrompt: string; // For generating the still image
  videoPrompt: string; // For generating the video
  imageModel?: string;
  negativePrompt: string;
  // VEO specific fields
  action: string;
  setting: string;
  cameraAngle: string;
  cuttingStyle?: string; // How shots are edited together *within* the scene
  useAdvancedVideoSettings?: boolean; // Controls if advanced settings are used in the video prompt
  lighting: string;
  colorPalette: string;
  soundDesign: string;
  emotionalTone: string;
  vfx: string;
  // End VEO specific
  transition: string; // How the scene transitions to the *next* scene
  duration: number | null;
  aspect: Aspect;
  seed: number | null;
  strength: number | null;
  notes: string;
  characterIds?: string[];
  locationIds?: string[];
  videoUrl?: string | null;
  videoStatus?: 'idle' | 'generating' | 'done' | 'error';
  videoStatusMessage?: string;
  taskId?: string | null; // For tracking external API jobs like Aivideoauto video generation
}

export interface Character {
  id: string;
  name: string;
  description: string;
  image: UploadedImage | null;
  skinTone?: string;
  status: 'suggested' | 'defined';
}

export interface Location {
  id: string;
  name: string;
  description: string;
  image: UploadedImage | null;
  status: 'suggested' | 'defined';
}

export type ApiService = 'google' | 'openai' | 'aivideoauto';

export interface AivideoautoModel {
  id: string;
  name: string;
}

export interface ApiConfig {
  service: ApiService;
  setService: (service: ApiService) => void;
  // Image provider selection when using GPT for prompts
  imageProvider?: 'aivideoauto' | 'google';
  setImageProvider?: (provider: 'aivideoauto' | 'google') => void;
  // Google
  googleApiKey: string;
  saveGoogleApiKey: (key: string) => Promise<void>;
  googleApiStatus: 'idle' | 'validating' | 'valid' | 'error' | 'env_configured';
  googleValidationError: string | null;
  isEnvKeyAvailable: boolean;
  isGoogleKeyOverridden: boolean;
  unlockGoogleApiKey: () => void;
  resetToEnvGoogleApiKey: () => void;
  googleModel: string; // Image model
  setGoogleModel: (model: string) => void;
  googleVideoModel: string; // Video model
  setGoogleVideoModel: (model: string) => void;
  googleImageModels?: { id: string; name: string }[];
  googleVideoModels?: { id: string; name: string }[];
  // OpenAI (prompt-only)
  openaiApiKey?: string;
  saveOpenaiApiKey?: (key: string) => Promise<void>;
  openaiApiStatus?: 'idle' | 'validating' | 'valid' | 'error';
  openaiTextModel?: string;
  setOpenaiTextModel?: (model: string) => void;
  openaiTextModels?: { id: string; name: string }[];
  useOpenAIForPrompt?: boolean;
  setUseOpenAIForPrompt?: (on: boolean) => void;
  // Aivideoauto
  aivideoautoToken: string;
  saveAivideoautoToken: (token: string) => Promise<void>;
  aivideoautoModel: string; // Image model
  setAivideoautoModel: (model: string) => void;
  aivideoautoModels: AivideoautoModel[];
  aivideoautoVideoModel: string;
  setAivideoautoVideoModel: (model: string) => void;
  aivideoautoVideoModels: AivideoautoModel[];
  aivideoautoStatus: 'idle' | 'validating' | 'valid' | 'error';
  validationError: string | null;
}

export interface BatchProgress {
  total: number;
  completed: number;
  startTime: number | null;
  eta: number; // in seconds
  task: string; // e.g., 'images', 'videos'
}

export interface UseStoryboardReturn {
  // State
  scenes: Scene[];
  characters: Character[];
  locations: Location[];
  aspectRatio: Aspect;
  idea: string;
  storyOutline: string[];
  updateStoryOutline: (index: number, value: string) => void;
  videoDuration: number;
  busy: boolean;
  isGeneratingFromText: boolean;
  isGeneratingScenes: boolean;
  isBatchGenerating: boolean;
  isGeneratingReferenceImages: boolean;
  batchProgress: BatchProgress | null;

  // Scene Management
  setVideoDuration: (duration: number) => void;
  setIdea: (idea: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  addBlankScene: () => void;
  updateScene: (index: number, data: Partial<Scene>) => void;
  removeScene: (index: number) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  isSceneBusy: (id: string) => boolean;

  // Image Generation & Editing
  handleReplaceImage: (index: number) => Promise<void>;
  generateBlueprintFromIdea: (textOverride?: string) => Promise<void>;
  generateScenesFromBlueprint: () => Promise<void>;
  regenerateSceneDetails: (index: number) => Promise<void>;
  generateImageForScene: (index: number) => Promise<void>;
  generateMoreImageOptionsForScene: (index: number) => Promise<void>;
  editImageForScene: (index: number, prompt: string, referenceImages?: UploadedImage[]) => Promise<void>;
  regenerateAllImages: () => Promise<void>;
  regenerateMissingImages: () => Promise<void>;
  generateAllReferenceImages: (chars?: Character[] | React.MouseEvent, locs?: Location[]) => Promise<void>;

  // Video Generation & Bulk Download
  generateVideoForScene: (index: number) => Promise<void>;
  generateAllSceneVideos: () => Promise<void>;
  downloadAllSceneImages: () => void;
  downloadAllSceneVideos: () => void;

  // Character & Location Management
  addCharacter: () => void;
  updateCharacter: (index: number, data: Partial<Character>) => void;
  removeCharacter: (index: number) => void;
  handleCharacterImageUpload: (index: number) => void;
  generateCharacterImage: (index: number) => Promise<void>;
  editCharacterImage: (index: number, prompt: string, referenceImages?: UploadedImage[]) => Promise<void>;
  addLocation: () => void;
  updateLocation: (index: number, data: Partial<Location>) => void;
  removeLocation: (index: number) => void;
  handleLocationImageUpload: (index: number) => void;
  generateLocationImage: (index: number) => Promise<void>;
  editLocationImage: (index: number, prompt: string, referenceImages?: UploadedImage[]) => Promise<void>;

  // Sketch & Annotation Management
  updateSceneAnnotations: (index: number, annotations: Annotation[]) => void;
  generateSketchForScene: (index: number) => Promise<void>;
  generateAllSketches: () => Promise<void>;
}