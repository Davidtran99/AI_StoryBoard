/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { MapPin, ImageUp, Wand2, Loader2, PlusSquare, Trash2, Pencil, RefreshCcw, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import type { Location, UploadedImage, Aspect } from '../../types';
import { ConfirmationModal } from '../ui/ConfirmationModal';

interface LocationManagerProps {
  locations: Location[];
  onAddLocation: () => void;
  onImageUpload: (index: number) => void;
  onUpdate: (index: number, data: Partial<Location>) => void;
  onRemoveLocation: (index: number) => void;
  onGenerateImage: (index: number) => void;
  onEditImage: (index: number) => void;
  isSceneBusy: (id: string) => boolean;
  onOpenPreview: (image: UploadedImage) => void;
  aspectRatio: Aspect;
  isInitialLoading: boolean;
  t: (key: any, replacements?: any) => string;
}

const LocationListItem = React.memo<{
  location: Location;
  isSelected: boolean;
  onClick: () => void;
  t: (key: any) => string;
}>(({ location, isSelected, onClick, t }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left p-2 rounded-lg transition-all duration-200 flex gap-3 items-center relative overflow-hidden ${isSelected ? 'bg-teal-900/50' : 'hover:bg-slate-800/70'}`}
  >
    {isSelected && <div className="absolute left-0 top-0 h-full w-1 bg-teal-400 rounded-r-full shadow-[0_0_8px_theme('colors.teal.400')]"></div>}
    <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 rounded-md flex items-center justify-center overflow-hidden">
      {location.image ? (
        <img src={location.image.dataUrl} alt={location.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-amber-950/50">
            <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
      )}
    </div>
    <div className="flex-grow overflow-hidden">
      <p className="font-semibold text-slate-200 truncate">{location.name}</p>
      <p className={`text-sm ${location.status === 'suggested' ? 'text-amber-400' : 'text-slate-400'}`}>
        {location.status === 'suggested' ? t('statusNeedsReference') : t('statusDefined')}
      </p>
    </div>
  </button>
));

interface LocationDetailViewProps {
  location: Location;
  index: number;
  onUpdate: (index: number, data: Partial<Location>) => void;
  onGenerateImage: (index: number) => void;
  onImageUpload: (index: number) => void;
  onEditImage: (index: number) => void;
  onDeleteRequest: (index: number) => void;
  onOpenPreview: (image: UploadedImage) => void;
  isBusy: boolean;
  aspectRatio: Aspect;
  t: (key: any, replacements?: any) => string;
}

const LocationDetailView = React.memo<LocationDetailViewProps>(({
  location, index, onUpdate, onGenerateImage, onImageUpload, 
  onEditImage, onDeleteRequest, onOpenPreview, isBusy, aspectRatio, t
}) => {
  return (
    <div className="p-4 bg-slate-800/30 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
          <h5 className="text-xl font-bold text-slate-100">{location.name}</h5>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-400" onClick={() => onDeleteRequest(index)} title={t('deleteEntityTooltip', { entity: t('location') })}>
              <Trash2 className="h-4 w-4" />
          </Button>
      </div>

      <div className="flex-grow space-y-4">
        {location.image ? (
            <div className="space-y-2 max-w-sm mx-auto">
                <div
                    className="relative w-full bg-slate-700/50 rounded-lg group overflow-hidden"
                    style={{ aspectRatio: aspectRatio.replace(':', ' / ') }}
                >
                    <img src={location.image!.dataUrl} alt={location.name} className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
                    <button type="button" onClick={() => onOpenPreview(location.image!)} className="absolute inset-0" aria-label={`Xem ảnh ${location.name}`}></button>
                    {isBusy && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg z-10">
                            <Loader2 className="h-6 w-6 text-teal-400 animate-spin" />
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" onClick={() => onGenerateImage(index)} variant="secondary" title={t('regenerateImageTooltip')} disabled={isBusy}>
                        <RefreshCcw className="h-4 w-4 mr-2"/> {t('regenerateImage')}
                    </Button>
                    <Button size="sm" onClick={() => onImageUpload(index)} variant="secondary" title={t('uploadImageTooltip')} disabled={isBusy}>
                        <ImageUp className="h-4 w-4 mr-2"/> {t('uploadImage')}
                    </Button>
                    <Button size="sm" onClick={() => onEditImage(index)} variant="secondary" title={t('editImageWithAITooltip')} disabled={isBusy}>
                        <Pencil className="h-4 w-4 mr-2"/> {t('editImageWithAI')}
                    </Button>
                </div>
            </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-900/50 border border-dashed border-slate-600 space-y-3">
              <Textarea
                value={location.description}
                onChange={(e) => onUpdate(index, { description: e.target.value })}
                className="text-sm !h-24 bg-slate-800/50"
                rows={5}
                placeholder={t('locationDescriptionPlaceholder')}
              />
              <div className="flex gap-2">
                  <Button size="sm" onClick={() => onGenerateImage(index)} className="w-full" disabled={isBusy || !location.description}>
                      {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                      {t('generateImage')}
                  </Button>
                  <Button size="sm" onClick={() => onImageUpload(index)} variant="outline" className="w-full" disabled={isBusy}>
                      <ImageUp className="h-4 w-4 mr-2" /> {t('uploadImage')}
                  </Button>
              </div>
          </div>
        )}
        <div>
          <Label htmlFor={`loc-name-${location.id}`}>{t('locationNameLabel')}</Label>
          <Input
            id={`loc-name-${location.id}`}
            value={location.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            className="text-base"
            placeholder={t('locationNameLabel')}
          />
        </div>
        {location.image && (
          <div>
            <Label htmlFor={`loc-desc-${location.id}`}>{t('descriptionLabel')}</Label>
            <Textarea
              id={`loc-desc-${location.id}`}
              value={location.description}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              className="text-sm bg-slate-800/50"
              rows={4}
              placeholder={t('locationDescriptionPlaceholder')}
            />
          </div>
        )}
      </div>
    </div>
  );
});

const LocationManagerSkeleton = () => (
    <Card>
        <CardHeader>
             <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <CardTitle className="flex items-center gap-2"><MapPin className="h-6 w-6 text-teal-400"/>Quản lý Bối cảnh</CardTitle>
                    <CardDescription>Tạo hoặc tải ảnh tham chiếu để giữ sự nhất quán cho bối cảnh.</CardDescription>
                </div>
                <div className="h-9 w-36 bg-slate-800/80 rounded-md animate-pulse"></div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[300px] animate-pulse">
                <div className="md:col-span-1 border-r border-slate-700/50 pr-4 h-[300px] overflow-y-auto space-y-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-full p-2 flex gap-3 items-center">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-700/80 rounded-md"></div>
                    <div className="flex-grow space-y-2">
                        <div className="h-4 w-3/4 bg-slate-700/80 rounded"></div>
                        <div className="h-3 w-1/2 bg-slate-700/80 rounded"></div>
                    </div>
                    </div>
                ))}
                </div>
                <div className="md:col-span-2 p-4 space-y-4">
                    <div className="h-6 w-1/2 bg-slate-700/80 rounded"></div>
                    <div className="w-full max-w-sm mx-auto aspect-[16/9] bg-slate-700/80 rounded-lg"></div>
                    <div className="h-5 w-1/4 bg-slate-700/80 rounded"></div>
                    <div className="h-10 w-full bg-slate-700/80 rounded-md"></div>
                </div>
            </div>
        </CardContent>
    </Card>
);

export const LocationManager: React.FC<LocationManagerProps> = ({ 
  locations, onAddLocation, onRemoveLocation, isInitialLoading, t, ...props
}) => {
  const [selectedLocIndex, setSelectedLocIndex] = useState<number | null>(null);
  const [deletingLocIndex, setDeletingLocIndex] = useState<number | null>(null);

  useEffect(() => {
    if (locations.length > 0 && selectedLocIndex === null) {
      setSelectedLocIndex(0);
    }
    if (selectedLocIndex !== null && selectedLocIndex >= locations.length) {
      setSelectedLocIndex(locations.length > 0 ? locations.length - 1 : null);
    }
  }, [locations, selectedLocIndex]);

  const handleConfirmDeleteLoc = () => {
    if (deletingLocIndex !== null) {
      onRemoveLocation(deletingLocIndex);
      setDeletingLocIndex(null);
    }
  };
  
  if (isInitialLoading && locations.length === 0) {
      return <LocationManagerSkeleton />;
  }

  const selectedLocation = selectedLocIndex !== null ? locations[selectedLocIndex] : null;

  return (
    <>
      <ConfirmationModal
        isOpen={deletingLocIndex !== null}
        onClose={() => setDeletingLocIndex(null)}
        onConfirm={handleConfirmDeleteLoc}
        title={t('confirmDeleteTitle', { name: deletingLocIndex !== null ? locations[deletingLocIndex]?.name : '' })}
        message={t('confirmDeleteLocationMessage')}
        t={t}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                  <CardTitle className="flex items-center gap-2"><MapPin className="h-6 w-6 text-teal-400"/>{t('locationManagerTitle')}</CardTitle>
                  <CardDescription>{t('locationManagerDescription')}</CardDescription>
              </div>
              <Button onClick={onAddLocation} variant="secondary" size="sm" title={t('addLocationTooltip')}>
                  <PlusSquare className="h-4 w-4 mr-2"/>{t('addLocation')}
              </Button>
          </div>
        </CardHeader>
        <CardContent>
          {locations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[300px]">
              <div className="md:col-span-1 border-r border-slate-700/50 pr-4 h-[300px] overflow-y-auto space-y-2">
                {locations.map((loc, i) => (
                  <LocationListItem
                    key={loc.id}
                    location={loc}
                    isSelected={selectedLocIndex === i}
                    onClick={() => setSelectedLocIndex(i)}
                    t={t}
                  />
                ))}
              </div>
              <div className="md:col-span-2">
                {selectedLocation && selectedLocIndex !== null ? (
                  <LocationDetailView
                    location={selectedLocation}
                    index={selectedLocIndex}
                    isBusy={props.isSceneBusy(selectedLocation.id)}
                    onDeleteRequest={setDeletingLocIndex}
                    t={t}
                    {...props}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                      <p>{t('selectEntityToViewDetails', { entity: t('location') })}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-[300px] flex items-center justify-center text-center border-2 border-dashed border-slate-700/80 rounded-xl bg-transparent text-slate-500">
                <div>
                  <p>{t('noLocationsYet')}</p>
                  <p className="text-base mt-1">{t('noEntitiesHint', { entity: t('location') + 's' })}</p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
