import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { UserProfile } from '@/lib/types';

export const runtime = 'nodejs';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeProfile(input: unknown): UserProfile | null {
  if (!isObject(input)) return null;

  const profile = input as Partial<UserProfile>;
  if (!profile.links || !profile.technicalSkills || !profile.softSkills || !profile.jobRecommendations || !profile.aiSummary || !profile.learningPath) {
    return null;
  }

  return profile as UserProfile;
}

function toTsModule(profile: UserProfile): string {
  const serialized = JSON.stringify(profile, null, 2);
  return `import type { UserProfile } from './types';\n\nexport const mockUserProfile: UserProfile = ${serialized};\n`;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const body = isObject(payload) ? payload : {};
  const profile = sanitizeProfile(body.profile);

  if (!profile) {
    return NextResponse.json({ error: 'Invalid profile payload.' }, { status: 400 });
  }

  const workspaceRoot = process.cwd();
  const libDir = path.join(workspaceRoot, 'lib');
  const mockDataPath = path.join(libDir, 'mockData.ts');
  const jsonFallbackPath = path.join(libDir, 'generatedUserProfile.json');

  try {
    await mkdir(libDir, { recursive: true });
    await writeFile(mockDataPath, toTsModule(profile), 'utf8');

    return NextResponse.json({
      ok: true,
      format: 'ts',
      path: 'lib/mockData.ts',
    });
  } catch (writeError) {
    try {
      await writeFile(jsonFallbackPath, `${JSON.stringify(profile, null, 2)}\n`, 'utf8');

      return NextResponse.json({
        ok: true,
        format: 'json',
        path: 'lib/generatedUserProfile.json',
        warning: 'Failed to write TypeScript snapshot. JSON fallback generated.',
      });
    } catch {
      console.error('Profile snapshot write failed', writeError);
      return NextResponse.json(
        { error: 'Failed to persist profile snapshot to TypeScript and JSON files.' },
        { status: 500 },
      );
    }
  }
}
