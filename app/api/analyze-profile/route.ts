import { NextRequest, NextResponse } from 'next/server';
import { analyzeProfileText } from '@/lib/ai';
import type { JobRecommendation, LearningPathItem, LearningResource } from '@/lib/types';

interface SocialLinks {
  github?: string;
  linkedin?: string;
  resume?: string;
  portfolio?: string;
  twitter?: string;
  devto?: string;
}

interface Skill {
  name: string;
  confidence: number;
  source: string;
}

const BASE_SKILL_KEYWORDS = [
  'react',
  'javascript',
  'typescript',
  'node',
  'python',
  'vue',
  'angular',
  'tailwind',
  'nextjs',
  'express',
  'html',
  'css',
  'java',
  'graphql',
  'docker',
  'kubernetes',
  'sql',
  'aws',
];

const SOFT_SKILL_HINTS = ['communication', 'leadership', 'teamwork', 'problem solving', 'adaptability', 'creativity', 'ownership', 'presentation', 'mentoring'];

function normalizeSkill(keyword: string) {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((marker) => marker.charAt(0).toUpperCase() + marker.slice(1))
    .join(' ');
}

function extractSkillsFromText(text: string, source: string): Skill[] {
  const skills: Skill[] = [];
  const lowered = text.toLowerCase();
  const found = new Set<string>();

  BASE_SKILL_KEYWORDS.forEach((keyword) => {
    if (lowered.includes(keyword)) {
      found.add(keyword);
    }
  });

  found.forEach((keyword) => {
    skills.push({
      name: normalizeSkill(keyword),
      confidence: 0.6,
      source,
    });
  });

  return skills;
}

function buildProfileText(links: SocialLinks, extractedSkills: Skill[]): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(links)) {
    if (typeof value === 'string' && value.trim()) {
      lines.push(`${key}: ${value.trim()}`);
    }
  }

  if (extractedSkills.length > 0) {
    lines.push(`detectedSkills: ${extractedSkills.map((skill) => `${skill.name} (${skill.source})`).join(', ')}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'No profile links or detected skills available';
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function createSkillLookup(values: string[]): Set<string> {
  return new Set(values.map(normalizeToken).filter(Boolean));
}

function getProfileSources(extractedSkills: Skill[]): string[] {
  const preferredOrder = ['GitHub', 'LinkedIn', 'Portfolio', 'Resume URL', 'Resume', 'Dev.to', 'Twitter URL', 'Twitter'];
  const sources = new Set<string>();

  for (const skill of extractedSkills) {
    skill.source.split(' + ').forEach((source) => {
      const cleaned = source.trim();
      if (cleaned) {
        sources.add(cleaned);
      }
    });
  }

  return preferredOrder.filter((source) => sources.has(source));
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function detectFocusArea(skills: AnalysisResult['technicalSkills']): 'frontend' | 'fullstack' | 'platform' | 'general' {
  const techNames = skills.map((skill) => normalizeToken(skill.name));

  if (techNames.some((skill) => ['react', 'javascript', 'typescript', 'next.js', 'nextjs', 'frontend', 'ui'].includes(skill))) {
    if (techNames.some((skill) => ['node.js', 'node', 'sql', 'database', 'api', 'backend'].includes(skill))) {
      return 'fullstack';
    }

    return 'frontend';
  }

  if (techNames.some((skill) => ['docker', 'kubernetes', 'aws', 'cloud', 'devops', 'ci/cd', 'cicd'].includes(skill))) {
    return 'platform';
  }

  if (techNames.some((skill) => ['node.js', 'node', 'sql', 'database', 'api', 'backend', 'python'].includes(skill))) {
    return 'fullstack';
  }

  return 'general';
}

function buildPersonalizedSummary(
  analysis: AnalysisResult,
  sources: string[],
  focusArea: 'frontend' | 'fullstack' | 'platform' | 'general',
): string {
  const leadSkills = analysis.topSkills.slice(0, 3);
  const sourcePhrase = sources.length > 0 ? formatList(sources) : 'your linked profiles';
  const leadPhrase = leadSkills.length > 0 ? formatList(leadSkills) : 'core skills';

  if (focusArea === 'frontend') {
    return `${sourcePhrase} point to a frontend-leaning profile centered on ${leadPhrase}. GitHub and portfolio evidence suggest you build with React-oriented patterns, while your social/profile signals add communication and delivery strength.`;
  }

  if (focusArea === 'fullstack') {
    return `${sourcePhrase} show a balanced profile centered on ${leadPhrase}. Your signals suggest you can move between interface work and backend/problem-solving tasks, with enough collaboration evidence to operate across product teams.`;
  }

  if (focusArea === 'platform') {
    return `${sourcePhrase} indicate a profile leaning toward infrastructure and delivery around ${leadPhrase}. Your public/project footprint suggests you can build and ship, with room to deepen cloud and deployment ownership.`;
  }

  return `${sourcePhrase} highlight strengths in ${leadPhrase}. The strongest evidence comes from the skills and delivery patterns surfaced in your linked accounts, with collaboration signals showing up alongside technical work.`;
}

function buildPersonalizedGaps(
  analysis: AnalysisResult,
  technicalSkills: AnalysisResult['technicalSkills'],
  softSkills: AnalysisResult['softSkills'],
  sources: string[],
  focusArea: 'frontend' | 'fullstack' | 'platform' | 'general',
): string[] {
  const sourcePhrase = sources.length > 0 ? formatList(sources) : 'your linked profiles';
  const skillNames = createSkillLookup([...technicalSkills.map((skill) => skill.name), ...softSkills.map((skill) => skill.name)]);

  const gaps: string[] = [];

  if (focusArea === 'frontend') {
    if (!skillNames.has('node.js') && !skillNames.has('node') && !skillNames.has('backend')) {
      gaps.push(`Backend depth is not as visible across ${sourcePhrase} as your frontend work.`);
    }
    if (!skillNames.has('aws') && !skillNames.has('cloud') && !skillNames.has('docker')) {
      gaps.push(`Cloud and deployment signals are lighter than your React and UI evidence.`);
    }
    if (!skillNames.has('testing') && !skillNames.has('jest') && !skillNames.has('playwright')) {
      gaps.push('Testing and automation are not yet a dominant signal in the linked evidence.');
    }
  }

  if (focusArea === 'fullstack') {
    if (!skillNames.has('aws') && !skillNames.has('docker') && !skillNames.has('kubernetes')) {
      gaps.push(`Cloud delivery and infrastructure ownership are still less visible than your product work.`);
    }
    if (!skillNames.has('system design') && !skillNames.has('architecture')) {
      gaps.push('System design evidence is lighter than your implementation-level skills.');
    }
    if (!skillNames.has('testing') && !skillNames.has('ci/cd') && !skillNames.has('cicd')) {
      gaps.push('Testing depth and CI/CD automation could be stronger in the current profile signal.');
    }
  }

  if (focusArea === 'platform') {
    if (!skillNames.has('backend') && !skillNames.has('api') && !skillNames.has('sql')) {
      gaps.push('Backend and API ownership are less visible than your delivery-oriented signals.');
    }
    if (!skillNames.has('system design') && !skillNames.has('scalability')) {
      gaps.push('System design and scalability evidence is still thin across the linked profiles.');
    }
    if (!skillNames.has('testing') && !skillNames.has('observability')) {
      gaps.push('Reliability, testing, and observability signals are not yet prominent.');
    }
  }

  if (gaps.length === 0) {
    gaps.push(`Your linked profiles show solid technical direction, but the evidence across ${sourcePhrase} can be sharpened with more concrete project outcomes and role-specific depth.`);
    gaps.push('A few more project examples with measurable impact would make the profile easier to position for higher-fit roles.');
  }

  return gaps.slice(0, 4);
}

function buildPersonalizedStrengths(
  analysis: AnalysisResult,
  sources: string[],
  focusArea: 'frontend' | 'fullstack' | 'platform' | 'general',
): string[] {
  const sourcePhrase = sources.length > 0 ? formatList(sources) : 'your linked profiles';
  const strengths = new Set<string>();

  const topTech = analysis.technicalSkills.slice(0, 3);
  const topSoft = analysis.softSkills.slice(0, 2);

  if (topTech.length > 0) {
    strengths.add(`${sourcePhrase} show strength in ${formatList(topTech.map((skill) => skill.name))}.`);
  }

  if (topSoft.length > 0) {
    strengths.add(`Collaboration signals such as ${formatList(topSoft.map((skill) => skill.name))} are present across your profile evidence.`);
  }

  if (focusArea === 'frontend') {
    strengths.add('The profile is strongest where product-facing UI work, React patterns, and delivery quality intersect.');
  } else if (focusArea === 'fullstack') {
    strengths.add('Your evidence suggests you can connect interface work with backend problem solving when the role demands it.');
  } else if (focusArea === 'platform') {
    strengths.add('The strongest signal is execution: you appear comfortable shipping and iterating on engineering work.');
  } else {
    strengths.add('Your profile shows a mix of technical depth and communication that can be positioned toward multiple role types.');
  }

  return Array.from(strengths).slice(0, 5);
}

function aggregateSkillsByName(skills: Skill[]): Skill[] {
  const aggregated = new Map<string, { name: string; confidence: number; sources: string[] }>();

  for (const skill of skills) {
    const key = normalizeToken(skill.name);
    const existing = aggregated.get(key);

    if (!existing) {
      aggregated.set(key, {
        name: skill.name,
        confidence: skill.confidence,
        sources: [skill.source],
      });
      continue;
    }

    existing.confidence = Math.max(existing.confidence, skill.confidence);
    if (!existing.sources.includes(skill.source)) {
      existing.sources.push(skill.source);
    }
  }

  return Array.from(aggregated.values()).map((item) => ({
    name: item.name,
    confidence: item.confidence,
    source: item.sources.join(' + '),
  }));
}

type AnalysisResult = Awaited<ReturnType<typeof analyzeProfileText>>;

type SoftSignal = {
  name: string;
  score: number;
  confidence: number;
};

function buildSoftSkillSignals(extractedSkills: Skill[]): SoftSignal[] {
  const sourceText = extractedSkills.map((skill) => `${skill.name} ${skill.source}`).join(' ').toLowerCase();
  const sources = new Set(extractedSkills.map((skill) => normalizeToken(skill.source)));

  const signals: SoftSignal[] = [
    {
      name: 'Communication',
      score: 72 + (sources.has('linkedin') || sources.has('portfolio') ? 8 : 0),
      confidence: 0.82,
    },
    {
      name: 'Problem Solving',
      score: 70 + (sources.has('github') || sources.has('dev.to') ? 10 : 0),
      confidence: 0.8,
    },
    {
      name: 'Teamwork',
      score: 66 + (sources.has('github') || sources.has('linkedin') ? 8 : 0),
      confidence: 0.76,
    },
    {
      name: 'Leadership',
      score: 60 + (sources.has('linkedin') || sources.has('resume') ? 12 : 0),
      confidence: 0.7,
    },
    {
      name: 'Adaptability',
      score: 64 + (sources.has('portfolio') || sources.has('dev.to') ? 8 : 0),
      confidence: 0.74,
    },
    {
      name: 'Creativity',
      score: 62 + (sources.has('portfolio') || sourceText.includes('design') ? 10 : 0),
      confidence: 0.72,
    },
    {
      name: 'Ownership',
      score: 68 + (sources.has('github') || sources.has('portfolio') ? 8 : 0),
      confidence: 0.78,
    },
    {
      name: 'Presentation',
      score: 58 + (sources.has('portfolio') || sources.has('linkedin') ? 10 : 0),
      confidence: 0.68,
    },
    {
      name: 'Mentoring',
      score: 56 + (sources.has('dev.to') || sources.has('github') ? 8 : 0),
      confidence: 0.66,
    },
  ];

  return signals;
}

function deriveFallbackAISkills(extractedSkills: Skill[]): Pick<AnalysisResult, 'technicalSkills' | 'softSkills'> {
  const technical = new Map<string, { name: string; score: number; confidence: number }>();
  const soft = new Map<string, { name: string; score: number; confidence: number }>();

  for (const skill of extractedSkills) {
    const token = normalizeToken(skill.name);
    const score = Math.round(Math.min(96, Math.max(45, (skill.confidence || 0.6) * 100)));
    const normalized = normalizeSkill(skill.name);

    if (SOFT_SKILL_HINTS.some((hint) => token.includes(hint))) {
      soft.set(normalized, { name: normalized, score, confidence: clampConfidence(skill.confidence) });
    } else {
      technical.set(normalized, { name: normalized, score, confidence: clampConfidence(skill.confidence) });
    }
  }

  for (const signal of buildSoftSkillSignals(extractedSkills)) {
    if (!soft.has(signal.name)) {
      soft.set(signal.name, {
        name: signal.name,
        score: Math.min(96, Math.max(45, Math.round(signal.score))),
        confidence: clampConfidence(signal.confidence),
      });
    }
  }

  return {
    technicalSkills: Array.from(technical.values()).slice(0, 8).map((skill) => ({
      ...skill,
      type: 'technical' as const,
      source: 'Processed-Link-Data',
    })),
    softSkills: Array.from(soft.values()).slice(0, 6).map((skill) => ({
      ...skill,
      type: 'soft' as const,
      source: 'Processed-Link-Data',
    })),
  };
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.6;
  return Math.min(1, Math.max(0.35, value));
}

function enrichAnalysis(analysis: AnalysisResult, extractedSkills: Skill[]): AnalysisResult {
  const sources = getProfileSources(extractedSkills);
  const focusArea = detectFocusArea([...analysis.technicalSkills, ...analysis.softSkills]);
  const fallback = deriveFallbackAISkills(extractedSkills);

  const mergeSkills = (
    primary: AnalysisResult['technicalSkills'] | AnalysisResult['softSkills'],
    secondary: AnalysisResult['technicalSkills'] | AnalysisResult['softSkills'],
    type: 'technical' | 'soft',
  ) => {
    const combined = new Map<string, AnalysisResult['technicalSkills'][number]>();

    [...primary, ...secondary].forEach((skill) => {
      const key = normalizeToken(skill.name);
      const existing = combined.get(key);
      if (!existing || skill.score > existing.score) {
        combined.set(key, {
          ...skill,
          type,
          source: skill.source || 'Processed-Link-Data',
        });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, type === 'technical' ? 8 : 6);
  };

  const technicalSkills = mergeSkills(
    analysis.technicalSkills.length > 0 ? analysis.technicalSkills : [],
    fallback.technicalSkills,
    'technical',
  );
  const softSkills = mergeSkills(
    analysis.softSkills.length > 0 ? analysis.softSkills : [],
    fallback.softSkills,
    'soft',
  );

  const mergedSkills = [...technicalSkills, ...softSkills];
  const topSkills = analysis.topSkills.length > 0
    ? analysis.topSkills
    : mergedSkills.sort((a, b) => b.score - a.score).slice(0, 6).map((skill) => skill.name);

  const summary = buildPersonalizedSummary({ ...analysis, technicalSkills, softSkills, topSkills }, sources, focusArea);

  const gaps = buildPersonalizedGaps({ ...analysis, technicalSkills, softSkills, topSkills }, technicalSkills, softSkills, sources, focusArea);

  const recommendations = analysis.recommendations.length > 0
    ? analysis.recommendations
    : [
        `Deepen evidence in ${topSkills[0] || 'your strongest area'} by attaching it to concrete portfolio or GitHub outcomes.`,
        focusArea === 'frontend'
          ? 'Add one backend or deployment project so your frontend strength looks more complete.'
          : focusArea === 'platform'
            ? 'Document one product-facing project to balance infrastructure strength with role breadth.'
            : 'Build one end-to-end project that shows product, implementation, and collaboration together.',
        `Use ${sources.length > 0 ? formatList(sources) : 'your linked profiles'} to show measurable impact, not just tooling keywords.`,
      ];

  const averageScore = mergedSkills.length > 0
    ? Math.round(mergedSkills.reduce((sum, skill) => sum + skill.score, 0) / mergedSkills.length)
    : 0;

  const industryRelevanceScore = analysis.industryRelevanceScore > 0 ? analysis.industryRelevanceScore : averageScore;
  const industryInsights = analysis.industryInsights.trim().length > 0
    ? analysis.industryInsights
    : `Your processed profile indicates a relevance score of ${industryRelevanceScore} based on current strengths in ${topSkills.slice(0, 3).join(', ') || 'core skills'}. Focus on the listed gaps to improve role fit.`;

  const strengths = buildPersonalizedStrengths({ ...analysis, technicalSkills, softSkills, topSkills }, sources, focusArea);

  return {
    ...analysis,
    technicalSkills,
    softSkills,
    summary,
    gaps,
    recommendations,
    industryRelevanceScore,
    industryInsights,
    topSkills,
    strengths,
  };
}

function buildAIStrengths(analysis: Awaited<ReturnType<typeof analyzeProfileText>>): string[] {
  const strengths = new Set<string>();

  analysis.topSkills.slice(0, 4).forEach((skill) => strengths.add(`Strong signal in ${skill}`));
  analysis.technicalSkills.slice(0, 2).forEach((skill) => strengths.add(`Technical strength: ${skill.name}`));
  analysis.softSkills.slice(0, 2).forEach((skill) => strengths.add(`Soft-skill strength: ${skill.name}`));

  return Array.from(strengths).slice(0, 5);
}

function buildAIJobRecommendations(analysis: Awaited<ReturnType<typeof analyzeProfileText>>): JobRecommendation[] {
  const skillLookup = createSkillLookup([
    ...analysis.topSkills,
    ...analysis.technicalSkills.map((skill) => skill.name),
    ...analysis.softSkills.map((skill) => skill.name),
  ]);

  const matchedGapText = analysis.gaps[0] ?? 'your current profile direction';
  const topSkillsText = analysis.topSkills.slice(0, 3).join(', ') || 'your strongest signals';
  const softSkillTokens = new Set(analysis.softSkills.map((skill) => normalizeToken(skill.name)));
  const gapTokens = createSkillLookup(analysis.gaps);

  const countHits = (items: string[]) => items.reduce((total, item) => total + (skillLookup.has(normalizeToken(item)) ? 1 : 0), 0);
  const countSoftHits = (items: string[]) => items.reduce((total, item) => total + (softSkillTokens.has(normalizeToken(item)) ? 1 : 0), 0);
  const countGapHits = (items: string[]) => items.reduce((total, item) => total + (gapTokens.has(normalizeToken(item)) ? 1 : 0), 0);

  const templates = [
    {
      id: 1,
      title: 'Product Engineer',
      company: 'Digital Experience Co.',
      salary: '$105K – $140K',
      location: 'Hybrid',
      type: 'Full-time',
      skills: ['Communication', 'Problem Solving', 'React', 'Testing'],
      focus: ['communication', 'problem solving', 'teamwork', 'testing', 'react', 'product', 'ownership'],
      gapFocus: ['ownership', 'testing', 'product'],
      description: `Strong fit for profiles with execution, ownership, and collaboration signals. Your AI analysis suggests you can translate technical depth into product-focused delivery.`,
    },
    {
      id: 2,
      title: 'Frontend Engineer',
      company: 'Product Studio',
      salary: '$110K – $145K',
      location: 'Remote / Hybrid',
      type: 'Full-time',
      skills: ['React', 'TypeScript', 'Next.js', 'Accessibility'],
      focus: ['react', 'typescript', 'next.js', 'javascript', 'ui', 'accessibility', 'design'],
      gapFocus: ['accessibility', 'design'],
      description: `Best for building polished interfaces, component systems, and accessible product experiences from your strongest technical signals.`,
    },
    {
      id: 3,
      title: 'Full Stack Engineer',
      company: 'ScaleUp Labs',
      salary: '$120K – $160K',
      location: 'Remote / Hybrid',
      type: 'Full-time',
      skills: ['Node.js', 'React', 'PostgreSQL', 'AWS'],
      focus: ['node.js', 'node', 'react', 'typescript', 'sql', 'database', 'aws', 'api', 'backend'],
      gapFocus: ['backend', 'database', 'sql', 'api', 'aws'],
      description: `Best when the profile shows frontend strength plus enough backend or data system signal to take ownership across the stack.`,
    },
    {
      id: 4,
      title: 'Platform Engineer',
      company: 'Cloud Native Systems',
      salary: '$125K – $170K',
      location: 'Remote',
      type: 'Full-time',
      skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS'],
      focus: ['docker', 'kubernetes', 'aws', 'cloud', 'devops', 'ci/cd', 'cicd', 'deployment'],
      gapFocus: ['cloud', 'devops', 'deployment', 'cicd', 'ci/cd'],
      description: `Best for profiles that need more cloud delivery, automation, and infrastructure ownership.`,
    },
    {
      id: 5,
      title: 'Backend / API Engineer',
      company: 'Data Driven Products',
      salary: '$115K – $155K',
      location: 'Remote / Hybrid',
      type: 'Full-time',
      skills: ['Node.js', 'REST APIs', 'SQL', 'GraphQL'],
      focus: ['node.js', 'node', 'sql', 'database', 'graphql', 'api', 'backend'],
      gapFocus: ['api', 'backend', 'database', 'sql', 'graphql'],
      description: `Useful when your profile shows strong delivery and a need to deepen API, database, or backend ownership.`,
    },
    {
      id: 6,
      title: 'Developer Experience Engineer',
      company: 'Toolchain Studio',
      salary: '$115K – $150K',
      location: 'Remote',
      type: 'Full-time',
      skills: ['Communication', 'Mentoring', 'React', 'Testing'],
      focus: ['communication', 'mentoring', 'presentation', 'teamwork', 'testing', 'developer experience', 'docs'],
      gapFocus: ['communication', 'mentoring', 'testing', 'docs'],
      description: `Best for profiles that combine technical fluency with communication and mentoring strength, especially when building internal tools or developer-facing products.`,
    },
  ];

  return templates
    .map((template) => {
      const matchCount = countHits(template.focus);
      const softHitCount = countSoftHits(template.focus);
      const gapHitCount = countGapHits(template.gapFocus ?? []);
      const topSkillHitCount = analysis.topSkills.reduce((total, skill) => total + (template.focus.includes(normalizeToken(skill)) ? 1 : 0), 0);

      const roleSpecificBoost = template.title === 'Product Engineer'
        ? softHitCount * 6 + topSkillHitCount * 4 + gapHitCount * 2
        : template.title === 'Frontend Engineer'
          ? topSkillHitCount * 5 + gapHitCount * 2
          : template.title === 'Full Stack Engineer'
            ? topSkillHitCount * 4 + gapHitCount * 4
            : template.title === 'Platform Engineer'
              ? gapHitCount * 6 + topSkillHitCount * 2
              : template.title === 'Backend / API Engineer'
                ? gapHitCount * 5 + topSkillHitCount * 2
                : softHitCount * 5 + topSkillHitCount * 2;

      const weightedScore = 48 + (matchCount * 5) + (topSkillHitCount * 4) + (softHitCount * 3) + roleSpecificBoost;
      const matchPercentage = Math.min(97, Math.max(55, Math.round(weightedScore)));

      const fitReason = template.title === 'Product Engineer'
        ? `This aligns with ${topSkillsText} and your strongest collaboration signals, especially ${analysis.softSkills.slice(0, 2).map((skill) => skill.name).join(' and ') || 'soft-skill strength'}.`
        : template.title === 'Frontend Engineer'
          ? `Best supported by your technical strengths in ${topSkillsText} and front-end focused work.`
          : template.title === 'Full Stack Engineer'
            ? `Good match if you want to turn ${matchedGapText} into a next-step growth area while keeping your front-end strengths.`
            : template.title === 'Platform Engineer'
              ? 'Strong if your analysis shows cloud, deployment, or DevOps growth opportunities that can level up your delivery.'
              : template.title === 'Backend / API Engineer'
                ? 'Good fit when your AI analysis highlights backend, API, or database growth opportunities.'
                : 'Works well if your profile shows collaboration, clarity, and product communication strength.';

      return {
        id: template.id,
        title: template.title,
        company: template.company,
        matchPercentage,
        salary: template.salary,
        location: template.location,
        type: template.type,
        skills: template.skills,
        description: `${template.description} ${fitReason}`.trim(),
        applyUrl: '#',
        fitReason,
      };
    })
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, 5);
}

function buildAILearningPath(
  analysis: Awaited<ReturnType<typeof analyzeProfileText>>,
  sources: string[],
  focusArea: 'frontend' | 'fullstack' | 'platform' | 'general',
): LearningPathItem[] {
  const gapText = analysis.gaps.join(' ').toLowerCase();
  const topSkills = analysis.topSkills.slice(0, 3);
  const topSkillsText = topSkills.length > 0 ? formatList(topSkills) : 'your current strengths';
  const gapSet = createSkillLookup(analysis.gaps);
  const techSet = createSkillLookup(analysis.technicalSkills.map((skill) => skill.name));
  const softSet = createSkillLookup(analysis.softSkills.map((skill) => skill.name));

  const hasGap = (...terms: string[]) => terms.some((term) => gapSet.has(normalizeToken(term)) || gapText.includes(normalizeToken(term)));
  const hasTech = (...terms: string[]) => terms.some((term) => techSet.has(normalizeToken(term)));
  const hasSoft = (...terms: string[]) => terms.some((term) => softSet.has(normalizeToken(term)));

  const candidateResources: Record<string, LearningResource[]> = {
    'Python Backend & Automation': [
      {
        type: 'documentation',
        title: 'Python Documentation',
        provider: 'Python Software Foundation',
        url: 'https://docs.python.org/3/',
        free: true,
      },
      {
        type: 'documentation',
        title: 'FastAPI Docs',
        provider: 'FastAPI',
        url: 'https://fastapi.tiangolo.com/',
        free: true,
      },
      {
        type: 'documentation',
        title: 'pytest Docs',
        provider: 'pytest',
        url: 'https://docs.pytest.org/en/stable/',
        free: true,
      },
    ],
    'TypeScript & Architecture': [
      {
        type: 'documentation',
        title: 'TypeScript Handbook',
        provider: 'Official TypeScript Docs',
        url: 'https://www.typescriptlang.org/docs/',
        free: true,
      },
      {
        type: 'book',
        title: 'Programming TypeScript',
        provider: 'O\'Reilly',
        url: 'https://www.oreilly.com/library/view/programming-typescript/9781492037651/',
        free: false,
      },
      {
        type: 'course',
        title: 'TypeScript Deep Dive',
        provider: 'Udemy',
        url: 'https://www.udemy.com/',
        free: false,
      },
    ],
    'Frontend Delivery': [
      {
        type: 'documentation',
        title: 'React Docs',
        provider: 'React',
        url: 'https://react.dev/',
        free: true,
      },
      {
        type: 'documentation',
        title: 'Next.js Docs',
        provider: 'Vercel',
        url: 'https://nextjs.org/docs',
        free: true,
      },
      {
        type: 'course',
        title: 'Frontend Masters React Path',
        provider: 'Frontend Masters',
        url: 'https://frontendmasters.com/',
        free: false,
      },
    ],
    'Backend APIs & Data': [
      {
        type: 'documentation',
        title: 'Node.js Docs',
        provider: 'Node.js',
        url: 'https://nodejs.org/en/docs',
        free: true,
      },
      {
        type: 'documentation',
        title: 'PostgreSQL Docs',
        provider: 'PostgreSQL',
        url: 'https://www.postgresql.org/docs/',
        free: true,
      },
      {
        type: 'course',
        title: 'REST API Design',
        provider: 'Udemy',
        url: 'https://www.udemy.com/',
        free: false,
      },
    ],
    'Cloud, Deployment & CI/CD': [
      {
        type: 'documentation',
        title: 'Docker Docs',
        provider: 'Docker',
        url: 'https://docs.docker.com/',
        free: true,
      },
      {
        type: 'documentation',
        title: 'GitHub Actions Docs',
        provider: 'GitHub',
        url: 'https://docs.github.com/en/actions',
        free: true,
      },
      {
        type: 'course',
        title: 'AWS Skill Builder',
        provider: 'Amazon Web Services',
        url: 'https://skillbuilder.aws/',
        free: true,
      },
    ],
    'Testing & Quality': [
      {
        type: 'documentation',
        title: 'Playwright Docs',
        provider: 'Microsoft',
        url: 'https://playwright.dev/',
        free: true,
      },
      {
        type: 'documentation',
        title: 'Jest Docs',
        provider: 'Jest',
        url: 'https://jestjs.io/docs/getting-started',
        free: true,
      },
      {
        type: 'course',
        title: 'Testing JavaScript Applications',
        provider: 'Frontend Masters',
        url: 'https://frontendmasters.com/',
        free: false,
      },
    ],
    'System Design & Storytelling': [
      {
        type: 'book',
        title: 'Designing Data-Intensive Applications',
        provider: 'O\'Reilly',
        url: 'https://dataintensive.net/',
        free: false,
      },
      {
        type: 'video',
        title: 'ByteByteGo System Design Videos',
        provider: 'ByteByteGo',
        url: 'https://www.youtube.com/@ByteByteGo',
        free: true,
      },
      {
        type: 'documentation',
        title: 'System Design Primer',
        provider: 'GitHub',
        url: 'https://github.com/donnemartin/system-design-primer',
        free: true,
      },
    ],
    'Communication & Product Delivery': [
      {
        type: 'documentation',
        title: 'Product Discovery Reading List',
        provider: 'Mind the Product',
        url: 'https://www.mindtheproduct.com/',
        free: true,
      },
      {
        type: 'course',
        title: 'Technical Communication for Engineers',
        provider: 'Coursera',
        url: 'https://www.coursera.org/',
        free: false,
      },
      {
        type: 'book',
        title: 'Made to Stick',
        provider: 'Random House',
        url: 'https://heathbrothers.com/books/made-to-stick/',
        free: false,
      },
    ],
  };

  const candidates: Array<{
    id: number;
    topic: string;
    priority: LearningPathItem['priority'];
    timeEstimate: string;
    explanation: string;
    resources: LearningResource[];
    score: number;
  }> = [
    {
      id: 1,
      topic: 'Python Backend & Automation',
      priority: hasTech('python') ? 'high' : 'medium',
      timeEstimate: '3–5 weeks',
      explanation: `Your profile shows Python as a real signal, so this path turns that strength into more visible backend, API, and automation evidence.`,
      resources: candidateResources['Python Backend & Automation'],
      score: (hasTech('python') ? 4 : 0) + (hasGap('backend', 'api', 'testing') ? 2 : 0) + (focusArea === 'general' ? 1 : 0),
    },
    {
      id: 2,
      topic: 'TypeScript & Architecture',
      priority: hasTech('typescript', 'react') ? 'high' : 'medium',
      timeEstimate: '3–4 weeks',
      explanation: `Your profile around ${topSkillsText} suggests this is the fastest way to make your existing work more reusable and production-ready.`,
      resources: candidateResources['TypeScript & Architecture'],
      score: (hasTech('typescript') ? 3 : 0) + (hasTech('react', 'next.js') ? 2 : 0) + (hasGap('architecture', 'system design') ? 1 : 0),
    },
    {
      id: 3,
      topic: 'Frontend Delivery',
      priority: focusArea === 'frontend' || hasTech('react', 'next.js', 'ui') ? 'high' : 'medium',
      timeEstimate: '2–4 weeks',
      explanation: `This path sharpens the frontend work already visible in your linked profiles and makes the delivery side of your UI work easier to show.`,
      resources: candidateResources['Frontend Delivery'],
      score: (hasTech('react', 'next.js') ? 3 : 0) + (hasSoft('communication', 'ownership') ? 2 : 0) + (hasGap('testing') ? 1 : 0),
    },
    {
      id: 4,
      topic: 'Backend APIs & Data',
      priority: hasGap('backend', 'api', 'database', 'sql') || hasTech('node.js', 'graphql') ? 'high' : 'medium',
      timeEstimate: '4–5 weeks',
      explanation: `Your profile signals enough product and implementation depth to benefit from stronger backend and data-system evidence.`,
      resources: candidateResources['Backend APIs & Data'],
      score: (hasGap('backend', 'api', 'database') ? 3 : 0) + (hasTech('node.js', 'graphql', 'sql') ? 2 : 0) + (focusArea === 'fullstack' ? 1 : 0),
    },
    {
      id: 5,
      topic: 'Cloud, Deployment & CI/CD',
      priority: hasGap('cloud', 'devops', 'deployment', 'ci/cd', 'cicd') || hasTech('docker', 'aws', 'kubernetes') ? 'high' : 'medium',
      timeEstimate: '4–6 weeks',
      explanation: `The current profile can be lifted by adding more visible delivery, deployment, and infrastructure ownership.`,
      resources: candidateResources['Cloud, Deployment & CI/CD'],
      score: (hasGap('cloud', 'devops', 'ci/cd') ? 3 : 0) + (hasTech('docker', 'aws', 'kubernetes') ? 2 : 0),
    },
    {
      id: 6,
      topic: 'Testing & Quality',
      priority: hasGap('testing', 'automation', 'coverage') ? 'high' : 'medium',
      timeEstimate: '2–3 weeks',
      explanation: `More testing evidence will make your current skills feel more trustworthy and easier to position for stronger roles.`,
      resources: candidateResources['Testing & Quality'],
      score: (hasGap('testing', 'automation', 'coverage') ? 3 : 0) + (hasTech('jest', 'playwright') ? 2 : 0),
    },
    {
      id: 7,
      topic: 'System Design & Storytelling',
      priority: hasGap('system design', 'architecture', 'scalability') ? 'high' : 'medium',
      timeEstimate: '4–6 weeks',
      explanation: `This helps convert the skills surfaced in your linked profiles into a stronger story for interviews and role transitions.`,
      resources: candidateResources['System Design & Storytelling'],
      score: (hasGap('system design', 'architecture') ? 3 : 0) + (hasSoft('communication', 'presentation') ? 2 : 0),
    },
    {
      id: 8,
      topic: 'Communication & Product Delivery',
      priority: hasSoft('communication', 'presentation', 'mentoring') ? 'high' : 'medium',
      timeEstimate: '2–4 weeks',
      explanation: `Your profile sources show collaboration and delivery signals that can be translated into clearer product narratives and stronger cross-functional impact.`,
      resources: candidateResources['Communication & Product Delivery'],
      score: (hasSoft('communication', 'presentation') ? 3 : 0) + (sources.length > 1 ? 1 : 0),
    },
  ];

  const ranked = candidates
    .filter((candidate) => candidate.score > 0 || candidate.priority === 'high')
    .sort((a, b) => b.score - a.score || (a.priority === b.priority ? a.id - b.id : a.priority === 'high' ? -1 : 1));

  const selected = ranked.slice(0, 4);

  return selected.map((item, index) => {
    const skillPhrase = topSkills.length > 0 ? formatList(topSkills) : 'your core skills';
    const sourcePhrase = sources.length > 0 ? formatList(sources) : 'your linked profiles';
    const gapPhrase = analysis.gaps.length > 0 ? formatList(analysis.gaps.slice(0, 2)) : 'the current skill gaps';

    return {
      id: item.id,
      topic: item.topic,
      priority: item.priority,
      timeEstimate: item.timeEstimate,
      explanation: `${item.explanation} It ties ${sourcePhrase} to ${skillPhrase}, while addressing ${gapPhrase}.`,
      resources: item.resources,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const { links }: { links: SocialLinks } = await request.json();
    let extractedSkills: Skill[] = [];

    // Scrape GitHub
    if (links.github) {
      const githubSkills = await scrapeGitHub(links.github);
      extractedSkills.push(...githubSkills);
    }

    // Scrape LinkedIn
    if (links.linkedin) {
      const linkedinSkills = await scrapeLinkedIn(links.linkedin);
      extractedSkills.push(...linkedinSkills);
    }

    // Scrape Portfolio
    if (links.portfolio) {
      const portfolioSkills = await scrapePortfolio(links.portfolio);
      extractedSkills.push(...portfolioSkills);
    }

    // Scrape Dev.to
    if (links.devto) {
      const devtoSkills = await scrapeDevTo(links.devto);
      extractedSkills.push(...devtoSkills);
    }

    // Add fallback from resume and twitter URLs text
    if (links.resume) {
      extractedSkills.push(...extractSkillsFromText(links.resume, 'Resume URL'));
    }
    if (links.twitter) {
      extractedSkills.push(...extractSkillsFromText(links.twitter, 'Twitter URL'));
    }

    // Deduplicate skill results
    const uniqueSkillMap = new Map<string, Skill>();

    extractedSkills.forEach((skill) => {
      const key = `${skill.name.toLowerCase()}|${skill.source}`;
      if (!uniqueSkillMap.has(key)) {
        uniqueSkillMap.set(key, skill);
      }
    });

    extractedSkills = Array.from(uniqueSkillMap.values());

    // Combine with AI result
    const rawText = buildProfileText(links, extractedSkills);
    const aiAnalysis = await analyzeProfileText(rawText).catch((error) => {
      console.error('AI analysis failure: ', error);
      return {
        technicalSkills: [],
        softSkills: [],
        summary: '',
        gaps: [],
        recommendations: [],
        topSkills: [],
        strengths: [],
        industryRelevanceScore: 0,
        industryInsights: '',
        jobRecommendations: [],
        learningPath: [],
        rawText,
      };
    });

    const processedAnalysis = enrichAnalysis(aiAnalysis, extractedSkills);
    const sources = getProfileSources(extractedSkills);
    const focusArea = detectFocusArea(processedAnalysis.technicalSkills);
    const aiStrengths = buildAIStrengths(processedAnalysis);
    const aiJobRecommendations = buildAIJobRecommendations(processedAnalysis);
    const aiLearningPath = buildAILearningPath(processedAnalysis, sources, focusArea);

    const aiSkills: Skill[] = [
      ...processedAnalysis.technicalSkills.map((s) => ({ name: s.name, confidence: s.confidence, source: s.source || 'AI-Technical' })),
      ...processedAnalysis.softSkills.map((s) => ({ name: s.name, confidence: s.confidence, source: s.source || 'AI-Soft' })),
    ];

    const combinedSkillsMap = new Map<string, Skill>();
    [...extractedSkills, ...aiSkills].forEach((skill) => {
      const key = `${skill.name.toLowerCase()}|${skill.source}`;
      if (!combinedSkillsMap.has(key)) {
        combinedSkillsMap.set(key, skill);
      }
    });

    const combinedSkills = aggregateSkillsByName(Array.from(combinedSkillsMap.values()));

    return NextResponse.json({
      skills: combinedSkills,
      aiSummary: processedAnalysis.summary,
      aiStrengths,
      aiGaps: processedAnalysis.gaps,
      aiRecommendations: processedAnalysis.recommendations,
      aiTechnicalSkills: processedAnalysis.technicalSkills,
      aiSoftSkills: processedAnalysis.softSkills,
      aiIndustryRelevanceScore: processedAnalysis.industryRelevanceScore,
      aiIndustryInsights: processedAnalysis.industryInsights,
      aiTopSkills: processedAnalysis.topSkills,
      aiJobRecommendations,
      aiLearningPath,
    });
  } catch (error) {
    console.error('Error analyzing profile:', error);
    return NextResponse.json(
      { error: 'Failed to analyze profile' },
      { status: 500 }
    );
  }
}

async function scrapeGitHub(url: string): Promise<Skill[]> {
  try {
    const username = url.split('/').filter(Boolean).pop();
    if (!username) return [];

    const response = await fetch(`https://api.github.com/users/${username}/repos`);
    if (!response.ok) return [];

    const repos = await response.json();
    const languageSet = new Set<string>();

    for (const repo of repos.slice(0, 10)) {
      if (repo.language) {
        languageSet.add(repo.language.toLowerCase());
      }
      if (repo?.description) {
        extractSkillsFromText(repo.description, 'GitHub').forEach((skill) => {
          languageSet.add(skill.name.toLowerCase());
        });
      }
    }

    return Array.from(languageSet).map((lang): Skill => ({
      name: normalizeSkill(lang),
      confidence: 0.75,
      source: 'GitHub',
    }));
  } catch (error) {
    console.error('GitHub scrape failed:', error);
    return [];
  }
}

async function scrapeLinkedIn(url: string): Promise<Skill[]> {
  try {
    const candidateSkills = extractSkillsFromText(url, 'LinkedIn URL');
    if (candidateSkills.length > 0) return candidateSkills;

    const username = url.split('/').filter(Boolean).pop() || 'linkedin-user';
    return [
      { name: 'Leadership', confidence: 0.55, source: 'LinkedIn' },
      { name: normalizeSkill(username), confidence: 0.45, source: 'LinkedIn username' },
    ];
  } catch {
    return [{ name: 'Leadership', confidence: 0.5, source: 'LinkedIn' }];
  }
}

async function scrapePortfolio(url: string): Promise<Skill[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    const skills = extractSkillsFromText(html, 'Portfolio');
    return skills;
  } catch (error) {
    console.error('Portfolio scrape failed:', error);
    return [];
  }
}

async function scrapeDevTo(url: string): Promise<Skill[]> {
  try {
    const username = url.split('/').filter(Boolean).pop();
    if (!username) return [];

    const response = await fetch(`https://dev.to/api/articles?username=${username}`);
    if (!response.ok) return [];

    const articles = await response.json();
    let skillSet = new Set<string>();
    articles.forEach((article: { title: string; description?: string }) => {
      extractSkillsFromText(article.title, 'Dev.to').forEach((skill) => skillSet.add(skill.name.toLowerCase()));
      if (article.description) {
        extractSkillsFromText(article.description, 'Dev.to').forEach((skill) => skillSet.add(skill.name.toLowerCase()));
      }
    });

    return Array.from(skillSet).map((skill) => ({
      name: normalizeSkill(skill),
      confidence: 0.65,
      source: 'Dev.to',
    }));
  } catch (error) {
    console.error('Dev.to scrape failed:', error);
    return [];
  }
}