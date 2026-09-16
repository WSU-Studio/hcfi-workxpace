'use client';

import { X } from 'lucide-react';
import { supportingDocFileNameFromUrl } from '@/lib/supporting-docs';

export type SupportingDocumentsFieldProps = {
  attachmentFiles: File[];
  onAttachmentFilesChange: (files: File[]) => void;
  existingSupportingDocs?: string[];
  onRemoveExistingSupportingDoc?: (url: string) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  required?: boolean;
};

function fileIdentity(file: File) {
  return `${file.name}-${file.lastModified}-${file.size}`;
}

/**
 * Reusable supporting-documents picker used by Budget Plan / Request / Payment Request forms.
 * Parent owns upload + persistence; this component only manages selection UX (SRP).
 */
export default function SupportingDocumentsField({
  attachmentFiles,
  onAttachmentFilesChange,
  existingSupportingDocs = [],
  onRemoveExistingSupportingDoc,
  label = 'Supporting Documents',
  accept,
  multiple = true,
  disabled = false,
  required = false,
}: SupportingDocumentsFieldProps) {
  const displayLabel = required && !label.trim().endsWith('*') ? `${label} *` : label;

  return (
    <div>
      <label className="mb-1.5 block font-medium">{displayLabel}</label>

      {existingSupportingDocs.length > 0 ? (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Existing documents</p>
          <ul className="space-y-2 text-sm text-gray-700">
            {existingSupportingDocs.map((url) => (
              <li key={url} className="flex items-center justify-between gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-blue-600 hover:underline"
                >
                  {supportingDocFileNameFromUrl(url)}
                </a>
                {onRemoveExistingSupportingDoc ? (
                  <button
                    type="button"
                    onClick={() => onRemoveExistingSupportingDoc(url)}
                    disabled={disabled}
                    className="shrink-0 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label
          className={`inline-flex w-fit cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-gray-50 ${
            disabled ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          Upload Documents
          <input
            type="file"
            className="hidden"
            multiple={multiple}
            accept={accept}
            disabled={disabled}
            aria-required={required || undefined}
            onChange={(event) => {
              const picked = Array.from(event.target.files || []);
              // Append to the current selection (skip files already picked)
              // instead of replacing it, so users can add documents in batches.
              const known = new Set(attachmentFiles.map(fileIdentity));
              const merged = [
                ...attachmentFiles,
                ...picked.filter((file) => !known.has(fileIdentity(file))),
              ];
              onAttachmentFilesChange(multiple ? merged : picked);
              event.target.value = '';
            }}
          />
        </label>

        <span className="max-w-[300px] truncate text-sm text-gray-500">
          {attachmentFiles.length > 0
            ? `${attachmentFiles.length} file selected`
            : 'No file selected'}
        </span>
      </div>

      {attachmentFiles.length > 0 ? (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <ul className="space-y-1 text-sm text-gray-700">
            {attachmentFiles.map((file) => (
              <li
                key={fileIdentity(file)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    onAttachmentFilesChange(
                      attachmentFiles.filter(
                        (item) => fileIdentity(item) !== fileIdentity(file),
                      ),
                    )
                  }
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 disabled:opacity-50"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
