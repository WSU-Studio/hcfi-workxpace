'use client';

import { FileText } from 'lucide-react';
import { supportingDocFileNameFromUrl } from '@/lib/supporting-docs';

type SupportingDocumentLinksProps = {
  urls: string[];
  emptyText?: string;
};

/** Read-only list of supporting document links showing original file names. */
export default function SupportingDocumentLinks({
  urls,
  emptyText = '-',
}: SupportingDocumentLinksProps) {
  if (urls.length === 0) {
    return <p className="mt-1 text-gray-700">{emptyText}</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((url, index) => (
        <a
          key={`${url}-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={supportingDocFileNameFromUrl(url)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          <span className="truncate">{supportingDocFileNameFromUrl(url)}</span>
        </a>
      ))}
    </div>
  );
}
