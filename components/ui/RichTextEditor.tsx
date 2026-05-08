'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import {
  Bold,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Table2,
  Undo2,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxContentBytes?: number;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
};

function ToolbarButton({ label, onClick, isActive = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-gray-700 transition-colors',
        isActive
          ? 'border-blue-500 bg-blue-50 text-blue-700'
          : 'border-gray-300 bg-white hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write description...',
  className,
  maxContentBytes,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const lastValidHtmlRef = useRef(value || '<p></p>');
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [imageError, setImageError] = useState('');
  const [contentError, setContentError] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'min-h-[180px] w-full rounded-b-lg border-x border-b border-gray-400 px-3 py-2 focus:outline-none',
      },
    },
    onUpdate({ editor: currentEditor }) {
      const html = currentEditor.getHTML();
      const sizeInBytes = new TextEncoder().encode(html).length;
      if (maxContentBytes && sizeInBytes > maxContentBytes) {
        setContentError(`Description is too large. Maximum ${Math.floor(maxContentBytes / 1024)}KB.`);
        currentEditor.commands.setContent(lastValidHtmlRef.current || '<p></p>', { emitUpdate: false });
        return;
      }

      setContentError('');
      lastValidHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
      lastValidHtmlRef.current = value || '<p></p>';
      setContentError('');
    }
  }, [editor, value]);

  const handleInsertImage = () => {
    setImageError('');
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError('');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Unsupported file type. Please use JPG, PNG, or WEBP.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError('Image is too large. Maximum allowed size is 2MB.');
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src === 'string') {
        editor.chain().focus().setImage({ src }).run();
      }
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setImageError('Failed to read image file. Please try a different file.');
      if (imageInputRef.current) imageInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleInsertLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Insert link URL', previousUrl ?? 'https://');

    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const handleInsertTable = () => {
    if (!editor) return;
    const rows = Number.parseInt(tableRows, 10);
    const cols = Number.parseInt(tableCols, 10);

    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
      window.alert('Rows and columns must be positive numbers.');
      return;
    }

    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setIsTablePopoverOpen(false);
  };

  if (!editor) return null;

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={imageInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <div className="flex flex-wrap gap-2 rounded-t-lg border border-gray-400 bg-gray-50 p-2">
        <ToolbarButton
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert Link" onClick={handleInsertLink} isActive={editor.isActive('link')}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Remove Link" onClick={() => editor.chain().focus().unsetLink().run()}>
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Insert Image" onClick={handleInsertImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton label="Insert Table" onClick={() => setIsTablePopoverOpen((previous) => !previous)}>
            <Table2 className="h-4 w-4" />
          </ToolbarButton>
          {isTablePopoverOpen && (
            <div className="absolute left-0 top-11 z-20 w-56 rounded-lg border border-gray-300 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-gray-600">Insert table</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Rows</label>
                  <input
                    type="number"
                    min={1}
                    value={tableRows}
                    onChange={(e) => setTableRows(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Columns</label>
                  <input
                    type="number"
                    min={1}
                    value={tableCols}
                    onChange={(e) => setTableCols(e.target.value)}
                    className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTablePopoverOpen(false)}
                  className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInsertTable}
                  className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Insert
                </button>
              </div>
            </div>
          )}
        </div>
        {editor.isActive('table') && (
          <>
            <ToolbarButton label="Add Row" onClick={() => editor.chain().focus().addRowAfter().run()}>
              +Row
            </ToolbarButton>
            <ToolbarButton label="Add Column" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              +Col
            </ToolbarButton>
            <ToolbarButton label="Delete Row" onClick={() => editor.chain().focus().deleteRow().run()}>
              -Row
            </ToolbarButton>
            <ToolbarButton label="Delete Column" onClick={() => editor.chain().focus().deleteColumn().run()}>
              -Col
            </ToolbarButton>
            <ToolbarButton label="Delete Table" onClick={() => editor.chain().focus().deleteTable().run()}>
              Del Tbl
            </ToolbarButton>
          </>
        )}
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {(imageError || contentError) && <p className="mt-2 text-sm text-red-600">{imageError || contentError}</p>}

      <div
        className={cn(
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6',
          '[&_.ProseMirror_ol]:my-2 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6',
          '[&_.ProseMirror_li]:my-1',
          '[&_.ProseMirror_blockquote]:my-3 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:text-gray-700',
          '[&_.ProseMirror_table]:my-3 [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse',
          '[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-2',
          '[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:p-2',
          '[&_.ProseMirror_img]:my-2 [&_.ProseMirror_img]:max-h-72 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:cursor-pointer [&_.ProseMirror_img]:rounded',
          '[&_.ProseMirror_img.ProseMirror-selectednode]:outline [&_.ProseMirror_img.ProseMirror-selectednode]:outline-2 [&_.ProseMirror_img.ProseMirror-selectednode]:outline-blue-500'
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
