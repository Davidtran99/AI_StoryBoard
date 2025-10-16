<!-- 3b830b0f-7386-4124-9c47-da38256ffed1 23c3716b-530b-4ec3-aafd-a1c612940836 -->
# Minimal, Non-Invasive OpenAI Prompt Integration

## Goals

- Add OpenAI as an optional provider for text-only tasks (generate blueprint/scenes/refine prompts).
- Do not alter existing image/video flows (Google/Aivideoauto stay intact).
- Keep changes minimal, localized, and reversible (feature toggle + clear logs).

## Non-Goals

- No change to video generation (Veo 2 / Aivideoauto) or image generation logic.
- No new global service type; OpenAI is a prompt-only option.

## Changes (minimal & localized)

### 1) Data model: extend ApiConfig (minimal)

- File: `types/index.ts`
- Add fields (text-only):
- `openaiApiKey: string`
- `openaiApiStatus: 'idle' | 'validating' | 'valid' | 'error'`
- `saveOpenaiApiKey(key: string): Promise<void>`
- `openaiTextModel: string` (default: `gpt-4o`)
- `setOpenaiTextModel(model: string): void`
- `openaiTextModels: {id: string; name: string}[]` (for dropdown options)
- `useOpenAIForPrompt: boolean`
- `setUseOpenAIForPrompt(on: boolean): void`

### 2) Config hook: add minimal state/persist + validation + model loading

- File: `hooks/useApiConfig.ts`
- Add the above states with `localStorage` keys:
- `openai_api_key`, `openai_text_model`, `use_openai_for_prompt`.
- `saveOpenaiApiKey`:
- validate key (light request) → set status/logs
- on success: call `openaiService.getTextModels(key)` to load models into `openaiTextModels`
- Ensure no interference with existing `service` selection.

### 3) Settings UI: OpenAI section with dynamic dropdown

- File: `components/settings/SettingsModal.tsx`
- Add a small card under API tab: "OpenAI (Prompt)":
- Input: API Key + "Lưu & Kiểm tra"
- Dropdown: Model (options from `apiConfig.openaiTextModels`, disabled if key invalid)
- Toggle: "Dùng OpenAI để tạo prompt"
- Do not alter existing service/model dropdowns for image/video.

### 4) Prompt services: add text-only service

- New file: `services/openaiService.ts`
- Methods:
- `getTextModels(apiKey)` → return curated list or API result
- `generateBlueprintFromIdea`
- `generateScenesFromBlueprint`
- Keep output shape identical to Gemini to avoid UI changes; handle 429 with clear error.

### 5) Conditional usage in storyboard (guarded & minimal)

- File: `hooks/useStoryboard.ts`
- In `generateBlueprintFromIdea` and `generateScenesFromBlueprint` only:
- If `useOpenAIForPrompt && openaiApiStatus==='valid' && openaiApiKey`
- use `openaiService.*`
- else use `geminiService.*`
- Add one-time-per-session 429 fallback flag; surface guidance via `onError`.
- Image/video branches untouched.

### 6) Logging (consistent)

- Use existing styles: `[CONFIG]`, `[OPENAI API]`, `[STORYBOARD]`.

## Testing (manual)

- Toggle OFF: Ensure Gemini path remains unchanged for blueprint/scenes.
- Toggle ON (valid key): OpenAI path returns expected JSON; scenes render.
- 429/invalid key: See banner/error; fallback once to Gemini; no loops.

## Rollback

- Flip the toggle OFF; nothing else affected. Remove the section in Settings to fully revert UI.

## Files Impact Summary

- Update: `types/index.ts`, `hooks/useApiConfig.ts`, `components/settings/SettingsModal.tsx`, `hooks/useStoryboard.ts`
- Add: `services/openaiService.ts`

### To-dos

- [ ] Extend ApiConfig with OpenAI prompt-only fields
- [ ] Add OpenAI state/persist/validate in useApiConfig
- [ ] Add OpenAI prompt section in SettingsModal
- [ ] Create services/openaiService.ts with text-only methods
- [ ] Use OpenAI for blueprint/scenes when toggle is on
- [ ] Manual test toggle on/off, invalid key, 429 fallback