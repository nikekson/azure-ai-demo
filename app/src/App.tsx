import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { fileToArrayBuffer } from "@/lib/util/array-buffer";
import { cn } from "@/lib/util/styling";
import { ApiDescribeResponse, ApiSasResponse } from "@/types/api";
import { BlockBlobClient } from "@azure/storage-blob";
import { Lightbulb, Upload, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";

const STORAGE_CONTAINER_NAME = import.meta.env.VITE_STORAGE_CONTAINER_NAME;

type AcceptType = {
  name: string;
  mime: string;
};

type Description = ApiDescribeResponse;

enum AppState {
  Idle,
  Uploading,
  Thinking,
}

export default function App() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [description, setDescription] = useState<Description | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filenameRef = useRef<string>(nanoid());
  const [appState, setAppState] = useState(AppState.Idle);

  const acceptTypes: AcceptType[] = [
    { name: 'JPEG', mime: 'image/jpeg' },
    { name: 'PNG', mime: 'image/png' },
  ];

  const getSasUrl = async (filename: string): Promise<string> => {
    try {
      const { url } = (await api.post('/api/sas', {}, {
        params: {
          file: filename,
          permission: 'w',
          container: STORAGE_CONTAINER_NAME,
          timerangeMins: 5,
        }
      })).data as ApiSasResponse;

      return url;
    } catch (error) {
      throw error;
    }
  };

  const upload = async (file: File) => {
    try {
      setAppState(AppState.Uploading);

      const sasUrl = await getSasUrl(filenameRef.current);

      const arrayBuffer = await fileToArrayBuffer(file);
      const blockBlobClient = new BlockBlobClient(sasUrl);
      const result = await blockBlobClient.uploadData(arrayBuffer);

      if (result.errorCode) {
        console.error(`upload failed: ${result.errorCode}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAppState(AppState.Idle);
    }
  };

  const describe = async () => {
    try {
      setAppState(AppState.Thinking);

      const captionData = (await api.post('/api/describe', {}, {
        params: {
          file: filenameRef.current,
          container: STORAGE_CONTAINER_NAME,
        }
      })).data as ApiDescribeResponse;

      setDescription(captionData);
    } catch (error) {
      console.error(error);
    } finally {
      setAppState(AppState.Idle);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      await upload(file);
      await describe();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setDescription(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Describe Image</h1>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                className={cn(
                  "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                  preview ? "bg-background" : "bg-muted/50",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={e => {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }}
              >
                {preview ? (
                  <div className="relative w-full max-w-[200px]">
                    <img src={preview} alt="Preview" className="rounded-md object-cover" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -right-2 -top-2 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="image-upload" className="flex cursor-pointer flex-col items-center justify-center gap-2">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-medium">Drag & drop or click to upload</p>
                      <p className="text-xs text-muted-foreground">Supported formats: {acceptTypes.map(({ name }) => name).join(", ")}</p>
                    </div>

                    <input
                      multiple={false}
                      id="image-upload"
                      type="file"
                      accept={acceptTypes.map(({ mime }) => mime).join(",")}
                      className="sr-only pointer-events-none"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      onClick={e => e.stopPropagation()}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="relative rounded-md bg-muted p-3 text-center">
            <p className="font-medium uppercase tracking-wider min-h-[1lh] flex flex-col">
              {appState === AppState.Idle && (
                description ? (
                  <>
                    <span>{description.caption}</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Confidence: {(description.confidence * 100).toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground mt-1">Upload an image to get a description</span>
                )
              )}

              {appState === AppState.Uploading && (
                <span className="flex justify-center gap-1 animate-pulse">
                  Uploading...
                </span>
              )}

              {appState === AppState.Thinking && (
                <span className="flex justify-center gap-1 animate-pulse">
                  <Lightbulb className="w-4 h-4 mt-1" />
                  Thinking...
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
