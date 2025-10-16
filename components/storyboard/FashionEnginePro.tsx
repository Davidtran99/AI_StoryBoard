/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Wand2, Loader2, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import type { UseStoryboardReturn } from '../../types';

interface FashionEngineProProps {
  storyboard: UseStoryboardReturn;
}

const creativeBriefTemplate = `[CREATIVE BRIEF]

- Model: [Mô tả chi tiết người mẫu: Giới tính, độ tuổi, vóc dáng, mái tóc, thần thái chung. VD: "Người mẫu nữ, 25 tuổi, cao 1m75, tóc đen dài thẳng, thần thái sang trọng và lạnh lùng."]

- Outfit: [Mô tả chi tiết trang phục và phụ kiện. VD: "Váy lụa dài màu xanh ngọc lục bảo, thiết kế hở lưng. Mang giày cao gót quai mảnh màu bạc và khuyên tai kim cương nhỏ."]

- Setting: [Mô tả bối cảnh. VD: "Sảnh của một nhà hát lớn theo lối kiến trúc cổ điển, có cầu thang đá cẩm thạch và đèn chùm pha lê, vào buổi tối."]

- Video Vibe: [Mô tả cảm xúc và phong cách chủ đạo. VD: "Sang trọng, Quyến rũ, Bí ẩn, Đậm chất điện ảnh."]`;

export const FashionEnginePro: React.FC<FashionEngineProProps> = ({ storyboard }) => {
  const [brief, setBrief] = useState(creativeBriefTemplate);
  const { generateBlueprintFromIdea, isGeneratingFromText } = storyboard;

  const handleGenerate = () => {
    if (!brief.trim() || isGeneratingFromText) return;
    generateBlueprintFromIdea(brief);
  };

  return (
    <Card className="border-2 border-dashed border-teal-500/40 bg-teal-950/20">
      <CardHeader>
        <div className="flex flex-wrap gap-4 justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-3">
                <div className="relative">
                    <Sparkles className="h-7 w-7 text-teal-300"/>
                    <div className="absolute inset-0 -z-10 bg-teal-500/40 blur-lg rounded-full"></div>
                </div>
                HỆ THỐNG SÁNG TẠO VIDEO THỜI TRANG – FASHION ENGINE PRO
            </CardTitle>
            <CardDescription>
              "Director in a Box" – AI sẽ đóng vai trò đạo diễn, tự động lựa chọn các cú máy, sắp xếp bố cục và tạo ra kịch bản 5 cảnh chuyên nghiệp chỉ từ một bản tóm tắt sáng tạo (Creative Brief).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="creative-brief">Bản Tóm Tắt Sáng Tạo (Creative Brief)</Label>
            <Textarea
              id="creative-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Điền thông tin chi tiết vào mẫu..."
              rows={10}
              disabled={isGeneratingFromText}
              className="bg-slate-900/60 font-mono text-sm leading-relaxed"
            />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerate} disabled={!brief.trim() || isGeneratingFromText} className="ml-auto">
          {isGeneratingFromText ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Tạo Storyboard Thời trang
        </Button>
      </CardFooter>
    </Card>
  );
};
