"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cropImageToFile } from "@/lib/image-crop";

/** Matches the homepage carousel's main slide box (~1284 x 220 at desktop). */
export const BANNER_CROP_ASPECT = 1284 / 220;

// Below 1 shrinks the photo smaller than the frame (letterboxed) so a tall/square source
// can still be fit in without cropping any of it; above 1 zooms in to fill the frame tighter.
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

/**
 * WhatsApp-style "pick the area of the photo you want" step: shown right after the admin
 * selects a file, before it's ever uploaded. Drag/pinch to reposition within a fixed
 * banner-shaped frame, then confirm to produce the final cropped file.
 */
export function BannerImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  fileName,
  mimeType,
  onCropped,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  fileName: string;
  mimeType: string;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await cropImageToFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      onCropped(file);
      onOpenChange(false);
    } finally {
      setSaving(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Choose the visible area</DialogTitle>
          <DialogDescription>Drag to reposition, use the slider to zoom.</DialogDescription>
        </DialogHeader>

        <div className="relative h-[360px] w-full bg-black">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={BANNER_CROP_ASPECT}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-6 py-4">
          <span className="text-muted-foreground text-xs font-medium">Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="accent-primary h-1.5 w-full cursor-pointer"
          />
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
            {saving ? "Applying…" : "Use this crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
