/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Import GenerateVideosOperation to correctly type the API response.
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import type { Scene } from "../types";

const POLLING_INTERVAL_MS = 10000; // 10 seconds

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

export const generateVideoForScene = async (
    scene: Scene, 
    apiKey: string, 
    model: string, 
    onProgress: (message: string) => void
): Promise<string> => {
    console.log('🎬 [VEO API] Starting video generation for scene...', { 
        sceneTitle: scene.title, 
        model, 
        hasImage: !!scene.mainImage 
    });
    
    if (!apiKey) {
        console.error('🔴 [VEO API] API Key for Google is not configured');
        throw new Error("API Key for Google is not configured.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = scene.videoPrompt || "Animate this image.";
    const image = scene.mainImage ? {
        imageBytes: scene.mainImage.dataUrl.split(",")[1],
        mimeType: scene.mainImage.type,
    } : undefined;

    console.log('🔵 [VEO API] Video generation parameters:', { 
        prompt: prompt.substring(0, 100) + '...', 
        hasImage: !!image 
    });

    try {
        console.log('🔵 [VEO API] Making request to generate video...');
        // FIX: Add GenerateVideosOperation type to correctly type the API response.
        let operation: GenerateVideosOperation = await withRetry(() => ai.models.generateVideos({
            model: model,
            prompt,
            image, // This will be undefined if no image, which is correct
            config: {
                numberOfVideos: 1,
            },
        }));

        console.log('🟢 [VEO API] Video generation request submitted, operation started');

        const messages = [
          "Bắt đầu render...",
          "Đang xử lý các khung hình...",
          "Áp dụng hiệu ứng và màu sắc...",
          "Giai đoạn cuối, sắp hoàn thành...",
          "Đang hoàn tất quá trình...",
        ];
        let messageIndex = 0;
        
        onProgress(messages[messageIndex++]);
        console.log('🔄 [VEO API] Starting polling for video completion...');

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
            console.log('🔄 [VEO API] Polling operation status...');
            operation = await ai.operations.getVideosOperation({ operation: operation });
            if (!operation.done) {
                onProgress(messages[messageIndex % messages.length]);
                messageIndex++;
            }
        }

        console.log('🟢 [VEO API] Video generation completed');

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            console.error('🔴 [VEO API] No download link in response');
            onProgress("Lỗi: Không nhận được video.");
            throw new Error("API did not return a video download link.");
        }
        
        console.log('🔵 [VEO API] Download link received, starting download...');
        onProgress("Đang tải xuống video...");

        // The download link from the API needs the API key appended to be used
        const fullUrl = `${downloadLink}&key=${apiKey}`;

        // Fetch the video to ensure it's accessible and create a blob URL
        // This is safer as it avoids exposing the signed URL + key in the DOM
        const response = await fetch(fullUrl);
        if (!response.ok) {
            console.error('🔴 [VEO API] Failed to fetch video:', response.status);
            throw new Error(`Failed to fetch the generated video (status: ${response.status}).`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        console.log('✅ [VEO API] Video downloaded and blob URL created successfully');
        return blobUrl;

    } catch (error) {
        console.error("🔴 [VEO API] Error generating video:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during video generation.";
        onProgress(`Lỗi: ${errorMessage}`);
        throw new Error(errorMessage);
    }
};