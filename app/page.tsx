'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Briefcase,
  ExternalLink,
  Github,
  Lightbulb,
  Linkedin,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { mockUserProfile } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import type { LearningResource, SocialLinks } from '@/lib/types';

const animationVariant = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const resourceLabel: Record<LearningResource['type'], string> = {
  book: 'Book',
  course: 'Course',
  documentation: 'Documentation',
  video: 'Video',
};

const priorityClass = {
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function HomePage() {
  const [links, setLinks] = useState<SocialLinks>(mockUserProfile.links);
  const [expandedJobs, setExpandedJobs] = useState(false);

  const jobsToShow = useMemo(
    () => mockUserProfile.jobRecommendations.slice(0, expandedJobs ? 5 : 3),
    [expandedJobs],
  );

  const averageTechnical = useMemo(() => {
    const total = mockUserProfile.technicalSkills.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / mockUserProfile.technicalSkills.length);
  }, []);

  const averageSoft = useMemo(() => {
    const total = mockUserProfile.softSkills.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / mockUserProfile.softSkills.length);
  }, []);

  const updateLink = (field: keyof SocialLinks, value: string) => {
    setLinks((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8 lg:gap-10 lg:py-12">
      <motion.section
        initial="hidden"
        animate="visible"
        variants={animationVariant}
        transition={{ duration: 0.45 }}
        className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-amber-200/40 blur-2xl" />

        <p className="mb-2 inline-flex items-center gap-2 rounded-full chip px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900">
          <Sparkles className="h-3.5 w-3.5" />
          Portfolio Intelligence Dashboard
        </p>
        <h1 className="heading-gradient max-w-3xl text-3xl font-bold sm:text-4xl lg:text-5xl">
          Build your next role strategy with AI-driven skill, fit, and growth insights.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-700 sm:text-base">
          Connect your professional profiles, evaluate your skills, inspect targeted job recommendations,
          and get a learning path tailored to your current experience and industry demand.
        </p>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={animationVariant}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="glass-panel rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <UserCircle2 className="h-6 w-6 text-emerald-700" />
            Professional Link Inputs
          </h2>
          <button
            type="button"
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Analyze Profile
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <LinkInput
            label="GitHub"
            value={links.github}
            onChange={(value) => updateLink('github', value)}
            icon={<Github className="h-4 w-4" />}
          />
          <LinkInput
            label="LinkedIn"
            value={links.linkedin}
            onChange={(value) => updateLink('linkedin', value)}
            icon={<Linkedin className="h-4 w-4" />}
          />
          <LinkInput
            label="Resume"
            value={links.resume}
            onChange={(value) => updateLink('resume', value)}
            icon={<BookOpen className="h-4 w-4" />}
          />
          <LinkInput
            label="Portfolio"
            value={links.portfolio ?? ''}
            onChange={(value) => updateLink('portfolio', value)}
            icon={<ExternalLink className="h-4 w-4" />}
          />
          <LinkInput
            label="Twitter"
            value={links.twitter ?? ''}
            onChange={(value) => updateLink('twitter', value)}
            icon={<ExternalLink className="h-4 w-4" />}
          />
          <LinkInput
            label="Dev.to"
            value={links.devto ?? ''}
            onChange={(value) => updateLink('devto', value)}
            icon={<ExternalLink className="h-4 w-4" />}
          />
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={animationVariant}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <RadarPanel
          title="Technical Skill Spider Graph"
          subtitle={`Average score ${averageTechnical}%`}
          data={mockUserProfile.technicalSkills}
          stroke="#02553d"
          fill="#047857"
        />
        <RadarPanel
          title="Experience & Soft Skills Spider Graph"
          subtitle={`Average score ${averageSoft}%`}
          data={mockUserProfile.softSkills}
          stroke="#9a3412"
          fill="#ea580c"
        />
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={animationVariant}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="glass-panel rounded-3xl p-6 sm:p-8"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Briefcase className="h-6 w-6 text-emerald-700" />
            Job Recommendation System
          </h2>
          <button
            type="button"
            onClick={() => setExpandedJobs((prev) => !prev)}
            className="rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
          >
            {expandedJobs ? 'Show Top 3' : 'Expand to Top 5'}
          </button>
        </div>

        <div className="grid gap-4">
          {jobsToShow.map((job) => (
            <article key={job.id} className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                  <p className="text-sm text-slate-600">
                    {job.company} · {job.location}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {job.matchPercentage}% match
                </span>
              </div>
              <p className="mb-2 text-sm text-slate-700">{job.description}</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <span
                    key={`${job.id}-${skill}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-sm font-medium text-slate-800">
                {job.type} · {job.salary}
              </p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={animationVariant}
        transition={{ duration: 0.45, delay: 0.14 }}
        className="grid gap-6 lg:grid-cols-5"
      >
        <article className="glass-panel rounded-3xl p-6 lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Sparkles className="h-6 w-6 text-emerald-700" />
            AI Summary: Skills, Experience, Industry Relevance
          </h2>
          <p className="text-sm leading-6 text-slate-700">{mockUserProfile.aiSummary.overview}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">Strengths</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {mockUserProfile.aiSummary.strengths.map((item) => (
                  <li key={item} className="rounded-xl bg-emerald-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-orange-700">Growth Gaps</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                {mockUserProfile.aiSummary.gaps.map((item) => (
                  <li key={item} className="rounded-xl bg-orange-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <article className="glass-panel rounded-3xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900">Industry Relevance</h3>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4">
            <p className="text-3xl font-bold text-emerald-800">
              {mockUserProfile.aiSummary.industryRelevanceScore}%
            </p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${mockUserProfile.aiSummary.industryRelevanceScore}%` }}
              />
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{mockUserProfile.aiSummary.industryInsights}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {mockUserProfile.aiSummary.topSkills.map((skill) => (
              <span key={skill} className="rounded-full chip px-3 py-1 text-xs font-semibold text-emerald-800">
                {skill}
              </span>
            ))}
          </div>
        </article>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={animationVariant}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="glass-panel rounded-3xl p-6 sm:p-8"
      >
        <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Lightbulb className="h-6 w-6 text-amber-600" />
          AI Learning Path Suggestions
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          {mockUserProfile.learningPath.map((path) => (
            <article key={path.id} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{path.topic}</h3>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold uppercase',
                    priorityClass[path.priority],
                  )}
                >
                  {path.priority}
                </span>
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estimated time: {path.timeEstimate}
              </p>
              <p className="mb-4 text-sm leading-6 text-slate-700">{path.explanation}</p>

              <div className="space-y-2">
                {path.resources.map((resource) => (
                  <a
                    key={`${path.id}-${resource.title}`}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="font-medium text-slate-800">
                      {resource.title}
                      {resource.provider ? ` · ${resource.provider}` : ''}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-emerald-700">
                      {resourceLabel[resource.type]}
                      {resource.free ? ' · Free' : ''}
                    </span>
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </motion.section>
    </main>
  );
}

function RadarPanel({
  title,
  subtitle,
  data,
  stroke,
  fill,
}: {
  title: string;
  subtitle: string;
  data: { skill: string; value: number; fullMark: number }[];
  stroke: string;
  fill: string;
}) {
  return (
    <article className="glass-panel rounded-3xl p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-600">{subtitle}</p>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#bed3bf" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: '#334155', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={stroke} fill={fill} fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function LinkInput({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${label} URL`}
          className="w-full rounded-xl border border-slate-300 bg-white px-10 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </span>
    </label>
  );
}
