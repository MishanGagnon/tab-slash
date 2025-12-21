"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

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
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);

      // 1. Generate the upload URL
      const postUrl = await generateUploadUrl();

      // 2. POST the file to the URL
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = await result.json();

      // 3. Save the image record in the database
      await writeImage({ storageId });

      // 4. Reset state
      clearImage();
      alert("Bill uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: Id<"images">) => {
    if (confirm("Are you sure you want to delete this image?")) {
      try {
        await deleteImage({ id });
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete image.");
      }
    }
  };

  return (
    <div className="flex flex-col gap-12 w-full max-w-4xl mx-auto">
      {/* Upload Section */}
      <div className="flex flex-col gap-6 w-full">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-bold uppercase tracking-widest">
            *** Upload Bill ***
          </h2>
          <p className="text-xs uppercase opacity-70">
            Submit receipt for digital transcription
          </p>
        </div>

        <div
          className={`relative border-2 border-dotted p-8 transition-all duration-200 flex flex-col items-center justify-center min-h-[250px] cursor-pointer
            ${
              isDragging
                ? "bg-ink/5 border-ink"
                : "border-ink/30 hover:border-ink/60"
            }
            ${selectedImage ? "border-solid border-ink/20" : ""}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={!selectedImage ? triggerFileInput : undefined}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {selectedImage ? (
            <div className="relative w-full h-full flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] overflow-hidden border border-ink/20">
                <Image
                  src={selectedImage}
                  alt="Selected receipt"
                  fill
                  className="object-contain"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                disabled={isUploading}
                className="mt-4 text-xs font-bold uppercase underline hover:opacity-70 transition-opacity disabled:opacity-50"
              >
                [ REMOVE AND RETRY ]
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 border-2 border-ink/30 rounded-full flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 opacity-50"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-tight">
                  Drop Receipt Image Here
                </p>
                <p className="text-[10px] uppercase opacity-50">
                  PNG, JPG, WEBP (MAX 10MB)
                </p>
              </div>
              <button className="mt-4 border-2 border-ink px-4 py-1 text-xs font-bold uppercase tracking-tighter hover:bg-ink hover:text-paper transition-all">
                Select File
              </button>
            </div>
          )}
        </div>

        {selectedImage && (
          <button
            className="w-full bg-ink text-paper font-bold py-3 uppercase tracking-[0.2em] hover:opacity-90 transition-all disabled:opacity-50"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : ">> Process Receipt <<"}
          </button>
        )}
      </div>

      <div className="dotted-line"></div>

      {/* Viewing Section */}
      {images && images.length > 0 && (
        <div className="w-full">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 text-center">
            --- History ---
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {images.map((img) => (
              <Link
                key={img.id}
                href={`/receipts/${img.id}`}
                className="group relative aspect-[3/4] border border-ink/20 hover:border-ink transition-all cursor-pointer bg-paper p-1"
              >
                {img.url && (
                  <div className="relative w-full h-full border border-ink/10 overflow-hidden">
                    <Image
                      src={img.url}
                      alt="Uploaded bill"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                
                {/* View indicator */}
                <div className="absolute inset-0 flex items-center justify-center bg-paper/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] font-bold uppercase tracking-tighter border-2 border-ink px-2 py-1">
                    [ View ]
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(img.id as Id<"images">);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-paper border border-ink flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ink hover:text-paper z-10"
                  title="Delete"
                >
                  <span className="text-xs font-bold leading-none">×</span>
                </button>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
