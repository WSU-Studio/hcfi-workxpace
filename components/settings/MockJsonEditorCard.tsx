'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconRotate, IconCheck, IconAlertCircle, IconCode } from '@tabler/icons-react';

type MockJsonEditorCardProps = {
  title: string;
  description: string;
  /** Current value (string). Empty = "use bundled default". */
  value: string;
  onChange: (value: string) => void;
  /** Load bundled default JSON from the server (button: "Reset to default"). */
  onLoadDefault: () => Promise<string>;
  disabled?: boolean;
  /** Soft limit for the textarea height/UX hint. */
  rowsPreview?: number;
};

type Validation =
  | { ok: true; rows: number; bytes: number; usingDefault: boolean }
  | { ok: false; error: string; usingDefault: boolean };

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const validateJson = (raw: string): Validation => {
  const trimmed = raw.trim();
  const usingDefault = trimmed === '';
  if (usingDefault) {
    return { ok: true, rows: 0, bytes: 0, usingDefault: true };
  }
  try {
    const parsed = JSON.parse(raw);
    let arr: unknown[] | null = null;
    if (Array.isArray(parsed)) arr = parsed;
    else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { ReturnObject?: unknown }).ReturnObject)
    ) {
      arr = (parsed as { ReturnObject: unknown[] }).ReturnObject;
    }
    if (!arr) {
      return {
        ok: false,
        error: 'JSON harus berupa array, atau object dengan field `ReturnObject` array.',
        usingDefault: false,
      };
    }
    return {
      ok: true,
      rows: arr.length,
      bytes: new Blob([raw]).size,
      usingDefault: false,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
      usingDefault: false,
    };
  }
};

/**
 * Generic JSON editor card untuk mock API setting.
 *
 * Single-responsibility: edit + validate satu blob JSON. Tidak tahu apa-apa
 * tentang endpoint apa yang di-mock — caller yang nentuin `title`/`description`
 * dan menyediakan source-of-truth value via props (controlled component).
 */
export default function MockJsonEditorCard({
  title,
  description,
  value,
  onChange,
  onLoadDefault,
  disabled = false,
  rowsPreview = 14,
}: MockJsonEditorCardProps) {
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const validation = useMemo(() => validateJson(value), [value]);

  // Clear "load default" error once user mengetik lagi.
  useEffect(() => {
    if (loadError) setLoadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleLoadDefault = async () => {
    try {
      setIsLoadingDefault(true);
      setLoadError(null);
      const next = await onLoadDefault();
      onChange(next);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load default fixture');
    } finally {
      setIsLoadingDefault(false);
    }
  };

  const handleClear = () => onChange('');

  const handleFormat = () => {
    if (validation.ok && !validation.usingDefault) {
      try {
        const parsed = JSON.parse(value);
        const arr = Array.isArray(parsed)
          ? parsed
          : (parsed as { ReturnObject?: unknown[] }).ReturnObject ?? parsed;
        onChange(JSON.stringify(arr, null, 2));
      } catch {
        // already handled by validation banner
      }
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <StatusPill validation={validation} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleFormat}
            disabled={disabled || !validation.ok || validation.usingDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconCode size={14} /> Format
          </button>
          <button
            type="button"
            onClick={handleLoadDefault}
            disabled={disabled || isLoadingDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconRotate size={14} />
            {isLoadingDefault ? 'Loading…' : 'Reset to default'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || validation.usingDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {loadError && (
        <p className="mt-2 text-xs text-red-600">{loadError}</p>
      )}

      <textarea
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rowsPreview}
        placeholder='Leave empty to use bundled default fixture. Or paste JSON like: [ { "DataInterfaceSource": "CONFINS", ... } ]'
        className="mt-3 block w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-xs leading-relaxed text-gray-800 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <p className="mt-2 text-xs text-gray-500">
        Tip: Anda bisa menempel langsung response Postman utuh
        <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-[11px] text-gray-700">{`{ ReturnObject: [...] }`}</code>
        — sistem otomatis ambil isi <code>ReturnObject</code>.
      </p>
    </section>
  );
}

function StatusPill({ validation }: { validation: Validation }) {
  if (validation.usingDefault) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        <IconCheck size={14} /> Using bundled default
      </span>
    );
  }
  if (validation.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <IconCheck size={14} /> Valid · {validation.rows} rows · {formatBytes(validation.bytes)}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
      title={validation.error}
    >
      <IconAlertCircle size={14} /> Invalid: {validation.error.slice(0, 80)}
    </span>
  );
}
