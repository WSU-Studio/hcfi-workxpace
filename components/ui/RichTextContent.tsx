'use client';

import DOMPurify from 'dompurify';
import { cn, isRichTextEmpty } from '@/lib/utils';

type RichTextContentProps = {
  value?: string | null;
  className?: string;
  emptyLabel?: string;
};

const contentClassName =
  '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-700 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:p-2 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-2 [&_img]:my-2 [&_img]:max-h-72 [&_img]:max-w-full [&_img]:rounded';

export default function RichTextContent({ value, className, emptyLabel = '-' }: RichTextContentProps) {
  const sanitized = DOMPurify.sanitize(value || '');
  if (!sanitized || isRichTextEmpty(sanitized)) {
    return <p className={cn('text-gray-700', className)}>{emptyLabel}</p>;
  }

  return <div className={cn('text-gray-700', contentClassName, className)} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
