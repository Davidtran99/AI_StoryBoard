/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import `React` to resolve the 'Cannot find namespace React' error for `React.ChangeEvent`.
import React, { useState, useCallback, useReducer, useEffect } from 'react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import type {
  UseStoryboardReturn, Scene, UploadedImage, Character, Location,
  ApiConfig, VideoStyle, Aspect, Annotation, BatchProgress
} from '../types';
import * as gemini from '../services/geminiService';
import * as aivideoauto from '../services/aivideoautoService';
import * as higgsfield from '../services/higgsfieldService';
import * as veoService from '../services/veoService';
import * as openaiService from '../services/openaiService';
import { readFilesAsDataUrls, compressImage } from '../lib/fileHelper';
import { uid, formatDuration, parseApiError } from '../lib/utils';
import { cameraAngleOptions, transitionOptions, imageShotTypeOptions, cuttingStyleOptions } from '../constants';

const POLLING_INTERVAL_MS = 5000;

const getVideoStyleInstruction = (style: VideoStyle): string => {
  switch (style) {
    case 'hyper-realistic-3d':
      return 'Hyper-Realistic 3D Render, Photorealistic CGI, Cinematic Quality, High Poly Count. Using render engines like V-Ray, Octane Render, or Unreal Engine 5. Materials show extreme micro-details: realistic skin with Subsurface Scattering (SSS), visible pores, and peach fuzz; detailed fabric weaves; metals with anisotropic reflections and micro-scratches. Lighting uses Accurate Global Illumination (GI) and Ray Tracing. Camera has an extremely shallow depth of field (like f/1.4) with creamy bokeh. 8K, Ultra HD, maximum render quality.';
    case '3d-pixar':
      return 'Pixar animation style, vibrant colors, expressive characters, detailed textures, soft lighting, cinematic composition. Focus on storytelling through character emotion and beautifully rendered environments. 3D rendered, high quality, family-friendly aesthetic.';
    case 'cinematic':
    default:
      return 'Cinematic shot, dramatic lighting, shallow depth of field, film grain, moody color grade, intentional and smooth camera movement.';
  }
};

const getImageStylePrefix = (style: VideoStyle): string => {
  switch (style) {
    case 'hyper-realistic-3d':
      return 'Phong cách 3D Siêu thực: Kết xuất 3D siêu thực, CGI chân thực như ảnh chụp, V-Ray, Octane Render, Unreal Engine 5, da siêu thực với Tán xạ dưới bề mặt (SSS), lỗ chân lông rõ ràng, vải dệt chi tiết, Ray Tracing, Độ sâu trường ảnh cực nông, bokeh mịn, 8K, Ultra HD.';
    case '3d-pixar':
      return 'Phong cách 3D Hoạt hình Pixar: kết xuất 3D, màu sắc rực rỡ và bão hòa, nhân vật biểu cảm và hấp dẫn với các đặc điểm phóng đại, họa tiết chi tiết nhưng sạch sẽ, ánh sáng dịu và ấm áp, bố cục điện ảnh, tập trung kể chuyện.';
    case 'cinematic':
    default:
      return 'Phong cách Điện ảnh: bức ảnh điện ảnh, ánh sáng kịch tính, hạt phim, màu sắc được chỉnh sửa chuyên nghiệp, không khí trầm lắng, độ sâu trường ảnh nông.';
  }
};

interface UseStoryboardProps {
  autoGeneratePrompt: boolean;
  apiConfig: ApiConfig;
  onError: (message: string) => void;
  videoStyle: VideoStyle;
  aspectRatio: Aspect;
}

// Reducer to manage complex busy states for individual items and global flags
const initialBusyState = {
  global: new Set<string>(), // For batch operations like 'isBatchGenerating'
  scenes: new Set<string>(),
  characters: new Set<string>(),
  locations: new Set<string>(),
};

type BusyAction =
  | { type: 'SET_BUSY'; entity: 'scenes' | 'characters' | 'locations'; id: string }
  | { type: 'CLEAR_BUSY'; entity: 'scenes' | 'characters' | 'locations'; id: string }
  | { type: 'SET_GLOBAL_BUSY'; key: string }
  | { type: 'CLEAR_GLOBAL_BUSY'; key: string };

function busyReducer(state: typeof initialBusyState, action: BusyAction) {
  const { type } = action;
  switch (type) {
    case 'SET_BUSY': {
      const { entity, id } = action;
      const newSet = new Set(state[entity]);
      newSet.add(id);
      return { ...state, [entity]: newSet };
    }
    case 'CLEAR_BUSY': {
      const { entity, id } = action;
      const newSet = new Set(state[entity]);
      newSet.delete(id);
      return { ...state, [entity]: newSet };
    }
    case 'SET_GLOBAL_BUSY': {
      const { key } = action;
      const newSet = new Set(state.global);
      newSet.add(key);
      return { ...state, global: newSet };
    }
    case 'CLEAR_GLOBAL_BUSY': {
      const { key } = action;
      const newSet = new Set(state.global);
      newSet.delete(key);
      return { ...state, global: newSet };
    }
    default:
      return state;
  }
}

const getDynamicCameraMovement = (scene: Scene): string => {
  const angle = scene.cameraAngle;
  const tone = scene.emotionalTone?.toLowerCase() || '';

  let speed = 'một cách mượt mà';
  let intensity = '';

  if (['urgent', 'chaotic', 'action', 'dramatic', 'intense', 'khẩn cấp', 'hỗn loạn', 'hành động', 'kịch tính', 'dữ dội'].some(t => tone.includes(t))) {
    speed = 'một cách nhanh chóng';
    intensity = 'kịch tính';
  }
  if (['sad', 'romantic', 'calm', 'serene', 'somber', 'gentle', 'buồn', 'lãng mạn', 'yên bình', 'thanh thản', 'ảm đạm', 'nhẹ nhàng'].some(t => tone.includes(t))) {
    speed = 'một cách chậm rãi và duyên dáng';
    intensity = 'tinh tế';
  }

  switch (angle) {
    case "Bullet Time": return `một cú máy ${intensity} quay 360 độ quanh chủ thể theo hiệu ứng 'bullet time', ghi lại một khoảnh khắc quan trọng.`;
    case "Crane Overhead": return `bắt đầu từ một cú máy trên cao, máy quay ${speed} hạ xuống, tiết lộ chi tiết của cảnh từ trên cao.`;
    case "Crane Down": return `máy quay bắt đầu từ trên cao và ${speed} hạ xuống, tạo cảm giác về quy mô hoặc tiết lộ một chủ thể bên dưới.`;
    case "Crane Up": return `máy quay bắt đầu từ thấp và ${speed} nâng lên, nâng cao góc nhìn để lộ ra môi trường rộng lớn hơn hoặc tạo cảm giác khát vọng.`;
    case "Crash Zoom In": return `một cú zoom cực nhanh ${speed} từ góc rộng thẳng vào một chi tiết cụ thể, tạo cảm giác sốc hoặc nhận ra điều gì đó.`;
    case "Crash Zoom Out": return `máy quay ${speed} thực hiện một cú zoom cực nhanh ra ngoài, kéo từ cận cảnh ra góc rộng để tiết lộ bối cảnh lớn hơn.`;
    case "Dolly In": return `một cú máy trung cảnh ${speed} tiến vào phía chủ thể, tăng cường sự tập trung và thân mật.`;
    case "Dolly Out": return `máy quay ${speed} lùi ra xa, tạo khoảng cách với chủ thể hoặc tiết lộ môi trường xung quanh.`;
    case "Dolly Left": return `máy quay di chuyển ngang sang trái, song song với hành động, tiết lộ các yếu tố mới hoặc theo chuyển động của nhân vật.`;
    case "Dolly Right": return `máy quay di chuyển ngang sang phải, song song với hành động, giữ chủ thể trong khung hình trong khi hậu cảnh thay đổi.`;
    case "Orbit Left": return `một cú máy ${intensity} ${speed} quay sang trái quanh chủ thể, tạo ra một góc nhìn năng động và ba chiều.`;
    case "Orbit Right": return `một cú máy ${intensity} ${speed} quay sang phải quanh chủ thể, thêm chiều sâu và tập trung sự chú ý.`;
    case "Robo Arm": return `một cánh tay robot thực hiện một chuyển động máy quay phức tạp và chính xác, có thể bắt đầu rộng, tiến vào, rồi quay quanh, tất cả trong một chuyển động mượt mà, độc đáo.`;
    case "Tilt Up": return `từ một vị trí cố định, máy quay ${speed} nghiêng lên trên, quét từ điểm thấp hơn đến điểm cao hơn, thường để tiết lộ một cái gì đó cao.`;
    case "Tilt Down": return `từ một vị trí cố định, máy quay ${speed} nghiêng xuống dưới, chuyển góc nhìn từ điểm cao hơn xuống điểm thấp hơn.`;
    case "Super Dolly In": return `một cú super dolly dài, liên tục ${speed} di chuyển qua môi trường, đi sâu vào cảnh về phía một tiêu điểm ở xa.`;
    case "Super Dolly Out": return `một cú super dolly dài ra ngoài, kéo lùi rất xa khỏi chủ thể để nhấn mạnh sự cô lập hoặc sự rộng lớn của bối cảnh.`;
    case "Handheld": return `một cú máy quay tay, sử dụng các chuyển động ${intensity} và tự nhiên để theo dõi hành động, tạo cảm giác chân thực và tức thì.`;
    case "Lens Crack": return `một cú máy được đóng khung như thể qua một ống kính bị nứt, và vết nứt trở nên tồi tệ hơn trong suốt cảnh quay.`;
    case "Medium Zoom In": return `một cú zoom ${intensity} ${speed} từ góc rộng hơn vào góc trung cảnh, thắt chặt sự tập trung vào chủ thể.`;
    case "Eyes In": return `một cú máy bắt đầu bằng cận cảnh và ${speed} tiến vào cực tả đôi mắt của nhân vật, tiết lộ cảm xúc của họ.`;
    case "Flood": return `máy quay đứng yên hoặc lia chậm khi mực nước dâng lên, tạo cảm giác về một thảm họa sắp xảy ra hoặc một sự thay đổi yên bình.`;
    case "Exploration": return `máy quay di chuyển như thể từ góc nhìn của nhân vật (POV), khám phá một môi trường mới hoặc bí ẩn với cảm giác khám phá.`;
    case "Disintegration": return `chủ thể hoặc toàn bộ cảnh bắt đầu tan rã thành các hạt, với máy quay giữ ổn định để ghi lại hiệu ứng.`;
    default: return `một cú máy điện ảnh ghi lại cảnh, có thể với chuyển động ${intensity} và ${speed} để phù hợp với tông màu.`;
  }
};

const getRandomItems = <T>(arr: T[], num: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
};


// The main hook
export default function useStoryboard({
  autoGeneratePrompt,
  apiConfig,
  onError,
  videoStyle,
  aspectRatio,
}: UseStoryboardProps): UseStoryboardReturn {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [idea, setIdea] = useState<string>('');
  const [lyrics, setLyrics] = useState<string>('');
  const [visualNotes, setVisualNotes] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(40);
  const [storyOutline, setStoryOutline] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const [busyState, dispatchBusy] = useReducer(busyReducer, initialBusyState);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  
  // Sync scene models with global settings
  useEffect(() => {
    const globalModel = apiConfig.service === 'google' ? apiConfig.googleModel : apiConfig.aivideoautoModel;
    if (globalModel) {
      setScenes(prevScenes =>
        prevScenes.map(scene => ({
          ...scene,
          imageModel: globalModel,
        }))
      );
    }
  }, [apiConfig.service, apiConfig.googleModel, apiConfig.aivideoautoModel, setScenes]);


  // --- Helper Functions ---
  const withBusyState = useCallback(async <T>(entity: 'scenes' | 'characters' | 'locations', id: string, fn: () => Promise<T>): Promise<T | void> => {
    dispatchBusy({ type: 'SET_BUSY', entity, id });
    try {
      return await fn();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      dispatchBusy({ type: 'CLEAR_BUSY', entity, id });
    }
  }, [onError]);

  const withGlobalBusyState = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T | void> => {
    dispatchBusy({ type: 'SET_GLOBAL_BUSY', key });
    try {
      return await fn();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      dispatchBusy({ type: 'CLEAR_GLOBAL_BUSY', key });
    }
  }, [onError]);

  const withBatchProgress = useCallback(async <T>(
    key: string,
    taskLabel: string,
    items: T[],
    operation: (item: T) => Promise<any>
  ) => {
    const total = items.length;
    if (total === 0) return;

    dispatchBusy({ type: 'SET_GLOBAL_BUSY', key });
    const startTime = Date.now();
    setBatchProgress({ total, completed: 0, startTime, eta: 0, task: taskLabel });
    let completedCount = 0;

    const progressUpdater = () => {
      completedCount++;
      const elapsedTime = (Date.now() - startTime) / 1000;
      const avgTime = elapsedTime / completedCount;
      const remaining = total - completedCount;
      const eta = Math.round(remaining * avgTime);
      setBatchProgress(prev => prev ? { ...prev, completed: completedCount, eta } : null);
    };
    
    try {
      // Run promises in parallel
      const promises = items.map(async (item) => {
        try {
            await operation(item);
        } catch (opError) {
            console.error(`Error in batch operation for item:`, item, opError);
            // Don't rethrow, to allow other operations to complete
        } finally {
            progressUpdater();
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error(`Batch operation failed for task: ${taskLabel}`, error);
      onError(`Đã xảy ra lỗi trong quá trình xử lý hàng loạt ${taskLabel}.`);
    } finally {
      dispatchBusy({ type: 'CLEAR_GLOBAL_BUSY', key });
      setBatchProgress(null);
    }
  }, [onError]);
  
  const generateVideoPromptForScene = useCallback((scene: Scene, allCharacters: Character[], allLocations: Location[]): string => {
      const sceneChars = (scene.characterIds || [])
          .map(id => allCharacters.find(c => c.id === id))
          .filter((c): c is Character => !!c);
      const sceneLocs = (scene.locationIds || [])
          .map(id => allLocations.find(l => l.id === id))
          .filter((l): l is Location => !!l);
  
      // 1. Core Subject and Action
      const characterDetails = sceneChars.length > 0 ? `với sự tham gia của ${sceneChars.map(c => c.name).join(' và ')}` : '';
      const locationDetails = `trong bối cảnh ${sceneLocs.length > 0 ? sceneLocs.map(l => l.name).join(' và ') : scene.setting}`;
      const coreAction = `${scene.action || 'Một cảnh diễn ra'}${characterDetails ? ` ${characterDetails}` : ''}${locationDetails ? ` ${locationDetails}` : ''}.`;
      
      // 5. Stylistic and Atmospheric Details
      const styleParts: string[] = [];
      if (scene.lighting) styleParts.push(`ánh sáng ${scene.lighting}`);
      if (scene.emotionalTone) styleParts.push(`tông màu cảm xúc là ${scene.emotionalTone}`);
      if (scene.colorPalette) styleParts.push(`sử dụng bảng màu ${scene.colorPalette}`);
      if (scene.vfx && scene.vfx !== 'None') styleParts.push(`với hiệu ứng hình ảnh ${scene.vfx}`);
      const atmosphericDetails = styleParts.length > 0 ? `Không khí được xác định bởi: ${styleParts.join(', ')}.` : '';

      // If advanced settings are disabled, return a simpler prompt
      if (scene.useAdvancedVideoSettings === false) {
        const simplePrompt = [
            coreAction,
            atmosphericDetails,
            `Tạo một video điện ảnh 8 giây cho cảnh này.`,
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        return simplePrompt;
      }
      
      // 2. Generate sub-shots
      let shotDescriptions: string[] = [];
      if (scene.cameraAngle && scene.cameraAngle !== 'None') {
          const numShots = Math.random() > 0.4 ? 3 : 2;
          const availableAngles = cameraAngleOptions.filter(o => o.value !== 'None');
          const selectedAngles = getRandomItems(availableAngles, numShots);
          shotDescriptions = selectedAngles.map(angle => {
              const shotScene = { ...scene, cameraAngle: angle.value };
              return getDynamicCameraMovement(shotScene);
          });
      }

      // 3. Build the internal cutting sequence description based on the chosen style
      let cuttingSequence = '';
      const cuttingStyle = scene.cuttingStyle || 'Hard Cut';
      
      // If no camera movement is specified, the cutting style doesn't make much sense, so we simplify.
      if (shotDescriptions.length === 0) {
          cuttingSequence = 'Video tập trung ghi lại hành động chính một cách rõ ràng.';
      } else {
          switch (cuttingStyle) {
              case 'Cutting on Action':
                  cuttingSequence = `Video bắt đầu bằng ${shotDescriptions[0]}. Ngay tại đỉnh điểm của hành động chính, cảnh cắt một cách mượt mà sang ${shotDescriptions[1]} để theo dõi diễn biến.`;
                  break;
              case 'Jump Cut':
                  cuttingSequence = `Video sử dụng kỹ thuật cắt nhảy để thể hiện thời gian trôi qua. Cảnh bắt đầu bằng ${shotDescriptions[0]}, sau đó đột ngột "nhảy" tới một khoảnh khắc sau đó được thể hiện qua ${shotDescriptions[1]}.`;
                  break;
              case 'Match Cut':
                  cuttingSequence = `Video sử dụng một cú cắt đồng nhất (match cut) đầy nghệ thuật. Nó bắt đầu với ${shotDescriptions[0]}, trong đó một hình ảnh hoặc hành động cụ thể được làm nổi bật, sau đó cắt sang ${shotDescriptions[1]}, nơi một hình ảnh hoặc hành động tương tự trong một bối cảnh khác được hiển thị, tạo ra một sự liên kết ý nghĩa.`;
                  break;
              case 'Cross Cut':
                  cuttingSequence = `Video sử dụng kỹ thuật cắt chéo, chuyển đổi qua lại giữa hai góc nhìn hoặc hành động song song: ${shotDescriptions[0]} và ${shotDescriptions[1]}, nhằm xây dựng sự căng thẳng hoặc so sánh.`;
                  break;
              case 'Cutaway':
                  cuttingSequence = `Cảnh chính được thể hiện qua ${shotDescriptions[0]}. Giữa chừng, có một cú cắt chèn (cutaway) sang một chi tiết cận cảnh quan trọng (ví dụ: một vật thể trên bàn, một biểu cảm trên khuôn mặt phụ), trước khi quay trở lại cảnh chính, có thể từ một góc máy hơi khác như ${shotDescriptions[1]}.`;
                  break;
              case 'Smash Cut':
                  cuttingSequence = `Video sử dụng một cú cắt đột ngột (smash cut) để tạo sự tương phản mạnh. Cảnh chuyển từ một khoảnh khắc yên tĩnh (được gợi ý bởi ${shotDescriptions[0]}) sang một cảnh hỗn loạn hoặc đầy kịch tính (${shotDescriptions[1]}) một cách đột ngột.`;
                  break;
              case 'None':
                  cuttingSequence = `Video được quay với các cú máy ${shotDescriptions.join(' và ')}, tập trung vào việc truyền tải câu chuyện một cách tự nhiên.`;
                  break;
              case 'Hard Cut':
              default:
                  cuttingSequence = `Video được dựng bằng các cú cắt thẳng, rõ ràng. Bắt đầu với ${shotDescriptions[0]}, sau đó chuyển trực tiếp sang ${shotDescriptions[1]}.`;
                  break;
          }
      }

      // 4. Describe the end-of-scene transition
      const endTransition = scene.transition;
      let endTransitionDescription = '';
      if (endTransition && endTransition !== 'None') {
          const transitionLabel = transitionOptions.find(o => o.value === endTransition)?.label.split('–')[1]?.trim().toLowerCase() || `một hiệu ứng ${endTransition.toLowerCase()}`;
          endTransitionDescription = `Video dài 8 giây này kết thúc bằng ${transitionLabel} để chuyển sang cảnh tiếp theo.`;
      }

      // 6. Combine into a coherent paragraph
      const finalPrompt = [coreAction, cuttingSequence, atmosphericDetails, endTransitionDescription]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

      return finalPrompt;
  }, []);

  const generateImagePromptForScene = useCallback((scene: Scene, allCharacters: Character[], allLocations: Location[]): string => {
    const sceneChars = (scene.characterIds || [])
        .map(id => allCharacters.find(c => c.id === id))
        .filter((c): c is Character => !!c);
    const sceneLocs = (scene.locationIds || [])
        .map(id => allLocations.find(l => l.id === id))
        .filter((l): l is Location => !!l);

    const parts: string[] = [];

    // T: Technical & Style (NOW AT THE TOP)
    const stylePrefix = getImageStylePrefix(videoStyle);
    parts.push(stylePrefix);

    // S: Shot Type
    if (scene.imageShotType) {
        const shotTypeLabel = imageShotTypeOptions.find(o => o.value === scene.imageShotType)?.label || scene.imageShotType;
        parts.push(shotTypeLabel);
    }

    // A: Action & Subject
    const actionAndSubjectParts: string[] = [];
    if (scene.action) {
        actionAndSubjectParts.push(scene.action);
    }
    if (sceneChars.length > 0) {
        const characterNames = sceneChars.map(c => c.name).join(', ');
        actionAndSubjectParts.push(characterNames);
    }
    if (actionAndSubjectParts.length > 0) {
        parts.push(actionAndSubjectParts.join(', '));
    }

    // M: Mood
    if (scene.emotionalTone) {
        parts.push(scene.emotionalTone);
    }

    // L: Location & Lighting
    const locationAndLightingParts: string[] = [];
    const locationNames = sceneLocs.length > 0 ? sceneLocs.map(l => l.name).join(' and ') : scene.setting;
    if (locationNames) {
        locationAndLightingParts.push(locationNames);
    }
    if (scene.lighting) {
        locationAndLightingParts.push(`ánh sáng ${scene.lighting}`);
    }
    if(locationAndLightingParts.length > 0){
        parts.push(locationAndLightingParts.join(', '));
    }
    
    // C: Color
    if (scene.colorPalette) {
        parts.push(`bảng màu ${scene.colorPalette}`);
    }

    // VFX is now separate from style
    if (scene.vfx && scene.vfx !== 'None') {
        parts.push(`hiệu ứng hình ảnh ${scene.vfx}`);
    }

    // Final prompt, ensuring no empty parts are joined with extra commas
    return parts.filter(p => p && p.trim()).join(', ');
  }, [videoStyle]);


  const updateScene = useCallback((index: number, data: Partial<Scene>) => {
    setScenes(prevScenes => {
      const newScenes = [...prevScenes];
      const oldScene = newScenes[index];
      const updatedScene = { ...oldScene, ...data };

      const promptRelevantChange = Object.keys(data).some(key =>
        ['action', 'setting', 'lighting', 'colorPalette', 'emotionalTone', 'vfx', 'notes', 'characterIds', 'locationIds', 'title', 'imageShotType'].includes(key)
      );

      const videoPromptRelevantChange = Object.keys(data).some(key =>
        [...Object.keys(updatedScene)].includes(key)
      );

      // Check if any service is ready before auto-generating prompts
      const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
      const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
      const hasAnyService = openaiReady || googleReady || higgsfieldReady;

      // Only auto-generate prompts if autoGeneratePrompt is enabled AND at least one service is ready
      if (autoGeneratePrompt && hasAnyService && promptRelevantChange && !data.hasOwnProperty('imagePrompt')) {
        updatedScene.imagePrompt = generateImagePromptForScene(updatedScene, characters, locations);
      }
      
      if (autoGeneratePrompt && hasAnyService && videoPromptRelevantChange && !data.hasOwnProperty('videoPrompt')) {
        updatedScene.videoPrompt = generateVideoPromptForScene(updatedScene, characters, locations);
      }

      newScenes[index] = updatedScene;
      return newScenes;
    });
  }, [generateImagePromptForScene, generateVideoPromptForScene, characters, locations, autoGeneratePrompt, apiConfig]);

  const updateCharacter = useCallback((index: number, data: Partial<Character>) => {
    setCharacters(prev => {
      const newChars = [...prev];
      newChars[index] = { ...newChars[index], ...data };
      return newChars;
    });
  }, []);

  const updateLocation = useCallback((index: number, data: Partial<Location>) => {
    setLocations(prev => {
      const newLocs = [...prev];
      newLocs[index] = { ...newLocs[index], ...data };
      return newLocs;
    });
  }, []);

  const updateStoryOutline = useCallback((index: number, value: string) => {
    setStoryOutline(prev => {
      const newOutline = [...prev];
      if (index >= 0 && index < newOutline.length) {
        newOutline[index] = value;
      }
      return newOutline;
    });
  }, []);

  // This section is moved before its usage in `handleGenerateFromText` to avoid declaration errors.
  // It is also refactored to operate on objects (with stable IDs) instead of array indices
  // to prevent errors caused by stale state closures when called immediately after a state update.
  const generateCharacterImageByObject = useCallback(async (char: Character) => {
    if (!char.description) return;
    await withBusyState('characters', char.id, async () => {
        let image: UploadedImage;
        const stylePrefix = getImageStylePrefix(videoStyle);
        
        // Check which services are available
        const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
        const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
        const aivideoReady = apiConfig.aivideoautoStatus === 'valid' && !!apiConfig.aivideoautoToken;
        
        const tryGoogle = async () => {
          if (!googleReady) throw new Error('GOOGLE_NOT_READY');
          return await gemini.generateCharacterReferenceImage(char.description, videoStyle, aspectRatio, apiConfig.googleModel, apiConfig.googleApiKey);
        };
        
        const tryHiggsfield = async () => {
          if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
          const prompt = `${stylePrefix}, full-body reference shot of a character on a plain background. The character must be fully visible. Description: "${char.description}".`;
          return await higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey, prompt, -1, undefined, undefined, apiConfig.higgsfieldImageModel, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
        };
        
        const tryAivideo = async () => {
          if (!aivideoReady) throw new Error('AIVIDEO_NOT_READY');
          const prompt = `${stylePrefix}, full-body reference shot of a character on a plain background. The character must be fully visible. Description: "${char.description}".`;
          return await aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, prompt, -1, apiConfig.aivideoautoModel, undefined, undefined, aspectRatio);
        };
        
        // Try primary service first, then fallback to others if available
        console.log(`🖼️ [CHARACTER IMAGE] Service selection: ${apiConfig.service}, Google ready: ${googleReady}, Google status: ${apiConfig.googleApiStatus}, Google key exists: ${!!apiConfig.googleApiKey}, Higgsfield ready: ${higgsfieldReady}, Aivideo ready: ${aivideoReady}`);
        try {
          if (apiConfig.service === 'google') {
            console.log('🖼️ [CHARACTER IMAGE] Using Google as primary service');
            image = await tryGoogle();
          } else if (apiConfig.service === 'higgsfield') {
            console.log('🖼️ [CHARACTER IMAGE] Using Higgsfield as primary service');
            image = await tryHiggsfield();
          } else {
            console.log('🖼️ [CHARACTER IMAGE] Using Aivideoauto as primary service');
            image = await tryAivideo();
          }
        } catch (primaryError) {
          console.warn(`Primary service (${apiConfig.service}) failed, trying fallback...`, primaryError);
          
          // Try fallback services
          if (apiConfig.service !== 'google' && googleReady) {
            console.log('🖼️ [CHARACTER IMAGE] Trying Google as fallback');
            try { image = await tryGoogle(); } catch {}
          }
          if (!image && apiConfig.service !== 'higgsfield' && higgsfieldReady) {
            console.log('🖼️ [CHARACTER IMAGE] Trying Higgsfield as fallback');
            try { image = await tryHiggsfield(); } catch {}
          }
          if (!image && apiConfig.service !== 'aivideoauto' && aivideoReady) {
            console.log('🖼️ [CHARACTER IMAGE] Trying Aivideoauto as fallback');
            try { image = await tryAivideo(); } catch {}
          }
          
          if (!image) throw primaryError;
        }
        
        const compressedImage = await compressImage(image);
        setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, image: compressedImage, status: 'defined' } : c));
    });
  }, [apiConfig, videoStyle, aspectRatio, withBusyState]);

  const generateLocationImageByObject = useCallback(async (loc: Location) => {
    if (!loc.description) return;
    await withBusyState('locations', loc.id, async () => {
        let image: UploadedImage;
        const stylePrefix = getImageStylePrefix(videoStyle);
        
        // Check which services are available
        const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
        const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
        const aivideoReady = apiConfig.aivideoautoStatus === 'valid' && !!apiConfig.aivideoautoToken;
        
        const tryGoogle = async () => {
          if (!googleReady) throw new Error('GOOGLE_NOT_READY');
          return await gemini.generateLocationReferenceImage(loc.description, videoStyle, aspectRatio, apiConfig.googleModel, apiConfig.googleApiKey);
        };
        
        const tryHiggsfield = async () => {
          if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
          const prompt = `${stylePrefix}, wide establishing shot of a location, focusing only on the environment. CRITICAL: Absolutely no characters or people should be visible in the image. Description: "${loc.description}".`;
          return await higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey, prompt, -1, undefined, undefined, apiConfig.higgsfieldImageModel, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
        };
        
        const tryAivideo = async () => {
          if (!aivideoReady) throw new Error('AIVIDEO_NOT_READY');
          const prompt = `${stylePrefix}, wide establishing shot of a location, focusing only on the environment. CRITICAL: Absolutely no characters or people should be visible in the image. Description: "${loc.description}".`;
          return await aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, prompt, -1, apiConfig.aivideoautoModel, undefined, undefined, aspectRatio);
        };
        
        // Try primary service first, then fallback to others if available
        console.log(`🖼️ [LOCATION IMAGE] Service selection: ${apiConfig.service}, Google ready: ${googleReady}, Higgsfield ready: ${higgsfieldReady}, Aivideo ready: ${aivideoReady}`);
        try {
          if (apiConfig.service === 'google') {
            console.log('🖼️ [LOCATION IMAGE] Using Google as primary service');
            image = await tryGoogle();
          } else if (apiConfig.service === 'higgsfield') {
            console.log('🖼️ [LOCATION IMAGE] Using Higgsfield as primary service');
            image = await tryHiggsfield();
          } else {
            console.log('🖼️ [LOCATION IMAGE] Using Aivideoauto as primary service');
            image = await tryAivideo();
          }
        } catch (primaryError) {
          console.warn(`Primary service (${apiConfig.service}) failed, trying fallback...`, primaryError);
          
          // Try fallback services
          if (apiConfig.service !== 'google' && googleReady) {
            console.log('🖼️ [LOCATION IMAGE] Trying Google as fallback');
            try { image = await tryGoogle(); } catch {}
          }
          if (!image && apiConfig.service !== 'higgsfield' && higgsfieldReady) {
            console.log('🖼️ [LOCATION IMAGE] Trying Higgsfield as fallback');
            try { image = await tryHiggsfield(); } catch {}
          }
          if (!image && apiConfig.service !== 'aivideoauto' && aivideoReady) {
            console.log('🖼️ [LOCATION IMAGE] Trying Aivideoauto as fallback');
            try { image = await tryAivideo(); } catch {}
          }
          
          if (!image) throw primaryError;
        }
        
        const compressedImage = await compressImage(image);
        setLocations(prev => prev.map(l => l.id === loc.id ? { ...l, image: compressedImage, status: 'defined' } : l));
    });
  }, [apiConfig, videoStyle, aspectRatio, withBusyState]);
  
  const generateCharacterImage = useCallback(async (index: number) => {
    const char = characters[index];
    if (!char || !char.description) return;
    await withBusyState('characters', char.id, async () => {
      let image: UploadedImage;
      const stylePrefix = getImageStylePrefix(videoStyle);
      
      // Check which services are available
      const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
      const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
      const aivideoReady = apiConfig.aivideoautoStatus === 'valid' && !!apiConfig.aivideoautoToken;
      
      const tryGoogle = async () => {
        if (!googleReady) throw new Error('GOOGLE_NOT_READY');
        return await gemini.generateCharacterReferenceImage(char.description, videoStyle, aspectRatio, apiConfig.googleModel, apiConfig.googleApiKey);
      };
      
      const tryHiggsfield = async () => {
        if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
        const prompt = `${stylePrefix}, full-body reference shot of a character on a plain background. The character must be fully visible. Description: "${char.description}".`;
        return await higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey, prompt, index, undefined, undefined, apiConfig.higgsfieldImageModel, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
      };
      
      const tryAivideo = async () => {
        if (!aivideoReady) throw new Error('AIVIDEO_NOT_READY');
        const prompt = `${stylePrefix}, full-body reference shot of a character on a plain background. The character must be fully visible. Description: "${char.description}".`;
        return await aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, prompt, index, apiConfig.aivideoautoModel, undefined, undefined, aspectRatio);
      };
      
      // Try primary service first, then fallback to others if available
      try {
        if (apiConfig.service === 'google') image = await tryGoogle();
        else if (apiConfig.service === 'higgsfield') image = await tryHiggsfield();
        else image = await tryAivideo();
      } catch (primaryError) {
        console.warn(`Primary service (${apiConfig.service}) failed, trying fallback...`, primaryError);
        
        // Try fallback services
        if (apiConfig.service !== 'google' && googleReady) {
          try { image = await tryGoogle(); } catch {}
        }
        if (!image && apiConfig.service !== 'higgsfield' && higgsfieldReady) {
          try { image = await tryHiggsfield(); } catch {}
        }
        if (!image && apiConfig.service !== 'aivideoauto' && aivideoReady) {
          try { image = await tryAivideo(); } catch {}
        }
        
        if (!image) throw primaryError;
      }
      
      const compressedImage = await compressImage(image);
      updateCharacter(index, { image: compressedImage, status: 'defined' });
    });
  }, [characters, apiConfig, videoStyle, aspectRatio, updateCharacter, withBusyState]);

  const generateLocationImage = useCallback(async (index: number) => {
    const loc = locations[index];
    if (!loc || !loc.description) return;
    await withBusyState('locations', loc.id, async () => {
       let image: UploadedImage;
       const stylePrefix = getImageStylePrefix(videoStyle);
       
       // Check which services are available
       const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
       const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
       const aivideoReady = apiConfig.aivideoautoStatus === 'valid' && !!apiConfig.aivideoautoToken;
       
       const tryGoogle = async () => {
         if (!googleReady) throw new Error('GOOGLE_NOT_READY');
         return await gemini.generateLocationReferenceImage(loc.description, videoStyle, aspectRatio, apiConfig.googleModel, apiConfig.googleApiKey);
       };
       
       const tryHiggsfield = async () => {
         if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
         const prompt = `${stylePrefix}, wide establishing shot of a location, focusing only on the environment. CRITICAL: Absolutely no characters or people should be visible in the image. Description: "${loc.description}".`;
         return await higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey, prompt, index, undefined, undefined, apiConfig.higgsfieldImageModel, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
       };
       
       const tryAivideo = async () => {
         if (!aivideoReady) throw new Error('AIVIDEO_NOT_READY');
         const prompt = `${stylePrefix}, wide establishing shot of a location, focusing only on the environment. CRITICAL: Absolutely no characters or people should be visible in the image. Description: "${loc.description}".`;
         return await aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, prompt, index, apiConfig.aivideoautoModel, undefined, undefined, aspectRatio);
       };
       
       // Try primary service first, then fallback to others if available
       try {
         if (apiConfig.service === 'google') image = await tryGoogle();
         else if (apiConfig.service === 'higgsfield') image = await tryHiggsfield();
         else image = await tryAivideo();
       } catch (primaryError) {
         console.warn(`Primary service (${apiConfig.service}) failed, trying fallback...`, primaryError);
         
         // Try fallback services
         if (apiConfig.service !== 'google' && googleReady) {
           try { image = await tryGoogle(); } catch {}
         }
         if (!image && apiConfig.service !== 'higgsfield' && higgsfieldReady) {
           try { image = await tryHiggsfield(); } catch {}
         }
         if (!image && apiConfig.service !== 'aivideoauto' && aivideoReady) {
           try { image = await tryAivideo(); } catch {}
         }
         
         if (!image) throw primaryError;
       }
       
       const compressedImage = await compressImage(image);
       updateLocation(index, { image: compressedImage, status: 'defined' });
    });
  }, [locations, apiConfig, videoStyle, aspectRatio, updateLocation, withBusyState]);

  const generateAllReferenceImages = useCallback(async (
    charsToProcess?: Character[] | React.MouseEvent,
    locsToProcess?: Location[]
  ) => {
    // Check if the first argument is an array. If not (e.g., it's a React MouseEvent from an onClick handler),
    // fall back to using the component's state. This prevents the "finalChars.map is not a function" error.
    const finalChars = Array.isArray(charsToProcess) ? charsToProcess : characters;
    const finalLocs = Array.isArray(locsToProcess) ? locsToProcess : locations;
  
    const charItems = finalChars.filter(char => !char.image && char.description);
    const locItems = finalLocs.filter(loc => !loc.image && loc.description);
  
    const allItems = [
        ...charItems.map(item => ({ type: 'character' as const, item })),
        ...locItems.map(item => ({ type: 'location' as const, item }))
    ];
    
    const operation = (batchItem: { type: 'character' | 'location'; item: Character | Location; }) => {
        if (batchItem.type === 'character') {
            return generateCharacterImageByObject(batchItem.item as Character);
        } else {
            return generateLocationImageByObject(batchItem.item as Location);
        }
    };
  
    await withBatchProgress('isGeneratingReferenceImages', 'ảnh tham chiếu', allItems, operation);
  }, [characters, locations, generateCharacterImageByObject, generateLocationImageByObject, withBatchProgress]);


  const notify = (message: string) => {
    // Minimal toast: use alert as a non-invasive fallback if no toast system is present
    try {
      // @ts-ignore
      if (window?.toast) { window.toast(message); return; }
    } catch {}
    console.log('[TOAST]', message);
  };

  const generateBlueprintFromIdea = useCallback(async (textOverride?: string) => {
    const textToUse = textOverride ?? idea;
    if (!textToUse.trim()) return;

    console.log('📝 [STORYBOARD] User clicked "Tạo kế hoạch chi tiết"');
    console.log('📝 [STORYBOARD] Params:', { 
      idea: textToUse.substring(0, 100) + '...', 
      videoDuration, 
      videoStyle 
    });

    await withGlobalBusyState('isGeneratingFromText', async () => {
      // Reset previous storyboard state before creating a new one
      setScenes([]);
      setCharacters([]);
      setLocations([]);
      setStoryOutline([]);

      const numScenes = Math.max(1, Math.ceil(videoDuration / 8));
      
      let blueprint;
      const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
      const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;

      const preferOpenAI = apiConfig.service === 'openai';
      const preferHiggsfield = apiConfig.service === 'higgsfield';

      const tryOpenAI = async () => {
        if (!openaiReady) throw new Error('OPENAI_NOT_READY');
        console.log('📝 [STORYBOARD] Using OpenAI for blueprint generation...');
        return await openaiService.generateBlueprintFromIdea(textToUse, apiConfig.openaiApiKey!, numScenes, videoStyle);
      };
      const tryGemini = async () => {
        if (!googleReady) throw new Error('GEMINI_NOT_READY');
        console.log('📝 [STORYBOARD] Using Gemini for blueprint generation...');
        return await gemini.generateBlueprintFromIdea(textToUse, apiConfig.googleApiKey, numScenes, videoStyle);
      };
      const tryHiggsfield = async () => {
        if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
        console.log('📝 [STORYBOARD] Using Higgsfield for blueprint generation...');
        return await higgsfield.generateBlueprintFromIdea(textToUse, apiConfig.higgsfieldApiKey!, apiConfig.higgsfieldSecret || '', numScenes, videoStyle);
      };

      const isKeyError = (e: any) => {
        const msg = (e && (e.message || e.toString())) as string;
        return /API_KEY_INVALID|Invalid API key|401|403/i.test(msg || '');
      };

      try {
        // Primary provider based on service selection
        if (preferOpenAI) {
          blueprint = await tryOpenAI();
        } else if (preferHiggsfield) {
          blueprint = await tryHiggsfield();
        } else {
          blueprint = await tryGemini();
        }
      } catch (e) {
        console.warn('🔁 [STORYBOARD] Primary provider failed, evaluating fallback...', e);
        
        // Fallback chain: try other available providers
        const fallbackProviders = [];
        
        if (preferOpenAI) {
          if (googleReady) fallbackProviders.push({ name: 'Gemini', fn: tryGemini });
          if (higgsfieldReady) fallbackProviders.push({ name: 'Higgsfield', fn: tryHiggsfield });
        } else if (preferHiggsfield) {
          if (openaiReady) fallbackProviders.push({ name: 'OpenAI', fn: tryOpenAI });
          if (googleReady) fallbackProviders.push({ name: 'Gemini', fn: tryGemini });
        } else {
          if (openaiReady) fallbackProviders.push({ name: 'OpenAI', fn: tryOpenAI });
          if (higgsfieldReady) fallbackProviders.push({ name: 'Higgsfield', fn: tryHiggsfield });
        }
        
        // Try fallback providers
        let fallbackSuccess = false;
        for (const provider of fallbackProviders) {
          try {
            notify(`Đã tự động chuyển sang ${provider.name} do provider chính lỗi.`);
            blueprint = await provider.fn();
            fallbackSuccess = true;
            break;
          } catch (fallbackError) {
            console.warn(`🔁 [STORYBOARD] Fallback to ${provider.name} also failed:`, fallbackError);
          }
        }
        
        if (!fallbackSuccess) {
          throw new Error(parseApiError(e));
        }
      }
      
      const newChars: Character[] = blueprint.characters.map(c => ({
        id: uid(),
        name: c.name,
        description: c.description,
        image: null,
        status: 'suggested',
      }));

      const newLocs: Location[] = blueprint.locations.map(l => ({
        id: uid(),
        name: l.name,
        description: l.description,
        image: null,
        status: 'suggested',
      }));

      setCharacters(newChars);
      setLocations(newLocs);
      setStoryOutline(blueprint.story_outline);
      
      console.log('📝 [STORYBOARD] Auto-generating reference images...');
      // Auto-generate reference images
      generateAllReferenceImages(newChars, newLocs);
    });
  }, [idea, videoDuration, withGlobalBusyState, apiConfig, generateAllReferenceImages, videoStyle]);

  const generateScenesFromBlueprint = useCallback(async () => {
    if (characters.length === 0 && locations.length === 0) return;

    await withGlobalBusyState('isGeneratingScenes', async () => {
        const numScenes = Math.max(1, Math.ceil(videoDuration / 8));
        const blueprint = { characters, locations, storyOutline };
        
        let sceneData;

        const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
        const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
        const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
        const preferOpenAI = apiConfig.service === 'openai';
        const preferHiggsfield = apiConfig.service === 'higgsfield';

        const tryOpenAI = async () => {
          if (!openaiReady) throw new Error('OPENAI_NOT_READY');
          console.log('📝 [STORYBOARD] Using OpenAI for scene generation...');
          return await openaiService.generateScenesFromBlueprint(blueprint, apiConfig.openaiApiKey!, numScenes);
        };
        const tryGemini = async () => {
          if (!googleReady) throw new Error('GEMINI_NOT_READY');
          console.log('📝 [STORYBOARD] Using Gemini for scene generation...');
          return await gemini.generateScenesFromBlueprint(blueprint, apiConfig.googleApiKey, numScenes);
        };
        const tryHiggsfield = async () => {
          if (!higgsfieldReady) throw new Error('HIGGSFIELD_NOT_READY');
          console.log('📝 [STORYBOARD] Using Higgsfield for scene generation...');
          return await higgsfield.generateScenesFromBlueprint(blueprint, apiConfig.higgsfieldApiKey!, apiConfig.higgsfieldSecret || '', numScenes);
        };
        const isKeyError = (e: any) => {
          const msg = (e && (e.message || e.toString())) as string;
          return /API_KEY_INVALID|Invalid API key|401|403/i.test(msg || '');
        };

        try {
          // Primary provider based on service selection
          if (preferOpenAI) {
            sceneData = await tryOpenAI();
          } else if (preferHiggsfield) {
            sceneData = await tryHiggsfield();
          } else {
            sceneData = await tryGemini();
          }
        } catch (e) {
          console.warn('🔁 [STORYBOARD] Primary provider failed (scenes), evaluating fallback...', e);
          
          // Fallback chain: try other available providers
          const fallbackProviders = [];
          
          if (preferOpenAI) {
            if (googleReady) fallbackProviders.push({ name: 'Gemini', fn: tryGemini });
            if (higgsfieldReady) fallbackProviders.push({ name: 'Higgsfield', fn: tryHiggsfield });
          } else if (preferHiggsfield) {
            if (openaiReady) fallbackProviders.push({ name: 'OpenAI', fn: tryOpenAI });
            if (googleReady) fallbackProviders.push({ name: 'Gemini', fn: tryGemini });
          } else {
            if (openaiReady) fallbackProviders.push({ name: 'OpenAI', fn: tryOpenAI });
            if (higgsfieldReady) fallbackProviders.push({ name: 'Higgsfield', fn: tryHiggsfield });
          }
          
          // Try fallback providers
          let fallbackSuccess = false;
          for (const provider of fallbackProviders) {
            try {
              notify(`Đã tự động chuyển sang ${provider.name} (scenes) do provider chính lỗi.`);
              sceneData = await provider.fn();
              fallbackSuccess = true;
              break;
            } catch (fallbackError) {
              console.warn(`🔁 [STORYBOARD] Fallback to ${provider.name} (scenes) also failed:`, fallbackError);
            }
          }
          
          if (!fallbackSuccess) {
            throw new Error(parseApiError(e));
          }
        }

        const defaultModel = apiConfig.service === 'google' ? apiConfig.googleModel : apiConfig.aivideoautoModel;
        
        const newScenes: Scene[] = sceneData.map((data: any, index) => {
            // Robustly find matching characters and locations from the API response.
            // This handles cases where the AI returns a single string like "Character A and Character B"
            // instead of a clean array ["Character A", "Character B"].
            const sceneChars = characters.filter(c => {
                const allApiCharNames = (data.characterNames || []).join(' ').toLowerCase();
                return c.name && allApiCharNames.includes(c.name.toLowerCase());
            });

            const sceneLocs = locations.filter(l => {
                const allApiLocNames = (data.locationNames || []).join(' ').toLowerCase();
                return l.name && allApiLocNames.includes(l.name.toLowerCase());
            });

            const baseScene: Scene = {
                id: uid(),
                mainImage: null, imageOptions: [], title: `Cảnh ${index + 1}`,
                imageShotType: imageShotTypeOptions[0].value, imagePrompt: '', videoPrompt: '',
                negativePrompt: '', action: '', setting: '', cameraAngle: cameraAngleOptions[0].value,
                lighting: '', colorPalette: '', soundDesign: '', emotionalTone: '', vfx: 'None',
                cuttingStyle: 'Hard Cut',
                useAdvancedVideoSettings: true,
                transition: transitionOptions[0].value, duration: 8, seed: null, strength: null, notes: '',
                ...data,
                aspect: aspectRatio,
                imageModel: defaultModel,
                characterIds: sceneChars.map(c => c.id),
                locationIds: sceneLocs.map(l => l.id),
            };
            
            // Only generate prompts if autoGeneratePrompt is enabled and at least one service is ready
            if (autoGeneratePrompt) {
              const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
              const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
              const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
              const hasAnyService = openaiReady || googleReady || higgsfieldReady;
              
              if (hasAnyService) {
                baseScene.imagePrompt = generateImagePromptForScene(baseScene, characters, locations);
                baseScene.videoPrompt = generateVideoPromptForScene(baseScene, characters, locations);
              }
            }
            
            return baseScene;
        });

        setScenes(newScenes);
    });
  }, [characters, locations, storyOutline, videoDuration, aspectRatio, apiConfig, withGlobalBusyState, generateImagePromptForScene, generateVideoPromptForScene, openaiService]);


  // --- Scene Management ---
  const addBlankScene = useCallback(() => {
    const defaultModel = (() => {
      // If OpenAI is ready, image provider controls which model to apply to scenes
      const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      if (openaiReady && apiConfig.imageProvider) {
        return apiConfig.imageProvider === 'google' ? apiConfig.googleModel : apiConfig.aivideoautoModel;
      }
      return apiConfig.service === 'google' ? apiConfig.googleModel : apiConfig.aivideoautoModel;
    })();
    const newScene: Scene = {
      id: uid(),
      mainImage: null,
      imageOptions: [],
      title: `Cảnh ${scenes.length + 1}`,
      imageShotType: imageShotTypeOptions[0].value,
      imagePrompt: '',
      videoPrompt: '',
      action: '',
      setting: '',
      cameraAngle: cameraAngleOptions[0].value,
      cuttingStyle: cuttingStyleOptions[0].value,
      useAdvancedVideoSettings: true,
      transition: transitionOptions[0].value,
      duration: 5,
      aspect: aspectRatio,
      negativePrompt: '',
      lighting: '',
      colorPalette: '',
      soundDesign: '',
      emotionalTone: '',
      vfx: 'None',
      seed: null,
      strength: null,
      imageModel: defaultModel,
      notes: '',
      characterIds: [],
      locationIds: [],
    };
    
    // Only generate prompts if autoGeneratePrompt is enabled and at least one service is ready
    if (autoGeneratePrompt) {
      const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
      const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
      const hasAnyService = openaiReady || googleReady || higgsfieldReady;
      
      if (hasAnyService) {
        newScene.imagePrompt = generateImagePromptForScene(newScene, characters, locations);
        newScene.videoPrompt = generateVideoPromptForScene(newScene, characters, locations);
      }
    }
    
    setScenes(prev => [...prev, newScene]);
  }, [scenes.length, aspectRatio, characters, locations, apiConfig, generateImagePromptForScene, generateVideoPromptForScene]);

  const removeScene = useCallback((index: number) => {
    setScenes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reorderScenes = useCallback((startIndex: number, endIndex: number) => {
    setScenes(prevScenes => {
      const result = Array.from(prevScenes);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);
  
  const regenerateSceneDetails = useCallback(async (index: number, sceneOverride?: Scene) => {
    const scene = sceneOverride || scenes[index];
    if (!scene.mainImage) return;

    await withBusyState('scenes', scene.id, async () => {
      const details = await gemini.generateSceneDetailsForImage(scene.mainImage!, apiConfig.googleApiKey);
      updateScene(index, details);
    });
  }, [scenes, updateScene, withBusyState, apiConfig.googleApiKey]);

  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    dispatchBusy({ type: 'SET_GLOBAL_BUSY', key: 'onUpload' });
    try {
        const defaultModel = apiConfig.service === 'google' ? apiConfig.googleModel : apiConfig.aivideoautoModel;
        const images = await readFilesAsDataUrls(e.target.files);
        const initialScenesLength = scenes.length;

        let newScenes: Scene[] = images.map((image, index) => {
            const baseScene: Scene = {
                id: uid(),
                mainImage: image,
                imageOptions: [image],
                title: `Cảnh ${initialScenesLength + index + 1}`,
                imageShotType: imageShotTypeOptions[0].value,
                imagePrompt: '', videoPrompt: '', action: '', setting: '',
                cameraAngle: cameraAngleOptions[0].value, transition: transitionOptions[0].value,
                cuttingStyle: cuttingStyleOptions[0].value,
                useAdvancedVideoSettings: true,
                duration: 5, aspect: aspectRatio, negativePrompt: '',
                lighting: '', colorPalette: '', soundDesign: '', emotionalTone: '', vfx: 'None',
                seed: null, strength: null, imageModel: defaultModel, notes: '',
            };
            
            // Only generate prompts if autoGeneratePrompt is enabled and at least one service is ready
            if (autoGeneratePrompt) {
              const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
              const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
              const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
              const hasAnyService = openaiReady || googleReady || higgsfieldReady;
              
              if (hasAnyService) {
                baseScene.imagePrompt = generateImagePromptForScene(baseScene, characters, locations);
                baseScene.videoPrompt = generateVideoPromptForScene(baseScene, characters, locations);
              }
            }
            
            return baseScene;
        });

        if (autoGeneratePrompt) {
            const total = newScenes.length;
            const startTime = Date.now();
            setBatchProgress({ total, completed: 0, startTime, eta: 0, task: 'phân tích ảnh' });

            const analysisPromises = newScenes.map(async (scene) => {
                try {
                    const details = await gemini.generateSceneDetailsForImage(scene.mainImage!, apiConfig.googleApiKey);
                    Object.assign(scene, details);
                    
                    // Only generate prompts if at least one service is ready
                    const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
                    const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
                    const higgsfieldReady = apiConfig.higgsfieldApiStatus === 'valid' && !!apiConfig.higgsfieldApiKey;
                    const hasAnyService = openaiReady || googleReady || higgsfieldReady;
                    
                    if (hasAnyService) {
                      scene.imagePrompt = generateImagePromptForScene(scene, characters, locations);
                      scene.videoPrompt = generateVideoPromptForScene(scene, characters, locations);
                    }
                } catch (error) {
                    console.error(`Failed to analyze image for scene ${scene.title}`, error);
                    scene.notes = "Lỗi: Không thể tự động phân tích ảnh này.";
                } finally {
                    setBatchProgress(prev => {
                        if (!prev) return null;
                        const completed = prev.completed + 1;
                        const elapsedTime = (Date.now() - startTime) / 1000;
                        const avgTime = elapsedTime / completed;
                        const eta = Math.round((total - completed) * avgTime);
                        return { ...prev, completed, eta };
                    });
                }
                return scene;
            });
            newScenes = await Promise.all(analysisPromises);
            setBatchProgress(null);
        }

        setScenes(prev => [...prev, ...newScenes]);
    } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
    } finally {
        dispatchBusy({ type: 'CLEAR_GLOBAL_BUSY', key: 'onUpload' });
    }
  }, [scenes.length, autoGeneratePrompt, aspectRatio, characters, locations, apiConfig, generateImagePromptForScene, generateVideoPromptForScene, onError]);
  

  // --- Image Generation & Editing ---
  const getRelevantReferences = useCallback((scene: Scene) => {
    const charRefs = (scene.characterIds || [])
      .map(id => characters.find(c => c.id === id))
      .filter((c): c is Character => !!c && !!c.image);
    const locRefs = (scene.locationIds || [])
      .map(id => locations.find(l => l.id === id))
      .filter((l): l is Location => !!l && !!l.image);
    return { charRefs, locRefs };
  }, [characters, locations]);

  const generateImageForScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    await withBusyState('scenes', scene.id, async () => {
      // Set empty options to show loading state in the UI
      updateScene(index, { imageOptions: [] });

      // Use only the scene's currently selected shot type for generation.
      const shotType = scene.imageShotType || 'Cinematic Wide Shot';
      
      const { charRefs, locRefs } = getRelevantReferences(scene);
      const modifiedPrompt = scene.imagePrompt;

      let image: UploadedImage;

      const openaiReady = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      const provider: 'google' | 'aivideoauto' | 'higgsfield' = (
        apiConfig.service === 'higgsfield' ? 'higgsfield'
        : (openaiReady && apiConfig.imageProvider ? apiConfig.imageProvider : (apiConfig.service === 'google' ? 'google' : 'aivideoauto'))
      ) as any;
      const tryWithProvider = async (p: 'google'|'aivideoauto'|'higgsfield'): Promise<UploadedImage> => {
        if (p === 'google') {
          const model = scene.imageModel || ((charRefs.length > 0 || locRefs.length > 0) ? 'gemini-2.5-flash-image-preview' : apiConfig.googleModel);
          return gemini.generateImageFromPrompt(modifiedPrompt, index, charRefs, locRefs, model, videoStyle, aspectRatio, apiConfig.googleApiKey);
        }
        if (p === 'aivideoauto') {
          const model = scene.imageModel || apiConfig.aivideoautoModel;
          return aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, modifiedPrompt, index, model, charRefs, locRefs, aspectRatio);
        }
        const model = scene.imageModel || apiConfig.higgsfieldImageModel || '';
        return higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey || '', modifiedPrompt, index, charRefs, locRefs, model, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
      };

      const order: ('google'|'aivideoauto'|'higgsfield')[] = (() => {
        const googleReady = (apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey;
        const aivideoautoReady = !!apiConfig.aivideoautoToken;
        const higgsReady = apiConfig.higgsfieldApiStatus === 'valid';
        const rest: ('google'|'aivideoauto'|'higgsfield')[] = [];
        if (provider !== 'google' && googleReady) rest.push('google');
        if (provider !== 'aivideoauto' && aivideoautoReady) rest.push('aivideoauto');
        if (provider !== 'higgsfield' && higgsReady) rest.push('higgsfield');
        return [provider, ...rest];
      })();

      let lastErr: any;
      for (const p of order) {
        try {
          image = await tryWithProvider(p);
          break;
        } catch (e: any) {
          lastErr = e;
          (window as any).toast?.(`Tự động chuyển provider do lỗi: ${e?.message || e}`, 'warning');
        }
      }
      if (!image && lastErr) throw lastErr;

      if (!image) {
        const errorMessage = 'Tạo ảnh thất bại, không nhận được kết quả.';
        updateScene(index, { imageOptions: scene.imageOptions }); // Revert to old options on failure
        throw new Error(errorMessage);
      }

      updateScene(index, {
        imageOptions: [image], // The single new image is the only option
        mainImage: image, // and it's the main image
      });
    });
  }, [scenes, apiConfig, videoStyle, aspectRatio, getRelevantReferences, updateScene, withBusyState]);

  const generateMoreImageOptionsForScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    if (!scene.mainImage || scene.imageOptions.length >= 3) return;

    await withBusyState('scenes', scene.id, async () => {
      const numToGenerate = 3 - scene.imageOptions.length;
      if (numToGenerate <= 0) return;

      // Get intelligent shot type suggestions from the AI to create variety.
      let shotTypes: string[];
      if (apiConfig.service === 'google') {
          shotTypes = await gemini.suggestShotTypesForScene(scene.imagePrompt, apiConfig.googleApiKey);
      } else {
          // Fallback for other services or if the suggestion fails
          shotTypes = [ "Cinematic Medium Shot", "Cinematic Close-up Shot", "High-angle Shot" ];
      }

      // To avoid generating the same shot type, filter out the existing one.
      const existingShotTypes = [scene.imageShotType];
      const newShotTypes = shotTypes.filter(st => !existingShotTypes.includes(st)).slice(0, numToGenerate);

      const { charRefs, locRefs } = getRelevantReferences(scene);

      const generationPromises = newShotTypes.map(shotType => {
        const modifiedPrompt = `${shotType}. ${scene.imagePrompt}`;
      const openaiReady2 = apiConfig.openaiApiStatus === 'valid' && !!apiConfig.openaiApiKey;
      const provider2: 'google' | 'aivideoauto' | 'higgsfield' = (
        apiConfig.service === 'higgsfield' ? 'higgsfield'
        : (openaiReady2 && apiConfig.imageProvider ? apiConfig.imageProvider : (apiConfig.service === 'google' ? 'google' : 'aivideoauto'))
      ) as any;
      if (provider2 === 'google') {
          const model = scene.imageModel || ((charRefs.length > 0 || locRefs.length > 0) ? 'gemini-2.5-flash-image-preview' : apiConfig.googleModel);
          return gemini.generateImageFromPrompt(modifiedPrompt, index, charRefs, locRefs, model, videoStyle, aspectRatio, apiConfig.googleApiKey);
        } else if (provider2 === 'aivideoauto') {
          const model = scene.imageModel || apiConfig.aivideoautoModel;
          return aivideoauto.generateImageFromPrompt(apiConfig.aivideoautoToken, modifiedPrompt, index, model, charRefs, locRefs, aspectRatio);
        } else {
          const model = scene.imageModel || apiConfig.higgsfieldImageModel || '';
          return higgsfield.generateImageFromPrompt(apiConfig.higgsfieldApiKey || '', modifiedPrompt, index, charRefs, locRefs, model, videoStyle, aspectRatio, apiConfig.higgsfieldSecret);
        }
      });

      const results = await Promise.allSettled(generationPromises);

      const successfulImages: UploadedImage[] = results
        .filter((result): result is PromiseFulfilledResult<UploadedImage> => result.status === 'fulfilled' && !!result.value)
        .map(result => result.value);

      if (successfulImages.length === 0) {
        throw new Error("Không thể tạo thêm các tùy chọn ảnh.");
      }
      
      // Add new images to the existing options
      updateScene(index, {
        imageOptions: [...scene.imageOptions, ...successfulImages],
      });
    });
  }, [scenes, apiConfig, videoStyle, aspectRatio, getRelevantReferences, updateScene, withBusyState]);


  const editImageForScene = useCallback(async (index: number, prompt: string, referenceImages?: UploadedImage[]) => {
    const scene = scenes[index];
    if (!scene.mainImage) return;
    await withBusyState('scenes', scene.id, async () => {
      let newDataUrl: string;
      if (apiConfig.service === 'google') {
        newDataUrl = await gemini.editImageWithPrompt(scene.mainImage!, prompt, apiConfig.googleApiKey, aspectRatio, referenceImages);
      } else if (apiConfig.service === 'aivideoauto') {
        const modelToUse = scene.imageModel || apiConfig.aivideoautoModel;
        newDataUrl = await aivideoauto.editImageWithPrompt(apiConfig.aivideoautoToken, scene.mainImage!, prompt, modelToUse, aspectRatio, referenceImages);
      } else if (apiConfig.service === 'higgsfield' || apiConfig.imageProvider === 'higgsfield') {
        newDataUrl = await higgsfield.editImageWithPrompt(scene.mainImage!, prompt, apiConfig.higgsfieldApiKey || '', aspectRatio, referenceImages);
      } else {
        const modelToUse = scene.imageModel || apiConfig.aivideoautoModel;
        newDataUrl = await aivideoauto.editImageWithPrompt(apiConfig.aivideoautoToken, scene.mainImage!, prompt, modelToUse, aspectRatio, referenceImages);
      }
      
      const oldMainImage = scene.mainImage;
      const newImage: UploadedImage = { ...scene.mainImage!, dataUrl: newDataUrl, aivideoautoImageInfo: undefined };
      
      // Replace the old main image with the new one in the options array
      const newImageOptions = scene.imageOptions.map(opt => 
        opt.dataUrl === oldMainImage?.dataUrl ? newImage : opt
      );

      updateScene(index, { mainImage: newImage, imageOptions: newImageOptions });
    });
  }, [scenes, apiConfig, aspectRatio, updateScene, withBusyState]);

  const handleReplaceImage = useCallback(async (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const files = new DataTransfer();
        files.items.add(file);
        const [imageData] = await readFilesAsDataUrls(files.files);
        // When an image is replaced, it becomes the only option and loses any aivideoauto info.
        updateScene(index, { mainImage: imageData, imageOptions: [imageData] });
        if (autoGeneratePrompt) {
          const updatedScene = { ...scenes[index], mainImage: imageData, imageOptions: [imageData] };
          await regenerateSceneDetails(index, updatedScene);
        }
      }
    };
    input.click();
  }, [scenes, updateScene, autoGeneratePrompt, regenerateSceneDetails]);

  const regenerateAllImages = useCallback(async () => {
    console.log('🖼️ [STORYBOARD] Starting batch image generation...', { scenesCount: scenes.length });
    const itemsToGenerate = scenes
      .map((scene, index) => ({ scene, index }));
    await withBatchProgress('isBatchGenerating', 'ảnh', itemsToGenerate, item => generateImageForScene(item.index));
    console.log('✅ [STORYBOARD] Batch image generation completed');
  }, [scenes, generateImageForScene, withBatchProgress]);

  const regenerateMissingImages = useCallback(async () => {
    const itemsToGenerate = scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => !scene.mainImage);
    await withBatchProgress('isBatchGenerating', 'ảnh', itemsToGenerate, item => generateImageForScene(item.index));
  }, [scenes, generateImageForScene, withBatchProgress]);

  // --- Video Generation ---
  const generateVideoForScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    console.log('🎬 [STORYBOARD] Starting video generation for scene...', { 
      sceneTitle: scene.title, 
      service: apiConfig.service,
      hasImage: !!scene.mainImage 
    });
    
    await withBusyState('scenes', scene.id, async () => {
      updateScene(index, { videoStatus: 'generating', videoUrl: null, videoStatusMessage: 'Đang khởi tạo...' });
      try {
        let videoUrl: string;

        const styleInstruction = getVideoStyleInstruction(videoStyle);
        // Prepend the style instruction to give it priority
        const finalVideoPrompt = styleInstruction 
            ? `${styleInstruction}. ${scene.videoPrompt}`
            : scene.videoPrompt;
        const sceneWithStyledPrompt = { ...scene, videoPrompt: finalVideoPrompt };

        const mapVideoError = (err: any): string => {
          const msg = (err && (err.message || String(err))) || '';
          if (/429|rate limit/i.test(msg)) return 'Quá giới hạn, vui lòng thử lại sau.';
          if (/401|403/i.test(msg)) return 'Key không hợp lệ hoặc bị từ chối.';
          if (/credits|insufficient/i.test(msg)) return 'Tài khoản không đủ credits.';
          if (/model|veo|not.*found|400/i.test(msg)) return 'Model không khả dụng.';
          if (/network|failed to fetch|timeout/i.test(msg)) return 'Mạng lỗi hoặc máy chủ không phản hồi.';
          return msg || 'Tạo video thất bại.';
        };

        const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

        const useGoogleVideo = (
          apiConfig.service === 'google' ||
          (apiConfig.service === 'openai' && apiConfig.imageProvider === 'google')
        );
        const useHiggsfieldVideo = (
          apiConfig.service === 'higgsfield' ||
          (apiConfig.service === 'openai' && apiConfig.imageProvider === 'higgsfield')
        );

        const tryVeo = async (): Promise<string> => {
          console.log('🎬 [STORYBOARD] Using Google Veo 2 API for video generation');
          return await veoService.generateVideoForScene(
            sceneWithStyledPrompt,
            apiConfig.googleApiKey,
            apiConfig.googleVideoModel,
            (message) => updateScene(index, { videoStatusMessage: message })
          );
        };

        const tryAivideoauto = async (): Promise<string> => {
          console.log('🎬 [STORYBOARD] Using Aivideoauto API for video generation');
          const taskId = await aivideoauto.createVideo(apiConfig.aivideoautoToken, sceneWithStyledPrompt, apiConfig.aivideoautoVideoModel);
          updateScene(index, { taskId, videoStatusMessage: 'Đã gửi yêu cầu...' });
          const poll = async (startTime: number): Promise<string> => {
            const statusRes = await aivideoauto.checkVideoStatus(apiConfig.aivideoautoToken, taskId);
            const currentStatus = statusRes.status?.toLowerCase() || '';
            let statusMessage = '';
            if (currentStatus) {
              statusMessage = `Trạng thái: ${currentStatus}`;
              if (statusRes.queue_position) {
                statusMessage += ` (hàng chờ: ${statusRes.queue_position})`;
              } else if (statusRes.progress) {
                const progress = Number(statusRes.progress);
                if (progress > 0) {
                  const elapsedTime = (Date.now() - startTime) / 1000;
                  const totalTime = elapsedTime / (progress / 100);
                  const eta = Math.round(totalTime - elapsedTime);
                  statusMessage += ` (${progress}%) (Còn lại ~${formatDuration(eta)})`;
                } else {
                  statusMessage += ` (${progress}%)`;
                }
              }
            }
            updateScene(index, { videoStatusMessage: statusMessage });

            const isSuccess = currentStatus.includes('success') || currentStatus.includes('completed') || currentStatus.includes('done');
            const isFailure = currentStatus.includes('fail') || currentStatus.includes('error');
            if (isSuccess && statusRes.download_url) {
              updateScene(index, { videoStatusMessage: 'Hoàn thành!' });
              return statusRes.download_url;
            }
            if (isFailure) {
              throw new Error(statusRes.message || 'Tạo video thất bại.');
            }
            await new Promise(res => setTimeout(res, POLLING_INTERVAL_MS));
            return poll(startTime);
          };
          return await poll(Date.now());
        };

        const tryHiggsfield = async (): Promise<string> => {
          console.log('🎬 [STORYBOARD] Using Higgsfield API for video generation');
          
          // Determine which Higgsfield model to use
          const model = apiConfig.higgsfieldVideoModel || 'dop-turbo';
          
          if (model.includes('speak') || model === 'speak-v2') {
            // Use Speak v2 for text-to-video
            console.log('🎬 [STORYBOARD] Using Higgsfield Speak v2 for text-to-video');
            const result = await higgsfield.generateSpeakVideo(
              apiConfig.higgsfieldApiKey || '',
              apiConfig.higgsfieldSecret || '',
              {
                text: sceneWithStyledPrompt.videoPrompt || '',
                quality: '1080p',
                seed: Math.floor(Math.random() * 1000000)
              }
            );
            
            // Poll for completion
            const poll = async (): Promise<string> => {
              const statusRes = await fetch(`/api/higgsfield/videos/${result.id}`, {
                headers: {
                  'x-higgsfield-api-key': apiConfig.higgsfieldApiKey || '',
                  'x-higgsfield-secret': apiConfig.higgsfieldSecret || '',
                }
              });
              
              if (!statusRes.ok) throw new Error(await statusRes.text());
              const statusData = await statusRes.json();
              const status = (statusData?.status || '').toLowerCase();
              
              if (status.includes('done') || status.includes('success') || statusData?.downloadUrl) {
                const downloadUrl = statusData?.downloadUrl || statusData?.videoUrl || '';
                if (!downloadUrl) throw new Error('Thiếu downloadUrl.');
                const resp = await fetch(downloadUrl);
                const blob = await resp.blob();
                return URL.createObjectURL(blob);
              }
              
              if (status.includes('error') || status.includes('fail')) {
                throw new Error(statusData?.message || 'Tạo video thất bại.');
              }
              
              updateScene(index, { videoStatusMessage: statusData?.message || 'Đang tạo video...' });
              await new Promise(res => setTimeout(res, 8000));
              return poll();
            };
            
            return await poll();
          } else {
            // Use DoP for image-to-video
            console.log('🎬 [STORYBOARD] Using Higgsfield DoP for image-to-video');
            
            if (!sceneWithStyledPrompt.mainImage?.dataUrl) {
              throw new Error('Cần có ảnh để tạo video từ ảnh.');
            }
            
            const result = await higgsfield.generateVideoFromImage(
              apiConfig.higgsfieldApiKey || '',
              apiConfig.higgsfieldSecret || '',
              {
                image_url: sceneWithStyledPrompt.mainImage.dataUrl,
                quality: '1080p',
                duration: 8,
                seed: Math.floor(Math.random() * 1000000)
              }
            );
            
            // Poll for completion
            const poll = async (): Promise<string> => {
              const statusRes = await fetch(`/api/higgsfield/videos/${result.id}`, {
                headers: {
                  'x-higgsfield-api-key': apiConfig.higgsfieldApiKey || '',
                  'x-higgsfield-secret': apiConfig.higgsfieldSecret || '',
                }
              });
              
              if (!statusRes.ok) throw new Error(await statusRes.text());
              const statusData = await statusRes.json();
              const status = (statusData?.status || '').toLowerCase();
              
              if (status.includes('done') || status.includes('success') || statusData?.downloadUrl) {
                const downloadUrl = statusData?.downloadUrl || statusData?.videoUrl || '';
                if (!downloadUrl) throw new Error('Thiếu downloadUrl.');
                const resp = await fetch(downloadUrl);
                const blob = await resp.blob();
                return URL.createObjectURL(blob);
              }
              
              if (status.includes('error') || status.includes('fail')) {
                throw new Error(statusData?.message || 'Tạo video thất bại.');
              }
              
              updateScene(index, { videoStatusMessage: statusData?.message || 'Đang tạo video...' });
              await new Promise(res => setTimeout(res, 8000));
              return poll();
            };
            
            return await poll();
          }
        };

        let primary = tryAivideoauto as () => Promise<string>;
        let secondary = tryVeo as () => Promise<string>;
        if (useGoogleVideo) { primary = tryVeo; secondary = tryAivideoauto; }
        if (useHiggsfieldVideo) { primary = tryHiggsfield; secondary = useGoogleVideo ? tryVeo : tryAivideoauto; }

        // Backoff once on 429 before fallback
        try {
          videoUrl = await primary();
        } catch (e: any) {
          const msg = mapVideoError(e);
          if (/Quá giới hạn/.test(msg)) {
            await sleep(2000);
            try {
              videoUrl = await primary();
            } catch (e2) {
              const otherReady = useGoogleVideo
                ? !!apiConfig.aivideoautoToken
                : ((apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey);
              if (otherReady) {
                (window as any).toast?.(`Đã tự động chuyển sang ${useGoogleVideo ? 'Aivideoauto' : 'Veo 2'} do lỗi: ${msg}`, 'warning');
                videoUrl = await secondary();
              } else {
                throw new Error(msg);
              }
            }
          } else {
            const otherReady = useGoogleVideo
              ? !!apiConfig.aivideoautoToken
              : ((apiConfig.googleApiStatus === 'valid' || apiConfig.googleApiStatus === 'env_configured') && !!apiConfig.googleApiKey);
            if (otherReady) {
              (window as any).toast?.(`Đã tự động chuyển sang ${useGoogleVideo ? 'Aivideoauto' : 'Veo 2'} do lỗi: ${msg}`, 'warning');
              videoUrl = await secondary();
            } else {
              throw new Error(msg);
            }
          }
        }
        
        console.log('✅ [STORYBOARD] Video generation completed successfully');
        updateScene(index, { videoStatus: 'done', videoUrl, videoStatusMessage: undefined });
      } catch (error) {
        console.error('🔴 [STORYBOARD] Video generation failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const friendly = (() => {
          if (/Quá giới hạn|429/i.test(errorMessage)) return 'Quá giới hạn, vui lòng thử lại sau.';
          if (/model|veo|400/i.test(errorMessage)) return 'Model không khả dụng.';
          if (/credits|insufficient/i.test(errorMessage)) return 'Tài khoản không đủ credits.';
          if (/401|403/i.test(errorMessage)) return 'Key không hợp lệ hoặc bị từ chối.';
          if (/network|fetch|timeout/i.test(errorMessage)) return 'Mạng lỗi hoặc máy chủ không phản hồi.';
          return errorMessage || 'Tạo video thất bại.';
        })();
        updateScene(index, { videoStatus: 'error', videoStatusMessage: errorMessage });
        updateScene(index, { videoStatusMessage: friendly });
        throw new Error(friendly); // Propagate to withBusyState for logging
      }
    });
  }, [scenes, apiConfig, updateScene, withBusyState, videoStyle]);

  const generateAllSceneVideos = useCallback(async () => {
    console.log('🎬 [STORYBOARD] Starting batch video generation...', { scenesCount: scenes.length });
    const itemsToGenerate = scenes
        .map((scene, index) => ({ scene, index }))
        .filter(({ scene }) => !scene.videoStatus || ['idle', 'error'].includes(scene.videoStatus!));
    console.log('🎬 [STORYBOARD] Videos to generate:', { count: itemsToGenerate.length });
    await withBatchProgress('isBatchGenerating', 'video', itemsToGenerate, item => generateVideoForScene(item.index));
    console.log('✅ [STORYBOARD] Batch video generation completed');
  }, [scenes, generateVideoForScene, withBatchProgress]);

  // --- Character Management ---
  const addCharacter = useCallback(() => {
    const newChar: Character = { id: uid(), name: 'New Character', description: '', image: null, status: 'defined' };
    setCharacters(prev => [...prev, newChar]);
  }, []);

  const removeCharacter = useCallback((index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleCharacterImageUpload = useCallback(async (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const files = new DataTransfer();
        files.items.add(file);
        const [imageData] = await readFilesAsDataUrls(files.files);
        const compressedImage = await compressImage(imageData);
        updateCharacter(index, { image: compressedImage, status: 'defined' });
      }
    };
    input.click();
  }, [updateCharacter]);

  const editCharacterImage = useCallback(async (index: number, prompt: string, refImages?: UploadedImage[]) => {
    const char = characters[index];
    if (!char.image) return;
    await withBusyState('characters', char.id, async () => {
      let newDataUrl: string;
      if (apiConfig.service === 'google') {
        newDataUrl = await gemini.editImageWithPrompt(char.image!, prompt, apiConfig.googleApiKey, aspectRatio, refImages);
      } else {
        newDataUrl = await aivideoauto.editImageWithPrompt(apiConfig.aivideoautoToken, char.image!, prompt, apiConfig.aivideoautoModel, aspectRatio, refImages);
      }
      const mimeType = newDataUrl.substring(newDataUrl.indexOf(':') + 1, newDataUrl.indexOf(';'));
      const editedImage: UploadedImage = {
        name: char.image.name,
        type: mimeType || 'image/png',
        size: newDataUrl.length,
        dataUrl: newDataUrl,
      };
      const compressedImage = await compressImage(editedImage);
      updateCharacter(index, { image: compressedImage });
    });
  }, [characters, withBusyState, apiConfig, aspectRatio, updateCharacter]);

  // --- Location Management (similar to characters) ---
  const addLocation = useCallback(() => {
    const newLoc: Location = { id: uid(), name: 'New Location', description: '', image: null, status: 'defined' };
    setLocations(prev => [...prev, newLoc]);
  }, []);
  
  const removeLocation = useCallback((index: number) => {
    setLocations(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleLocationImageUpload = useCallback(async (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const files = new DataTransfer();
        files.items.add(file);
        const [imageData] = await readFilesAsDataUrls(files.files);
        const compressedImage = await compressImage(imageData);
        updateLocation(index, { image: compressedImage, status: 'defined' });
      }
    };
    input.click();
  }, [updateLocation]);

  const editLocationImage = useCallback(async (index: number, prompt: string, refImages?: UploadedImage[]) => {
    const loc = locations[index];
    if (!loc.image) return;
    await withBusyState('locations', loc.id, async () => {
      let newDataUrl: string;
      if (apiConfig.service === 'google') {
        newDataUrl = await gemini.editImageWithPrompt(loc.image!, prompt, apiConfig.googleApiKey, aspectRatio, refImages);
      } else {
        newDataUrl = await aivideoauto.editImageWithPrompt(apiConfig.aivideoautoToken, loc.image!, prompt, apiConfig.aivideoautoModel, aspectRatio, refImages);
      }
      const mimeType = newDataUrl.substring(newDataUrl.indexOf(':') + 1, newDataUrl.indexOf(';'));
      const editedImage: UploadedImage = {
        name: loc.image.name,
        type: mimeType || 'image/png',
        size: newDataUrl.length,
        dataUrl: newDataUrl,
      };
      const compressedImage = await compressImage(editedImage);
      updateLocation(index, { image: compressedImage });
    });
  }, [locations, withBusyState, apiConfig, aspectRatio, updateLocation]);

  // --- Bulk Downloads ---
  const downloadAllSceneImages = useCallback(async () => {
    const zip = new JSZip();
    const imagesToDownload = scenes.filter(s => s.mainImage);
    if (imagesToDownload.length === 0) return;

    for (const scene of imagesToDownload) {
      if (scene.mainImage) {
        const response = await fetch(scene.mainImage.dataUrl);
        const blob = await response.blob();
        zip.file(scene.mainImage.name, blob);
      }
    }
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `storyboard_images_${Date.now()}.zip`);
  }, [scenes]);

  const downloadAllSceneVideos = useCallback(async () => {
      const zip = new JSZip();
      const videosToDownload = scenes.filter(s => s.videoStatus === 'done' && s.videoUrl);
      if (videosToDownload.length === 0) return;

      // Use Promise.all to fetch all videos concurrently
      const downloadPromises = scenes.map(async (scene, index) => {
        if (scene.videoStatus === 'done' && scene.videoUrl) {
          try {
            const response = await fetch(scene.videoUrl);
            const blob = await response.blob();
            // Use the original scene index for correct file naming
            zip.file(`scene_${String(index + 1).padStart(2, '0')}.mp4`, blob);
          } catch (error) {
              console.error(`Failed to download or add video for scene ${index + 1} to zip.`, error);
              // Optionally, notify the user about the specific failure.
              // For now, we'll just log it and the zip will be created without this file.
          }
        }
      });
      
      // Wait for all downloads to complete before generating the zip file
      await Promise.all(downloadPromises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `storyboard_videos_${Date.now()}.zip`);
  }, [scenes]);

  const exportAssets = useCallback(async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Export characters
      characters.forEach((char, index) => {
        if (char.image) {
          zip.file(`characters/${char.name}_${index}.png`, char.image.dataUrl.split(',')[1], { base64: true });
        }
      });
      
      // Export locations
      locations.forEach((loc, index) => {
        if (loc.image) {
          zip.file(`locations/${loc.name}_${index}.png`, loc.image.dataUrl.split(',')[1], { base64: true });
        }
      });
      
      // Export scenes
      scenes.forEach((scene, index) => {
        if (scene.mainImage) {
          zip.file(`scenes/scene_${index + 1}.png`, scene.mainImage.dataUrl.split(',')[1], { base64: true });
        }
      });
      
      // Export metadata
      const metadata = {
        idea,
        lyrics,
        visualNotes,
        videoDuration,
        storyOutline,
        characters: characters.map(c => ({ name: c.name, description: c.description })),
        locations: locations.map(l => ({ name: l.name, description: l.description })),
        scenes: scenes.map(s => ({ title: s.title, imagePrompt: s.imagePrompt, videoPrompt: s.videoPrompt }))
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `storyboard_assets_${Date.now()}.zip`);
    } catch (error) {
      onError('Lỗi khi export assets: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, [characters, locations, scenes, idea, lyrics, visualNotes, videoDuration, storyOutline, onError]);

  const importAssets = useCallback(async (file: File) => {
    setIsImporting(true);
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Import metadata
      const metadataFile = zipContent.file('metadata.json');
      if (metadataFile) {
        const metadataText = await metadataFile.async('text');
        const metadata = JSON.parse(metadataText);
        
        setIdea(metadata.idea || '');
        setLyrics(metadata.lyrics || '');
        setVisualNotes(metadata.visualNotes || '');
        setVideoDuration(metadata.videoDuration || 40);
        setStoryOutline(metadata.storyOutline || []);
        
        // Import characters
        if (metadata.characters) {
          const newCharacters = metadata.characters.map((char: any) => ({
            id: uid(),
            name: char.name,
            description: char.description,
            image: null,
            status: 'suggested' as const
          }));
          setCharacters(newCharacters);
        }
        
        // Import locations
        if (metadata.locations) {
          const newLocations = metadata.locations.map((loc: any) => ({
            id: uid(),
            name: loc.name,
            description: loc.description,
            image: null,
            status: 'suggested' as const
          }));
          setLocations(newLocations);
        }
        
        // Import scenes
        if (metadata.scenes) {
          const newScenes = metadata.scenes.map((scene: any) => ({
            id: uid(),
            title: scene.title,
            imagePrompt: scene.imagePrompt,
            videoPrompt: scene.videoPrompt,
            mainImage: null,
            imageOptions: [],
            negativePrompt: '',
            action: '',
            setting: '',
            cameraAngle: '',
            lighting: '',
            colorPalette: '',
            soundDesign: '',
            emotionalTone: '',
            vfx: '',
            transition: '',
            duration: null,
            aspect: aspectRatio,
            seed: null,
            strength: null,
            notes: '',
            characterIds: [],
            locationIds: [],
            videoUrl: null,
            videoStatus: 'idle' as const,
            videoStatusMessage: '',
            taskId: null
          }));
          setScenes(newScenes);
        }
      }
      
      // Import images
      const readImageFromZip = async (filename: string): Promise<UploadedImage | null> => {
        const file = zipContent.file(filename);
        if (!file) return null;
        
        const base64 = await file.async('base64');
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return {
          name: filename.split('/').pop() || 'image',
          type: mimeType,
          size: base64.length,
          dataUrl: `data:${mimeType};base64,${base64}`
        };
      };
      
      // Import character images
      for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const image = await readImageFromZip(`characters/${char.name}_${i}.png`);
        if (image) {
          updateCharacter(i, { image });
        }
      }
      
      // Import location images
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const image = await readImageFromZip(`locations/${loc.name}_${i}.png`);
        if (image) {
          updateLocation(i, { image });
        }
      }
      
      // Import scene images
      for (let i = 0; i < scenes.length; i++) {
        const image = await readImageFromZip(`scenes/scene_${i + 1}.png`);
        if (image) {
          updateScene(i, { mainImage: image });
        }
      }
      
    } catch (error) {
      onError('Lỗi khi import assets: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  }, [characters, locations, scenes, aspectRatio, setIdea, setLyrics, setVisualNotes, setVideoDuration, setStoryOutline, setCharacters, setLocations, setScenes, updateCharacter, updateLocation, updateScene, onError]);

  // --- Sketch & Annotation Management ---
  const updateSceneAnnotations = useCallback((index: number, annotations: Annotation[]) => {
    updateScene(index, { sketchAnnotations: annotations });
  }, [updateScene]);

  const generateSketchForScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    await withBusyState('scenes', scene.id, async () => {
      const sketchImage = await gemini.generateSketchForImage(scene, index, videoStyle, aspectRatio, apiConfig.googleApiKey);
      updateScene(index, { sketchImage });
    });
  }, [scenes, videoStyle, aspectRatio, updateScene, withBusyState, apiConfig.googleApiKey]);

  const generateAllSketches = useCallback(async () => {
    const itemsToGenerate = scenes
      .map((scene, index) => ({ scene, index }))
      .filter(({ scene }) => !scene.sketchImage);
    await withBatchProgress('isBatchGenerating', 'phác thảo', itemsToGenerate, item => generateSketchForScene(item.index));
  }, [scenes, generateSketchForScene, withBatchProgress]);
  
  // --- Return Value ---
  return {
    scenes,
    characters,
    locations,
    aspectRatio,
    idea,
    lyrics,
    visualNotes,
    audioFile,
    storyOutline,
    updateStoryOutline,
    videoDuration,
    setVideoDuration,
    busy: busyState.global.size > 0 || busyState.scenes.size > 0 || busyState.characters.size > 0 || busyState.locations.size > 0,
    isGeneratingFromText: busyState.global.has('isGeneratingFromText'),
    isGeneratingScenes: busyState.global.has('isGeneratingScenes'),
    isBatchGenerating: busyState.global.has('isBatchGenerating'),
    isGeneratingReferenceImages: busyState.global.has('isGeneratingReferenceImages'),
    isImporting,
    isExporting,
    isSceneBusy: (id: string) => busyState.scenes.has(id) || busyState.characters.has(id) || busyState.locations.has(id),
    batchProgress,
    setIdea,
    setLyrics,
    setVisualNotes,
    setAudioFile,
    onUpload,
    addBlankScene,
    updateScene,
    removeScene,
    reorderScenes,
    handleReplaceImage,
    generateBlueprintFromIdea,
    generateScenesFromBlueprint,
    regenerateSceneDetails,
    generateImageForScene,
    generateMoreImageOptionsForScene,
    editImageForScene,
    regenerateAllImages,
    regenerateMissingImages,
    generateAllReferenceImages,
    generateVideoForScene,
    generateAllSceneVideos,
    downloadAllSceneImages,
    downloadAllSceneVideos,
    exportAssets,
    importAssets,
    addCharacter,
    updateCharacter,
    removeCharacter,
    handleCharacterImageUpload,
    generateCharacterImage,
    editCharacterImage,
    addLocation,
    updateLocation,
    removeLocation,
    handleLocationImageUpload,
    generateLocationImage,
    editLocationImage,
    updateSceneAnnotations,
    generateSketchForScene,
    generateAllSketches,
  };
}