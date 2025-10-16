/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type { UploadedImage } from '../types';

/**
 * Reads a list of files and converts them to data URLs.
 * @param files The FileList object from a file input.
 * @returns A promise that resolves to an array of UploadedImage objects.
 */
export const readFilesAsDataUrls = async (files: FileList): Promise<UploadedImage[]> => {
  const promises = Array.from(files).map(
    (f) =>
      new Promise<UploadedImage>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          name: f.name,
          type: f.type,
          size: f.size,
          dataUrl: reader.result as string,
        });
        reader.onerror = reject;
        reader.readAsDataURL(f);
      })
  );
  return Promise.all(promises);
};

const MAX_DIMENSION = 1024;
const COMPRESSION_QUALITY = 0.85;

/**
 * Compresses an image using canvas. Resizes if larger than MAX_DIMENSION and converts to JPEG.
 * @param image The original UploadedImage object.
 * @returns A promise that resolves to a new, compressed UploadedImage object.
 */
export const compressImage = async (image: UploadedImage): Promise<UploadedImage> => {
  // Don't compress non-image files or GIFs (to preserve animation)
  if (!image.type.startsWith('image/') || image.type === 'image/gif') {
    return image;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original if context fails
        console.error("Could not get canvas context for image compression.");
        return resolve(image);
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', COMPRESSION_QUALITY);
      
      const newImage: UploadedImage = {
        name: image.name.replace(/\.[^/.]+$/, "") + ".jpeg",
        type: 'image/jpeg',
        // The size is not accurate, but it's better than nothing.
        // The actual byte size would require converting base64 to blob.
        size: dataUrl.length,
        dataUrl,
      };
      resolve(newImage);
    };
    img.onerror = (err) => {
      console.error("Failed to load image for compression, returning original:", err);
      // Fallback to original image if there's an error loading it
      resolve(image);
    };
    img.src = image.dataUrl;
  });
};
