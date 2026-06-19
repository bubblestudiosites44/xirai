import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 3;
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_DATA_URL_LENGTH = 1_200_000;
const MAX_TOTAL_DATA_URL_LENGTH = 2_800_000;
const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.72;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.decoding = "async";
    image.src = src;
  });

const compressImageFile = async (file) => {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const scale = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("Image compression is unavailable in this browser.");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
};

export default function ChatInput({ onSend, isLoading, isLimited = false }) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [value]);

  const handleFiles = async (event) => {
    const selected = Array.from(event.target.files || []);
    setFileError("");

    const remainingSlots = MAX_IMAGES - attachments.length;
    if (remainingSlots <= 0) {
      setFileError(`You can attach up to ${MAX_IMAGES} images at once.`);
      event.target.value = "";
      return;
    }

    if (selected.length > remainingSlots) {
      setFileError(`Only ${MAX_IMAGES} images can be attached at once.`);
    }

    const validFiles = selected.slice(0, remainingSlots).filter((file) => {
      if (!file.type.startsWith("image/")) {
        setFileError("Only image uploads are supported.");
        return false;
      }

      if (file.size > MAX_SOURCE_IMAGE_BYTES) {
        setFileError("Each image must be 8MB or smaller before compression.");
        return false;
      }

      return true;
    });

    const nextAttachments = [];
    let totalDataLength =
      attachments.reduce((sum, attachment) => sum + (attachment.dataUrl?.length || 0), 0);

    for (const file of validFiles) {
      try {
        const dataUrl = await compressImageFile(file);

        if (
          dataUrl.length > MAX_OUTPUT_DATA_URL_LENGTH ||
          totalDataLength + dataUrl.length > MAX_TOTAL_DATA_URL_LENGTH
        ) {
          setFileError("Some images were too large after compression. Try fewer or smaller images.");
          continue;
        }

        totalDataLength += dataUrl.length;
        nextAttachments.push({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          type: "image/jpeg",
          size: dataUrl.length,
          originalSize: file.size,
          dataUrl,
        });
      } catch {
        setFileError("One image could not be processed. Try a smaller image.");
      }
    }

    setAttachments((current) => [...current, ...nextAttachments].slice(0, MAX_IMAGES));
    event.target.value = "";
  };

  const removeAttachment = (id) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const handleSubmit = () => {
    if ((!value.trim() && attachments.length === 0) || isLoading || isLimited) {
      return;
    }

    onSend(value.trim() || "Please describe this image.", attachments);
    setValue("");
    setAttachments([]);
    setFileError("");
  };

  return (
    <div className="relative">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative h-16 w-16 overflow-hidden rounded-xl border border-white/10 bg-card"
            >
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-full border border-white/10 bg-card/90 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isLimited || attachments.length >= MAX_IMAGES}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Upload images"
          title="Upload images"
        >
          <ImagePlus className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isLimited ? "Sign in with Xirako to keep chatting..." : "Message XirAI..."}
          rows={1}
          disabled={isLimited}
          className="max-h-[180px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSubmit}
          disabled={(!value.trim() && attachments.length === 0) || isLoading || isLimited}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
            (value.trim() || attachments.length > 0) && !isLoading && !isLimited
              ? "scale-100 bg-primary text-primary-foreground hover:brightness-110"
              : "scale-95 cursor-not-allowed bg-muted text-muted-foreground"
          }`}
          aria-label="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
    </div>
  );
}
