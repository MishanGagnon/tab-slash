"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

export function ImageUpload() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.image.generateUploadUrl);
  const createImageWithDraftReceipt = useMutation(api.receipt.createImageWithDraftReceipt);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setSelectedImage(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      
      let fileToUpload = selectedFile;
      
      // Compress if larger than 1MB
      if (selectedFile.size > 1024 * 1024) {
        setIsCompressing(true);
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          };
          fileToUpload = await imageCompression(selectedFile, options);
          console.log(`Compressed from ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB to ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (error) {
          console.error("Compression failed:", error);
          // Fallback to original file if compression fails
        } finally {
          setIsCompressing(false);
        }
      }

      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });

      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = await result.json();
      const receiptId = await createImageWithDraftReceipt({ storageId });
      
      clearImage();
      toast.success("Receipt uploaded successfully!");
      router.push(`/receipts/${receiptId}`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Upload Section */}
      <div className="flex flex-col gap-4">
        {!selectedImage ? (
          <div
            className={`border-2 border-dotted p-8 transition-all flex flex-col items-center justify-center min-h-[150px] cursor-pointer
              ${isDragging ? "bg-ink/5 border-ink" : "border-ink/20 hover:border-ink/40"}
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2 text-center opacity-50">
              <span className="text-2xl">+</span>
              <p className="text-xs uppercase font-bold tracking-widest">
                Drop Receipt or Click to Browse
              </p>
              <p className="text-[10px] uppercase tracking-tighter">
                MAX 10MB (PNG, JPG, WEBP)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/3] w-full border border-ink/10 bg-paper p-1">
              <Image
                src={selectedImage}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearImage}
                disabled={isUploading}
                className="border-2 border-ink py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-ink/5 disabled:opacity-50 transition-all"
              >
                [ Cancel ]
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="bg-ink text-paper py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isUploading ? (isCompressing ? "Compressing..." : "Processing...") : ">> Upload Receipt <<"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
