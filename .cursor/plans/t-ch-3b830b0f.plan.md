<!-- 3b830b0f-7386-4124-9c47-da38256ffed1 903dc155-adcf-4133-9887-a8affbb3795d -->
# Kế hoạch tích hợp Google Veo 2 API

## Mục tiêu

Cho phép app tạo video bằng Google Veo 2 trực tiếp từ Google AI Studio API, song song với Aivideoauto hiện tại.

## Các bước thực hiện

### 1. Thêm state quản lý video model cho Google

**File: `hooks/useApiConfig.ts`**

- Thêm state `googleVideoModel` (mặc định: `'veo-2.0-generate-001'`)
- Thêm setter `setGoogleVideoModel`
- Export trong return của hook

### 2. Cập nhật UI Settings để chọn video model

**File: `components/settings/SettingsModal.tsx`**

- Dòng 159-171: Thay thế phần hiển thị "videoNotSupportedByGoogle"
- Thêm dropdown Select cho Google video model với các options:
- `veo-2.0-generate-001` (Veo 2 - Nhanh, 8 giây)
- Có thể thêm các model khác sau

### 3. Sửa logic tạo video trong useStoryboard

**File: `hooks/useStoryboard.ts`**

- Dòng 938-945: Xóa đoạn code chặn Google
- Thêm nhánh xử lý cho `apiConfig.service === 'google'`:
- Import `veoService`
- Gọi `veoService.generateVideoForScene()` với:
- scene (chứa videoPrompt và mainImage)
- apiConfig.googleApiKey
- apiConfig.googleVideoModel
- callback onProgress để cập nhật videoStatusMessage
- Xử lý kết quả trả về (blob URL)
- Set videoStatus = 'done' và videoUrl
- Giữ nguyên logic Aivideoauto cho nhánh else

### 4. Cập nhật types nếu cần

**File: `types/index.ts`**

- Thêm `googleVideoModel: string` vào interface `ApiConfig` (dòng 103)
- Thêm `setGoogleVideoModel: (model: string) => void`

### 5. Test flow

- Nhập API key: `AIzaSyActTSjCzVNmUM7JD4sTmzbda7Eyp_xxRc`
- Chọn service = Google
- Chọn video model = veo-2.0-generate-001
- Tạo video cho một scene
- Kiểm tra poll progress và kết quả

## Chi tiết kỹ thuật

### veoService.ts đã có sẵn

File `services/veoService.ts` đã implement đầy đủ:

- Hàm `generateVideoForScene()` với polling
- Xử lý retry và error
- Tải video về dạng blob URL
- Chỉ cần import và gọi

### Flow tạo video với Veo 2

1. User bấm "Tạo video" → `generateVideoForScene(index)`
2. Set videoStatus = 'generating'
3. Gọi `veoService.generateVideoForScene()`:

- Gửi request với videoPrompt + mainImage
- Poll operation mỗi 10s
- Cập nhật progress message
- Tải video về khi done

4. Set videoStatus = 'done', videoUrl = blob URL
5. UI hiển thị video preview

### Điểm khác biệt Veo 2 vs Aivideoauto

- **Veo 2**: Polling qua Google operations API, trả blob URL ngay
- **Aivideoauto**: Polling qua taskId, trả download_url, có queue_position
- Cả hai đều cập nhật videoStatusMessage để hiển thị progress

### To-dos

- [ ] Thêm state googleVideoModel và setter vào useApiConfig
- [ ] Cập nhật SettingsModal để hiển thị chọn video model cho Google
- [ ] Sửa generateVideoForScene trong useStoryboard để gọi veoService khi service=google
- [ ] Thêm googleVideoModel vào ApiConfig interface