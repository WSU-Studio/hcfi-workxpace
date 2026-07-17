'use client';

import { useCallback, useState } from 'react';
import {
  normalizeSupportingDocs,
  uploadSupportingDocs,
  type SupportingDocsScope,
} from '@/lib/supporting-docs';

/**
 * Shared attachment state for BP / BR / PR forms.
 * Keeps file selection + existing URL list out of domain-specific form hooks.
 */
export function useSupportingDocuments(initialExisting: string[] = []) {
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingSupportingDocs, setExistingSupportingDocs] = useState<string[]>(initialExisting);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const removeExistingSupportingDoc = useCallback((url: string) => {
    setExistingSupportingDocs((previous) => previous.filter((item) => item !== url));
  }, []);

  const loadExistingSupportingDocs = useCallback((input: unknown) => {
    setExistingSupportingDocs(normalizeSupportingDocs(input));
  }, []);

  const resolveSupportingDocs = useCallback(
    async (scope: SupportingDocsScope) => {
      if (attachmentFiles.length === 0) {
        return existingSupportingDocs;
      }

      setIsUploadingAttachments(true);
      try {
        const newlyUploaded = await uploadSupportingDocs(attachmentFiles, scope);
        return [...existingSupportingDocs, ...newlyUploaded];
      } finally {
        setIsUploadingAttachments(false);
      }
    },
    [attachmentFiles, existingSupportingDocs],
  );

  return {
    attachmentFiles,
    setAttachmentFiles,
    existingSupportingDocs,
    setExistingSupportingDocs,
    loadExistingSupportingDocs,
    removeExistingSupportingDoc,
    resolveSupportingDocs,
    isUploadingAttachments,
  };
}
