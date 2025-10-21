<!-- 0ef946e4-0458-4aff-b814-5df4d2326c85 d90dfaa2-baca-42ed-bc49-0b4422b9bc92 -->
# Kiểm tra & Sửa Logic Tạo Prompt và Fallback

## Vấn đề user báo cáo

1. **Prompt được tạo khi Higgsfield chưa kích hoạt** - Higgsfield không có API key hợp lệ nhưng vẫn tự động tạo prompt
2. **Fallback chưa đúng logic** - Cần đảm bảo:
   - Chỉ fallback khi có ≥ 2 API keys hợp lệ
   - Chỉ fallback sang service có API key hợp lệ
3. **OpenAI prompt generation** - Chỉ dùng OpenAI viết prompt khi có API key hợp lệ, nếu không thì fallback

## Phân tích code hiện tại

### Nơi tạo prompt tự động:
- `generateImagePromptForScene()` (dòng 356-406)
- `generateVideoPromptForScene()` (dòng 258-354)
- Cả 2 hàm này **KHÔNG** check API key, chỉ generate prompt dựa vào scene data

### Vấn đề phát hiện:
1. **Hàm `generateImagePromptForScene` và `generateVideoPromptForScene`**: 
   - Tạo prompt thuần túy, **KHÔNG gọi API**
   - Chỉ xây dựng chuỗi text từ scene data
   - → Không cần API key để chạy
   
2. **Nơi thực sự gọi API để enhance prompt**:
   - `generateBlueprintFromText()` (dòng 780-877): Gọi OpenAI/Gemini/Higgsfield để tạo blueprint
   - `generateScenesFromBlueprint()`: Gọi OpenAI/Gemini/Higgsfield để tạo scenes
   - Đã có check `openaiReady`, `googleReady`, `higgsfieldReady`

3. **Fallback logic hiện tại** (dòng 809-851):
   - ✅ Đã check service ready trước khi fallback
   - ✅ Chỉ add provider vào fallbackProviders nếu `xxxReady === true`
   - → Logic này **ĐÚNG**

## Kết luận

**Prompt tự tạo không phải lỗi** - Đây là tính năng:
- `generateImagePromptForScene` và `generateVideoPromptForScene` tạo prompt **LOCAL**, không gọi API
- Chỉ dùng dữ liệu scene (action, characters, locations, lighting, v.v.) để build chuỗi text
- Không cần API key vì không gọi service nào

**Logic fallback ĐÃ ĐÚNG**:
- Blueprint generation: Chỉ fallback sang service có API key hợp lệ
- Scene generation: Chỉ fallback sang service có API key hợp lệ
- Image/Video generation: Đã check `xxxReady` trước khi gọi

## Hành động

### Nếu user muốn DISABLE tự tạo prompt khi không có OpenAI:
Cần sửa logic trong `updateScene()` (dòng 436-442):
```typescript
// Hiện tại: Tự động generate prompt
if (promptRelevantChange && !data.hasOwnProperty('imagePrompt')) {
  updatedScene.imagePrompt = generateImagePromptForScene(updatedScene, characters, locations);
}

// Đề xuất: Chỉ auto-generate nếu autoGeneratePrompt = true VÀ có service sẵn sàng
const hasAnyService = openaiReady || googleReady || higgsfieldReady;
if (autoGeneratePrompt && hasAnyService && promptRelevantChange && !data.hasOwnProperty('imagePrompt')) {
  updatedScene.imagePrompt = generateImagePromptForScene(updatedScene, characters, locations);
}
```

## Câu hỏi cần user trả lời

1. Bạn có muốn **TẮT** tính năng tự động tạo prompt khi không có API key nào hợp lệ không?
   - a) Có - Chỉ tự tạo prompt khi có ít nhất 1 API key hợp lệ
   - b) Không - Giữ nguyên (prompt vẫn tự tạo local, không cần API)

2. Bạn nói "Higgsfield chưa kích hoạt mà vẫn viết được prompt" - Bạn có thể chụp màn hình hoặc mô tả cụ thể hơn không?
   - Prompt đó được tạo ở đâu? (Blueprint generation / Scene generation / Image prompt field)
   - Higgsfield API status hiện tại là gì? (idle / error / validating)


### To-dos

- [ ] Cập nhật Select.tsx: scroll dọc + ngang nội bộ cho danh sách dài
- [ ] Kiểm thử dropdown Higgsfield và các dropdown khác không tràn ngang