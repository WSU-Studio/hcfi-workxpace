'use client';

import { useState } from 'react';
import Image from 'next/image';
import { uploadSupportingDocs } from '@/lib/supporting-docs';

export type LogoUploadFieldProps = {
  label: string;
  description: string;
  value: string;
  fallbackSrc: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

/**
 * Single logo slot for Application Settings. Parent owns persistence;
 * this component only uploads and previews (SRP).
 */
export default function LogoUploadField({
  label,
  description,
  value,
  fallbackSrc,
  onChange,
  disabled = false,
}: LogoUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const previewSrc = value.trim() || fallbackSrc;
  const usingFallback = !value.trim();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setIsUploading(true);
    try {
      const [url] = await uploadSupportingDocs([file], 'branding');
      if (!url) throw new Error('Upload did not return a file URL');
      onChange(url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload logo');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4">
        {/* Custom URLs come from the file proxy; static fallbacks are public SVGs. */}
        <Image
          src={previewSrc}
          alt={label}
          width={180}
          height={48}
          unoptimized
          className="max-h-12 max-w-full object-contain"
        />
      </div>
      <p className="text-xs text-gray-500">
        {usingFallback ? 'Using the default Workxpace logo.' : 'Custom logo selected. Save settings to apply.'}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 ${
            disabled || isUploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload logo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
        </label>
        {value.trim() ? (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled || isUploading}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Use Workxpace default
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
