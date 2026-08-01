'use client';

import { cn } from '@/lib/utils';
import type { Severity } from '@/lib/seo-types';
import { Tooltip } from './hint';

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Критично',
  warning: 'Внимание',
  info: 'Инфо',
  ok: 'OK',
};

const SEVERITY_DOT: Record<Severity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  ok: 'bg-emerald-500',
};

interface SeverityBadgeProps {
  severity: Severity;
  showDot?: boolean;
  className?: string;
}

const SEVERITY_HINTS: Record<Severity, string> = {
  critical: 'Критическая проблема — срочно влияет на индексацию или доступность сайта.',
  warning: 'Внимание — проблема снижает позиции или ухудшает SEO, но не блокирует сайт.',
  info: 'Информация — улучшение, не обязательное к срочному исправлению.',
  ok: 'Проверка пройдена, всё в порядке.',
};

export function SeverityBadge({ severity, showDot = true, className }: SeverityBadgeProps) {
  return (
    <Tooltip content={SEVERITY_HINTS[severity]}>
      <span
        className={cn(
          'inline-flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
          SEVERITY_STYLES[severity],
          className,
        )}
      >
        {showDot && <span className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_DOT[severity])} />}
        {SEVERITY_LABEL[severity]}
      </span>
    </Tooltip>
  );
}

// Буквенная оценка для справки
export function scoreToGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 90) return { grade: 'A+', color: '#10b981', label: 'Отлично' };
  if (score >= 80) return { grade: 'A', color: '#10b981', label: 'Хорошо' };
  if (score >= 70) return { grade: 'B+', color: '#84cc16', label: 'Неплохо' };
  if (score >= 60) return { grade: 'B', color: '#eab308', label: 'Средне' };
  if (score >= 50) return { grade: 'C+', color: '#f59e0b', label: 'Можно лучше' };
  if (score >= 40) return { grade: 'C', color: '#f97316', label: 'Ниже среднего' };
  if (score >= 30) return { grade: 'D', color: '#ef4444', label: 'Плохо' };
  return { grade: 'F', color: '#dc2626', label: 'Очень плохо' };
}

export function ScoreRing({
  score,
  size = 96,
  label,
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#ef4444' : '#991b1b';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={6}
          fill="none"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}%
        </span>
        {label && <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

// Простые цветные индикаторы статуса
export function StatusDot({ severity }: { severity: 'critical' | 'warning' | 'info' | 'ok' }) {
  const colors = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
    ok: 'bg-emerald-500',
  };
  return <span className={cn('inline-block h-2.5 w-2.5 rounded-full', colors[severity])} />;
}
