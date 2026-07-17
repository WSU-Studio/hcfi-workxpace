'use client';

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
};

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
}: SupportingDocumentsFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block font-medium">{label}</label>

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
            onChange={(event) => {
              onAttachmentFilesChange(Array.from(event.target.files || []));
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
              <li key={`${file.name}-${file.lastModified}-${file.size}`} className="truncate">
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
