"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function ImageUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.image.generateUploadUrl);
  const writeImage = useMutation(api.image.writeImage);
  const deleteImage = useMutation(api.image.deleteImage);
  const images = useQuery(api.image.requestImagesUrls);

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
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = await result.json();
      await writeImage({ storageId });
      
      clearImage();
      toast.success("Receipt uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: Id<"images">) => {
    try {
      await deleteImage({ id });
      toast.success("Receipt deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete receipt");
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Upload Section */}
      <div className="flex flex-col gap-4">
        {!selectedImage ? (
          <div
            className={`border-2 border-dotted p-12 transition-all flex flex-col items-center justify-center min-h-[200px] cursor-pointer
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
                {isUploading ? "Processing..." : ">> Upload Receipt <<"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="dotted-line"></div>

      {/* History Section */}
      {images && images.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-center opacity-40">
            --- Past Transactions ---
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img) => (
              <div key={img.id} className="group relative aspect-[3/4] border border-ink/10 hover:border-ink/30 transition-all bg-paper p-1">
                <Link href={`/receipts/${img.id}`} className="block relative w-full h-full">
                  {img.url && (
                    <Image
                      src={img.url}
                      alt="Uploaded bill"
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-paper/60 backdrop-blur-[1px]">
                    <span className="text-[10px] font-bold uppercase border-2 border-ink px-3 py-1 bg-paper shadow-sm">
                      View Detail
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(img.id as Id<"images">);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-paper border border-ink flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-ink hover:text-paper z-20"
                >
                  <span className="text-xs font-bold leading-none">×</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
