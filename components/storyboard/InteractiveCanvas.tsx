/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { Save, Wand2, Camera, FileText, Trash2, Loader2, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
// FIX: Imported the 'Annotation' type, which was missing and causing errors.
import type { Scene, Annotation, UseStoryboardReturn } from '../../types';
import { uid } from '../../lib/utils';

interface InteractiveCanvasProps {
  scene: Scene;
  index: number;
  onSave: (annotations: Annotation[]) => void;
  storyboard: UseStoryboardReturn;
}

const AnnotationIcon = ({ type }: { type: Annotation['type'] }) => {
    const commonClass = "h-4 w-4";
    switch(type) {
        case 'pose': return <Wand2 className={`${commonClass} text-amber-400`} />;
        case 'camera': return <Camera className={`${commonClass} text-cyan-400`} />;
        case 'note':
        default: return <FileText className={`${commonClass} text-slate-400`} />;
    }
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({ scene, index, onSave, storyboard }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // FIX: Changed 'scene.sketchAnnotations' to correctly access the new property.
    setAnnotations(scene.sketchAnnotations || []);
    setHasChanges(false);
  }, [scene]);

  // FIX: Destructured the newly added 'generateSketchForScene' method from the storyboard hook.
  const { isSceneBusy, generateSketchForScene } = storyboard;
  const isBusy = isSceneBusy(scene.id);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: uid(), text: '', position: { x, y }, type: 'note',
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setHasChanges(true);
  };

  const updateAnnotation = (id: string, data: Partial<Omit<Annotation, 'id'>>) => {
    setAnnotations(prev => prev.map(ann => (ann.id === id ? { ...ann, ...data } : ann)));
    setHasChanges(true);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    setHasChanges(true);
  };
  
  const handleSave = () => {
    onSave(annotations);
    setHasChanges(false);
  };
  
  // FIX: Changed 'scene.sketchImage' check to correctly access the new property.
  if (!scene.sketchImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-lg text-slate-400 p-8 text-center">
        <ImageIcon className="h-12 w-12 mb-4" />
        <h3 className="text-xl font-semibold text-slate-200">Chưa có phác thảo</h3>
        <p className="max-w-md mx-auto mt-2 mb-6">Tạo phác thảo để bắt đầu thêm ghi chú đạo diễn. Phác thảo sẽ được tạo dựa trên mô tả của cảnh.</p>
        <Button onClick={() => generateSketchForScene(index)} disabled={isBusy}>
          {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Tạo phác thảo
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-xl text-slate-100">{scene.title}</h3>
          <p className="text-base text-slate-400">Nhấp vào ảnh để thêm ghi chú.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            onClick={() => generateSketchForScene(index)} 
            disabled={isBusy}
            title="Tạo lại phác thảo"
          >
            {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Tạo lại
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {hasChanges ? "Lưu Ghi chú" : "Đã lưu"}
          </Button>
        </div>
      </div>

      <div
        ref={imageContainerRef}
        onClick={handleContainerClick}
        className="relative w-full flex-grow bg-slate-900 rounded-lg overflow-hidden cursor-crosshair"
      >
        <img
          // FIX: Changed 'scene.sketchImage' to correctly access the new property.
          src={scene.sketchImage.dataUrl}
          alt="Phác thảo"
          className="w-full h-full object-contain pointer-events-none select-none"
        />
        {annotations.map(ann => (
          <div
            key={ann.id}
            className="absolute p-2 rounded-lg bg-slate-950/80 backdrop-blur-sm border border-slate-700 shadow-2xl shadow-black/50"
            style={{
              left: `${ann.position.x}%`,
              top: `${ann.position.y}%`,
              transform: 'translate(-50%, -10px)',
              minWidth: '220px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/50 mb-1.5">
               <div className="flex items-center gap-2">
                    <button onClick={() => updateAnnotation(ann.id, {type: 'note'})} title="Ghi chú chung"><FileText className={`h-4 w-4 ${ann.type === 'note' ? 'text-slate-300' : 'text-slate-600 hover:text-slate-400'}`} /></button>
                    <button onClick={() => updateAnnotation(ann.id, {type: 'pose'})} title="Hành động/Tạo dáng"><Wand2 className={`h-4 w-4 ${ann.type === 'pose' ? 'text-amber-400' : 'text-slate-600 hover:text-amber-500'}`} /></button>
                    <button onClick={() => updateAnnotation(ann.id, {type: 'camera'})} title="Góc máy"><Camera className={`h-4 w-4 ${ann.type === 'camera' ? 'text-cyan-400' : 'text-slate-600 hover:text-cyan-500'}`} /></button>
               </div>
               <button onClick={() => removeAnnotation(ann.id)} title="Xóa ghi chú"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500 transition-colors" /></button>
            </div>
            <Textarea
              value={ann.text}
              onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
              placeholder={`Ghi chú về ${ann.type}...`}
              rows={2}
              className="bg-transparent text-sm border-0 focus-visible:ring-0 p-0 resize-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
};