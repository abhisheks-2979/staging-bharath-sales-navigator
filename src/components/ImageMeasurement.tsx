import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { X, Upload, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Point {
  x: number;
  y: number;
}

interface ImageMeasurementProps {
  onMeasurementComplete: (size: string, urls: string[]) => void;
  existingUrls?: string[];
}

export const ImageMeasurement = ({ onMeasurementComplete, existingUrls = [] }: ImageMeasurementProps) => {
  const [images, setImages] = useState<string[]>(existingUrls);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [knownLength, setKnownLength] = useState<string>("");
  const [measuredSize, setMeasuredSize] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (images.length > 0 && canvasRef.current && imageRef.current) {
      drawCanvas();
    }
  }, [images, currentImageIndex, points]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    // Draw points and line
    if (points.length > 0) {
      ctx.fillStyle = 'red';
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      if (points.length === 2) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.stroke();
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (points.length < 2) {
      setPoints([...points, { x, y }]);
    } else {
      setPoints([{ x, y }]);
    }
  };

  const calculateSize = () => {
    if (points.length !== 2 || !knownLength) {
      toast({ title: "Missing data", description: "Please mark two points and enter known length", variant: "destructive" });
      return;
    }

    const pixelDistance = Math.sqrt(
      Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
    );

    const realLength = parseFloat(knownLength);
    const scale = realLength / pixelDistance;

    const size = `${realLength.toFixed(2)} units (scale: ${scale.toFixed(4)} units/pixel)`;
    setMeasuredSize(size);
    onMeasurementComplete(size, images);
    toast({ title: "Size calculated", description: `Measured size: ${size}` });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('branding-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('branding-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setImages([...images, ...uploadedUrls]);
      toast({ title: "Photos uploaded", description: `${uploadedUrls.length} photo(s) added` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (currentImageIndex >= newImages.length) {
      setCurrentImageIndex(Math.max(0, newImages.length - 1));
    }
    setPoints([]);
    setMeasuredSize("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Measurement Photos'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {images.length > 0 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Step 1: Mark two points on the image</Label>
            <div className="flex gap-2">
              {images.map((_, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant={currentImageIndex === idx ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCurrentImageIndex(idx);
                    setPoints([]);
                  }}
                >
                  {idx + 1}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              ref={imageRef}
              src={images[currentImageIndex]}
              alt="Measurement"
              className="hidden"
              onLoad={drawCanvas}
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full border rounded cursor-crosshair"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => removeImage(currentImageIndex)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Step 2: Enter known length (ft/m)</Label>
              <Input
                type="number"
                value={knownLength}
                onChange={(e) => setKnownLength(e.target.value)}
                placeholder="e.g., 6"
              />
            </div>
            <div className="space-y-1">
              <Label>Step 3: Calculate</Label>
              <Button
                type="button"
                onClick={calculateSize}
                disabled={points.length !== 2 || !knownLength}
                className="w-full"
              >
                <Ruler className="h-4 w-4 mr-2" />
                Calculate Size
              </Button>
            </div>
          </div>

          {measuredSize && (
            <div className="p-3 bg-success/10 border border-success rounded text-sm">
              <strong>Measured Size:</strong> {measuredSize}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Click two points on the image that represent a known distance, then enter that distance to calculate the scale.
          </div>
        </Card>
      )}
    </div>
  );
};
