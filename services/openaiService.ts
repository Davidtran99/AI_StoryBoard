/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Character, Location, Scene, VideoStyle } from '../types';
import { parseApiError } from '../lib/utils';

const DEFAULT_TEXT_MODELS: { id: string; name: string }[] = [
  { id: 'gpt-4o', name: 'GPT‑4o' },
  { id: 'gpt-4o-mini', name: 'GPT‑4o Mini' },
  { id: 'gpt-4.1', name: 'GPT‑4.1' },
  { id: 'gpt-4.1-mini', name: 'GPT‑4.1 Mini' },
];

function isTextModelId(id: string): boolean {
  const lowered = id.toLowerCase();
  // include gpt, 4o, 4.1, 3.5, instruct; exclude embeddings, audio/image/moderation
  const include = (
    lowered.includes('gpt') ||
    lowered.includes('4o') ||
    lowered.includes('4.1') ||
    lowered.includes('3.5') ||
    lowered.includes('instruct')
  );
  const exclude = (
    lowered.includes('embedding') ||
    lowered.includes('whisper') ||
    lowered.includes('tts') ||
    lowered.includes('audio') ||
    lowered.includes('speech') ||
    lowered.includes('image') ||
    lowered.includes('vision') ||
    lowered.includes('moderation')
  );
  return include && !exclude;
}

function prettyModelName(id: string): string {
  // Simple prettifier: replace dashes by spaces and upper-case common tokens
  const upperMap: Record<string, string> = {
    'gpt': 'GPT',
    'mini': 'Mini',
    'instruct': 'Instruct',
  };
  return id
    .split('-')
    .map(p => upperMap[p] || p.toUpperCase().replace('4O', '4o'))
    .join('-')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sortModels(models: { id: string; name: string }[]): { id: string; name: string }[] {
  const weight = (id: string) => {
    const x = id.toLowerCase();
    if (x.includes('4o') && !x.includes('mini')) return 0;
    if (x.includes('4.1') && !x.includes('mini')) return 1;
    if (x.includes('4o') && x.includes('mini')) return 2;
    if (x.includes('4.1') && x.includes('mini')) return 3;
    if (x.includes('3.5')) return 4;
    if (x.includes('instruct')) return 5;
    return 6;
  };
  return [...models].sort((a, b) => weight(a.id) - weight(b.id) || a.id.localeCompare(b.id));
}

export const getTextModels = async (apiKey: string): Promise<{ id: string; name: string }[]> => {
  console.log('🌐 [OPENAI API] Loading text models list...');
  if (!apiKey) throw new Error('Thiếu OpenAI API key');

  // Attempt proxy first (dev Vite middleware or production proxy)
  try {
    const base = (import.meta as any).env?.OPENAI_PROXY_URL || '/api/openai';
    const proxyBase = String(base || '/api/openai').replace(/\/$/, '');
    const url = `${proxyBase}/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const json = await res.json();
      const raw: any[] = Array.isArray(json.data) ? json.data : [];
      const ids = raw.map(m => String(m.id)).filter(Boolean);
      const filtered = Array.from(new Set(ids.filter(isTextModelId)));
      const mapped = sortModels(filtered.map(id => ({ id, name: prettyModelName(id) })));
      if (mapped.length > 0) {
        try {
          const cacheKey = `openai_models::${apiKey.slice(0, 8)}`;
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: mapped }));
        } catch (_) {}
        return mapped;
      }
    }
  } catch (e) {
    console.warn('🌐 [OPENAI API] Proxy fetch failed, falling back to direct.', e);
  }

  // Session cache to avoid repeated calls within the same tab
  try {
    const cacheKey = `openai_models::${apiKey.slice(0, 8)}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { ts: number; data: { id: string; name: string }[] };
      // 10 minutes TTL
      if (Date.now() - parsed.ts < 10 * 60 * 1000 && Array.isArray(parsed.data) && parsed.data.length > 0) {
        console.log('🌐 [OPENAI API] Using cached model list');
        return parsed.data;
      }
    }
  } catch (_) {
    // ignore cache errors
  }

  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error('Quá giới hạn gọi API. Vui lòng thử lại sau.');
      if (res.status === 401) throw new Error('API key không hợp lệ.');
      throw new Error(`Lỗi OpenAI API: ${res.status}`);
    }
    const json = await res.json();
    const raw: any[] = Array.isArray(json.data) ? json.data : [];
    const ids = raw.map(m => String(m.id)).filter(Boolean);
    const filtered = ids.filter(isTextModelId);
    // De-duplicate and map to names
    const unique = Array.from(new Set(filtered));
    const mapped = unique.map(id => ({ id, name: prettyModelName(id) }));
    const sorted = sortModels(mapped);

    // Fall back to defaults if list is empty
    const result = sorted.length > 0 ? sorted : DEFAULT_TEXT_MODELS;

    try {
      const cacheKey = `openai_models::${apiKey.slice(0, 8)}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: result }));
    } catch (_) {}

    return result;
  } catch (err) {
    console.warn('🔴 [OPENAI API] Failed to fetch /v1/models, using defaults.', err);
    return DEFAULT_TEXT_MODELS;
  }
};

export const generateBlueprintFromIdea = async (
  idea: string,
  apiKey: string,
  numScenes: number,
  videoStyle: VideoStyle
): Promise<{ characters: Omit<Character, 'id' | 'image' | 'status'>[]; locations: Omit<Location, 'id' | 'image' | 'status'>[]; story_outline: string[] }> => {
  console.log('🔵 [OPENAI API] Generating blueprint from idea...', { numScenes, videoStyle });
  if (!apiKey) throw new Error('Thiếu OpenAI API key');

  const proxyBase = String(((import.meta as any).env?.OPENAI_PROXY_URL || '/api/openai')).replace(/\/$/, '');
  const proxyChatUrl = `${proxyBase}/chat`;
  const directChatUrl = 'https://api.openai.com/v1/chat/completions';

  const prompt = `You are a professional storyboard creator. Create a detailed storyboard blueprint for a ${videoStyle} video based on this idea: "${idea}"

The video should be approximately ${numScenes * 8} seconds long, divided into ${numScenes} scenes of 8 seconds each.

Please respond with a JSON object in this exact format:
{
  "characters": [
    {"name": "Character Name", "description": "Detailed physical and personality description"}
  ],
  "locations": [
    {"name": "Location Name", "description": "Detailed description of the setting and atmosphere"}
  ],
  "story_outline": [
    "Scene 1: Brief description of what happens",
    "Scene 2: Brief description of what happens",
    ...
  ]
}

Make sure the story flows logically and each scene advances the narrative. Focus on visual storytelling appropriate for ${videoStyle} style.`;

  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };

  const postChat = async (url: string) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  try {
    // Try proxy first
    let response = await postChat(proxyChatUrl);
    if (!response.ok) {
      // Fallback to direct endpoint on non-2xx
      response = await postChat(directChatUrl);
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error('Quá giới hạn gọi API. Vui lòng thử lại sau.');
      if (response.status === 401) throw new Error('API key không hợp lệ.');
      throw new Error(`Lỗi OpenAI API: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Không nhận được phản hồi từ OpenAI');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Định dạng phản hồi không hợp lệ từ OpenAI');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (!result.characters || !result.locations || !result.story_outline) {
      throw new Error('Cấu trúc blueprint không hợp lệ từ OpenAI');
    }

    console.log('✅ [OPENAI API] Blueprint generated successfully');
    return result;
  } catch (error) {
    console.error('🔴 [OPENAI API] Blueprint generation failed:', error);
    throw new Error(`Lỗi tạo kế hoạch chi tiết: ${parseApiError(error)}`);
  }
};

export const generateScenesFromBlueprint = async (
  blueprint: { characters: Character[]; locations: Location[]; storyOutline: string[] },
  apiKey: string,
  numScenes: number
): Promise<Partial<Scene>[]> => {
  console.log('🔵 [OPENAI API] Generating scenes from blueprint...', { numScenes });
  if (!apiKey) throw new Error('Thiếu OpenAI API key');

  const proxyBase = String(((import.meta as any).env?.OPENAI_PROXY_URL || '/api/openai')).replace(/\/$/, '');
  const proxyChatUrl = `${proxyBase}/chat`;
  const directChatUrl = 'https://api.openai.com/v1/chat/completions';

  const charactersText = blueprint.characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
  const locationsText = blueprint.locations.map(l => `- ${l.name}: ${l.description}`).join('\n');
  const outlineText = blueprint.storyOutline.map((point, i) => `${i + 1}. ${point}`).join('\n');

  const prompt = `You are a professional storyboard creator. Based on this blueprint, create detailed scene descriptions for ${numScenes} scenes.

CHARACTERS:
${charactersText}

LOCATIONS:
${locationsText}

STORY OUTLINE:
${outlineText}

Please respond with a JSON array of scene objects in this exact format:
[
  {
    "title": "Scene 1",
    "action": "What the characters are doing in this scene",
    "setting": "Where the scene takes place",
    "cameraAngle": "Camera angle (e.g., Wide Shot, Close-up, Medium Shot)",
    "lighting": "Lighting description (e.g., Natural daylight, Dramatic shadows, Soft ambient)",
    "colorPalette": "Color scheme (e.g., Warm tones, Cool blues, High contrast)",
    "emotionalTone": "Mood/emotion (e.g., Tense, Joyful, Mysterious, Romantic)",
    "soundDesign": "Audio elements (e.g., Background music, Sound effects, Dialogue)",
    "vfx": "Visual effects if any (e.g., None, Particle effects, Slow motion)",
    "transition": "How this scene transitions to the next (e.g., Fade to black, Cut, Dissolve)",
    "duration": 8,
    "notes": "Additional notes or context"
  },
  ...
]

Make sure each scene is visually distinct and advances the story. Focus on cinematic details that would help with video production.`;

  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 3000
  };

  const postChat = async (url: string) => {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  try {
    // Try proxy first
    let response = await postChat(proxyChatUrl);
    if (!response.ok) {
      // Fallback to direct endpoint on non-2xx
      response = await postChat(directChatUrl);
    }
    if (!response.ok) {
      if (response.status === 429) throw new Error('Quá giới hạn gọi API. Vui lòng thử lại sau.');
      if (response.status === 401) throw new Error('API key không hợp lệ.');
      throw new Error(`Lỗi OpenAI API: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Không nhận được phản hồi từ OpenAI');
    }

    // Extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Định dạng phản hồi không hợp lệ từ OpenAI');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validate the response structure
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Cấu trúc scenes không hợp lệ từ OpenAI');
    }

    console.log('✅ [OPENAI API] Scenes generated successfully');
    return result;
  } catch (error) {
    console.error('🔴 [OPENAI API] Scenes generation failed:', error);
    throw new Error(`Lỗi triển khai storyboard: ${parseApiError(error)}`);
  }
};


