import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getApplicationSettings, updateApplicationSettings } from '@/lib/app-settings';
import { MOCK_JSON_MAX_BYTES } from '@/types/app-settings';
import { isStoredBrandingLogoUrl } from '@/lib/supporting-docs-storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getApplicationSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to fetch application settings:', error);
    return NextResponse.json({ error: 'Failed to fetch application settings' }, { status: 500 });
  }
}

const validateMockJson = (raw: string): { ok: true } | { ok: false; error: string } => {
  if (raw.trim() === '') return { ok: true };
  if (Buffer.byteLength(raw, 'utf8') > MOCK_JSON_MAX_BYTES) {
    return { ok: false, error: `Mock JSON exceeds ${Math.round(MOCK_JSON_MAX_BYTES / 1024)} KB limit.` };
  }
  try {
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { ReturnObject?: unknown }).ReturnObject)
        ? (parsed as { ReturnObject: unknown[] }).ReturnObject
        : null;
    if (!arr) {
      return {
        ok: false,
        error: 'Mock JSON must be an array, or an object with a `ReturnObject` array.',
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'parse failed'}`,
    };
  }
};

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      confinsUseMock?: unknown;
      confinsMockBudgetRealJson?: unknown;
      enableDocumentDownload?: unknown;
      sidebarLogoUrl?: unknown;
      sidebarLogoCollapsedUrl?: unknown;
    };

    let confinsMockBudgetRealJson: string | undefined;
    if (typeof body.confinsMockBudgetRealJson === 'string') {
      const validation = validateMockJson(body.confinsMockBudgetRealJson);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      confinsMockBudgetRealJson = body.confinsMockBudgetRealJson;
    }

    const parseLogoUrl = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      if (!isStoredBrandingLogoUrl(trimmed)) {
        throw new Error('Logo URL is not valid');
      }
      return trimmed;
    };

    let sidebarLogoUrl: string | undefined;
    let sidebarLogoCollapsedUrl: string | undefined;
    try {
      sidebarLogoUrl = parseLogoUrl(body.sidebarLogoUrl);
      sidebarLogoCollapsedUrl = parseLogoUrl(body.sidebarLogoCollapsedUrl);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Logo URL is not valid' },
        { status: 400 },
      );
    }

    const updated = await updateApplicationSettings({
      confinsUseMock: typeof body.confinsUseMock === 'boolean' ? body.confinsUseMock : undefined,
      confinsMockBudgetRealJson,
      enableDocumentDownload:
        typeof body.enableDocumentDownload === 'boolean' ? body.enableDocumentDownload : undefined,
      sidebarLogoUrl,
      sidebarLogoCollapsedUrl,
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Failed to update application settings:', error);
    return NextResponse.json({ error: 'Failed to update application settings' }, { status: 500 });
  }
}
