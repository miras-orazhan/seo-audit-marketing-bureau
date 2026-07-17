// ============================================================
// Типы данных для SEO-аудита
// ============================================================

export type Severity = 'critical' | 'warning' | 'info' | 'ok';

export interface TechIssue {
  id: string;
  category:
    | 'meta'
    | 'status'
    | 'sitemap'
    | 'canonical'
    | 'schema'
    | 'security'
    | 'performance'
    | 'mobile'
    | 'links'
    | 'robots';
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
  impact: number; // 0–100, насколько влияет на SEO
  effort: 'low' | 'medium' | 'high'; // трудозатраты на исправление
}

export interface MetaTags {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogType: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  robots: string | null;
  language: string | null;
  favicon: string | null;
  appleTouchIcon: string | null;
  themeColor: string | null;
}

export interface HeadingItem {
  level: number;
  text: string;
}

export interface SchemaBlock {
  type: string;
  raw: string;
  valid: boolean;
  errors?: string[];
}

export interface SecurityHeaders {
  'strict-transport-security'?: string;
  'content-security-policy'?: string;
  'x-frame-options'?: string;
  'x-content-type-options'?: string;
  'referrer-policy'?: string;
  'permissions-policy'?: string;
}

export interface PageAudit {
  url: string;
  status: number;
  finalUrl: string;
  redirectChain: string[];
  loadTimeMs: number;
  responseSizeKb: number;
  meta: MetaTags;
  headings: HeadingItem[];
  wordCount: number;
  contentTextSample: string; // первые ~3000 символов основного текста
  images: { src: string; alt: string | null }[];
  internalLinks: number;
  externalLinks: number;
  brokenLinks: { url: string; status: number }[];
  schemas: SchemaBlock[];
  securityHeaders: SecurityHeaders;
  robotsTxtFound: boolean;
  sitemapXmlFound: boolean;
  isMobileFriendly: boolean;
  httpsRedirect: boolean | null; // true = http→https работает, false = нет, null = недоступен http
  phones: string[]; // найденные на странице телефоны
  emails: string[]; // найденные на странице email'ы
  urlStructure: {
    isHumanReadable: boolean;
    issues: string[]; // например, "URL содержит query-параметры", "URL содержит ID"
  };
  issues: TechIssue[];
  aiAnalysis?: AIContentAnalysis;
}

export interface AIContentFix {
  type: 'title' | 'description' | 'headings' | 'content_block' | 'faq_schema' | 'internal_link' | 'intent';
  title: string;
  before?: string;
  after?: string;
  rationale: string;
  impact: number; // 0–100
  effort: 'low' | 'medium' | 'high';
}

export interface AIContentAnalysis {
  intent: {
    detected: string;
    matchScore: number; // 0–100, насколько контент соответствует интенту
    gaps: string[];
  };
  contentScore: number; // 0–100
  fixes: AIContentFix[];
  summary: string;
}

export interface AuditReport {
  id: string;
  startedAt: string;
  completedAt: string;
  targetUrl: string;
  overallScore: number; // 0–100
  technicalScore: number;
  contentScore: number;
  pages: PageAudit[];
  topIssues: TechIssue[];
  roadmap: RoadmapItem[];
}

export interface RoadmapItem {
  rank: number;
  title: string;
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
  category: 'technical' | 'content';
  pageUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
