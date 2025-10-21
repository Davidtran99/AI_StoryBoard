# Báo cáo nâng cấp dự án AI Video Storyboard

Ngày: 2025-10-17
Phiên bản: OpenAI/Gemini/Aivideoauto + UI/UX + Fallback

## Tóm tắt điều hành
- Bổ sung OpenAI (Prompt) an toàn qua proxy dev, tải model động, và fallback thông minh với Gemini.
- Tối ưu tạo ảnh/video: chọn provider duy nhất khi dùng OpenAI; video hỗ trợ fallback Veo ↔ Aivideoauto kèm backoff 429, toast cảnh báo.
- Nâng cao UX: toast chuyên nghiệp, lỗi thân thiện, khóa dropdown khi thiếu API key, và load danh sách model Gemini theo API key người dùng.

## Danh mục nâng cấp chi tiết

### 1) OpenAI (Prompt) + Proxy dev
- Thêm proxy Vite:
  - `GET /api/openai/models` → `https://api.openai.com/v1/models`
  - `POST /api/openai/chat` → `https://api.openai.com/v1/chat/completions`
- Nhận `Authorization: Bearer <key>` từ FE; phản hồi nguyên trạng 2xx/4xx/5xx.
- FE gọi proxy trước, fallback gọi thẳng khi cần.

Files: `vite.config.ts`, `services/openaiService.ts`

### 2) Lựa chọn provider khi dùng OpenAI
- UI: selector “Dịch vụ tạo ảnh & Video khi dùng OpenAI” (Aivideoauto/Google). Ẩn các dropdown model khi OpenAI.
- BE: ảnh/video route theo provider đã chọn.

Files: `components/settings/SettingsModal.tsx`, `hooks/useStoryboard.ts`

### 3) Fallback thông minh
- Text (blueprint/scenes): OpenAI ↔ Gemini, kèm toast cảnh báo.
- Video: fallback hai chiều Veo ↔ Aivideoauto, thêm backoff nhẹ cho 429.
- Lỗi thân thiện cho video và text.

Files: `hooks/useStoryboard.ts`, `services/veoService.ts`, `services/aivideoautoService.ts`

### 4) Toast UI chuyên nghiệp
- `ToastHost`: fade/slide, auto-hide ~3.5s, tối đa 3 toast; icon theo trạng thái; nền tối; nút đóng.
- API: `window.toast(message, type)`.

Files: `components/ui/ToastHost.tsx`, `App.tsx`

### 5) Khóa dropdown khi thiếu key + copy rõ ràng
- Khi dịch vụ chưa có key/token hợp lệ → disable dropdown, hiển thị “Vui lòng nhập API Key để sử dụng.”
- Kích hoạt khi có key hợp lệ.

Files: `components/settings/SettingsModal.tsx`, `hooks/useApiConfig.ts`

### 6) Tải danh sách model Gemini theo API key
- Gọi ListModels (nếu khả dụng) → lọc:
  - Ảnh: id chứa `image|imagen|flash-image`
  - Video: id chứa `veo` (tự động hỗ trợ VEO 3 nếu có)
- Lưu `googleImageModels`, `googleVideoModels` và auto-reset model nếu model cũ không còn.

Files: `services/geminiService.ts`, `hooks/useApiConfig.ts`, `components/settings/SettingsModal.tsx`, `types/index.ts`

### 7) Xử lý lỗi thân thiện
- Mapping ngắn gọn: 429 (quá giới hạn), 401/403 (key không hợp lệ), 404/400 (model không khả dụng), credits (không đủ), network (mạng lỗi).
- Không hiển thị JSON thô trên UI.

Files: `hooks/useStoryboard.ts`, `services/*Service.ts`

## Hướng dẫn kiểm thử nhanh
1. Proxy OpenAI  
   DevTools → Console: `fetch('/api/openai/models',{headers:{Authorization:'Bearer sk-...'}})` → 200 JSON.
2. OpenAI Prompt + Provider  
   Dịch vụ AI = OpenAI, nhập OpenAI key → chọn provider (Aivideoauto/Google). Tạo blueprint → nếu OpenAI 429, toast fallback sang Gemini.
3. Video fallback  
   Cố tình gây lỗi ở provider chính (model Veo không hợp lệ/credits Aivideoauto) → thấy toast chuyển provider và video hoàn tất.
4. Khóa dropdown khi thiếu key  
   Xóa Google key → dropdown ảnh/video của Google hiển thị “Vui lòng nhập API Key để sử dụng.”
5. Model Gemini động  
   Với key có billing/được cấp quyền: dropdown video hiển thị VEO 2/3 nếu `ListModels` trả về; ảnh hiển thị các model hợp lệ.

## Gợi ý commit message
- feat(settings): dynamic Gemini model list per API key; disable selects without valid keys
- feat(storyboard): video fallback Veo↔Aivideoauto with backoff + toast; friendly errors
- feat(ui): add ToastHost; polish Settings gating/messages

## Kế hoạch tiếp theo (UI flow & transitions)
- Điều hướng tab: fade/slide + auto-scroll.
- Scene card: skeleton/min-height, animate mount/unmount.
- Modal: backdrop fade + scale-in, trap focus.
- Timeline: expand/collapse mượt; lazy render danh sách dài.

## Phụ lục – Files thay đổi chính
- `vite.config.ts`
- `services/openaiService.ts`
- `hooks/useStoryboard.ts`
- `services/veoService.ts`, `services/aivideoautoService.ts`
- `components/ui/ToastHost.tsx`, `App.tsx`
- `components/settings/SettingsModal.tsx`, `hooks/useApiConfig.ts`, `types/index.ts`

---
Hướng dẫn xuất PDF (Pandoc):

```bash
# Cài đặt pandoc (macOS dùng Homebrew)
brew install pandoc

# Xuất PDF (cần có một engine như BasicTeX/TeXLive để xuất đẹp)
pandoc REPORT.md -o REPORT.pdf --from gfm --pdf-engine=xelatex -V mainfont="Helvetica Neue" -V geometry:margin=1in
```
