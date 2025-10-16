/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type { Scene } from "../types";
import { download } from "./utils";

export const exportShotText = (scenes: Scene[]) => {
    const script = scenes
      .map(s => s.videoPrompt) // The videoPrompt field contains the full formatted VEO prompt
      .join("\n\n===\n\n");
      
    const blob = new Blob([script], { type: "text/plain" });
    download(blob, `veo_script_${Date.now()}.txt`);
};