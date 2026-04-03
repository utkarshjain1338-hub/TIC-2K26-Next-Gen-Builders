import { NextResponse } from 'next/server';
import { getDashboardSession, type AnalysisSessionData } from '@/lib/session';
import type { SocialLinks, UserProfile } from '@/lib/types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function linkSignature(links?: Partial<SocialLinks> | null): string {
  const normalized: SocialLinks = {
    github: links?.github ?? '',
    linkedin: links?.linkedin ?? '',
    resume: links?.resume ?? '',
    twitter: links?.twitter ?? '',
    portfolio: links?.portfolio ?? '',
    devto: links?.devto ?? '',
  };

  return JSON.stringify(normalized);
}

function sanitizeAnalysis(input: unknown): AnalysisSessionData | null {
  if (!isObject(input)) return null;

  const signature = typeof input.signature === 'string' ? input.signature : '';
  const profile = input.profile as Partial<UserProfile> | undefined;

  if (!signature || !profile || !profile.links || !profile.technicalSkills || !profile.softSkills || !profile.jobRecommendations || !profile.aiSummary || !profile.learningPath) {
    return null;
  }

  return {
    signature,
    profile: profile as UserProfile,
  };
}

export async function GET() {
  const session = await getDashboardSession();
  const currentSignature = linkSignature(session.preferences?.links ?? null);
  const analysis = session.analysis;

  if (analysis && analysis.signature === currentSignature) {
    return NextResponse.json({
      analysis,
    });
  }

  if (analysis) {
    delete session.analysis;
    await session.save();
  }

  return NextResponse.json({
    analysis: null,
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const analysis = sanitizeAnalysis(isObject(body) ? body.analysis : null);

  if (!analysis) {
    return NextResponse.json({ error: 'Invalid analysis payload.' }, { status: 400 });
  }

  const session = await getDashboardSession();
  session.analysis = analysis;
  session.preferences = {
    ...(session.preferences ?? {}),
    links: analysis.profile.links,
  };
  await session.save();

  return NextResponse.json({ ok: true, analysis: session.analysis });
}

export async function DELETE() {
  const session = await getDashboardSession();
  delete session.analysis;
  await session.save();

  return NextResponse.json({ ok: true });
}
