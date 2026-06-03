import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { clsx } from 'clsx';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadZoneProps {
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the overlay only on hover */
  showOnHover?: boolean;
  className?: string;
}

export function ImageUploadZone({
  currentImageUrl,
  onUpload,
  onRemove,
  size = 'md',
  showOnHover = true,
  className,
}: ImageUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Image must be smaller than 5MB');
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        await onUpload(file);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: false,
    disabled: isUploading,
    noClick: true,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    open();
  };

  // If there's an existing image
  if (currentImageUrl) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-lg',
          sizeClasses[size],
          className
        )}
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        {/* Current Image */}
        <img
          src={currentImageUrl}
          alt="Product"
          className="h-full w-full object-cover"
        />

        {/* Hover/Upload Overlay */}
        <div
          className={clsx(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            isDragActive
              ? 'bg-primary/60 opacity-100'
              : showOnHover
                ? 'bg-black/50 opacity-0 group-hover:opacity-100'
                : 'bg-black/50 opacity-100',
            isUploading && 'bg-black/70 opacity-100'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 size={iconSizes[size]} className="animate-spin" />
              <span className="text-xs font-medium">Uploading...</span>
            </div>
          ) : (
            <button
              onClick={handleClick}
              className="flex flex-col items-center gap-1 text-white/90 transition-colors hover:text-white"
              title="Change Image"
            >
              <Camera size={iconSizes[size]} />
              <span className="text-xs font-medium">Change</span>
            </button>
          )}
        </div>

        {/* Error Toast */}
        {uploadError && (
          <div className="absolute bottom-0 left-0 right-0 bg-danger px-2 py-1 text-center text-[10px] text-white">
            {uploadError}
          </div>
        )}

        {/* Remove Button */}
        {onRemove && !isDragActive && !isUploading && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute right-1 top-1 rounded-full bg-danger/90 p-1 text-white opacity-0 transition-opacity hover:bg-danger group-hover:opacity-100"
            title="Remove Image"
          >
            <X size={12} />
          </button>
        )}
      </div>
    );
  }

  // No image - show placeholder with upload area
  return (
    <div
      className={clsx(
        'group relative cursor-pointer overflow-hidden rounded-lg border-2 border-dashed',
        'border-warm-border-warm bg-warm-surface transition-colors hover:border-warm-accent hover:bg-warm-surface-hover',
        isDragActive && 'border-warm-accent bg-warm-accent/10',
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-warm-muted">
          <Loader2 size={iconSizes[size]} className="animate-spin text-warm-accent" />
          <span className="text-xs">Uploading...</span>
        </div>
      ) : (
        <>
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <div className="rounded-full bg-warm-dim/30 p-2 transition-colors group-hover:bg-warm-accent/20">
              <Upload size={iconSizes[size]} className="text-warm-dim group-hover:text-warm-accent" />
            </div>
            <span className="text-[10px] text-warm-muted group-hover:text-warm-fg">
              {isDragActive ? 'Drop here' : 'Add Image'}
            </span>
          </div>

          {/* Error Toast */}
          {uploadError && (
            <div className="absolute bottom-0 left-0 right-0 bg-danger px-2 py-1 text-center text-[10px] text-white">
              {uploadError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
