'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// ============================================================
// Валидация
// ============================================================

/** Форматирует ввод телефона в формат +7 (XXX) XXX-XX-XX в реальном времени */
function formatPhoneInput(raw: string): string {
  // Удаляем всё кроме цифр
  let digits = raw.replace(/\D/g, '');
  // Если пусто — возвращаем пусто
  if (digits.length === 0) return '';
  // Если начинается на 8 — заменяем на 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  // Если не начинается на 7 — добавляем 7 в начало
  if (!digits.startsWith('7')) digits = '7' + digits;
  // Ограничиваем 11 цифрами (7 + 10 цифр номера)
  digits = digits.slice(0, 11);

  // Форматируем: +7 (XXX) XXX-XX-XX
  let result = '+7';
  if (digits.length > 1) result += ' (' + digits.slice(1, 4);
  if (digits.length >= 4) result += ')';
  if (digits.length >= 5) result += ' ' + digits.slice(4, 7);
  if (digits.length >= 7) result += '-' + digits.slice(7, 9);
  if (digits.length >= 9) result += '-' + digits.slice(9, 11);
  return result;
}

/** Валидирует телефон: +7 и 11 цифр всего */
function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return 'Телефон обязателен';
  if (!digits.startsWith('7')) return 'Телефон должен начинаться с +7';
  if (digits.length !== 11) return `Телефон должен содержать 11 цифр (сейчас ${digits.length})`;
  return null;
}

/** Валидирует email: базовая проверка + доменная зона 2+ символов */
function validateEmail(email: string): string | null {
  if (!email) return null; // email необязателен
  // Базовая проверка: что-то@что-то.зона
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return 'Некорректный email. Пример: you@company.kz';
  // Проверяем доменную зону — должна быть 2-6 символов после точки
  const domain = email.split('@')[1] || '';
  const tld = domain.split('.').pop() || '';
  if (tld.length < 2 || tld.length > 6) {
    return 'Email должен содержать доменную зону (.kz, .com, .ru и т.д.)';
  }
  return null;
}

/** Валидирует сайт: должен содержать доменную зону */
function validateSite(site: string): string | null {
  if (!site) return null; // сайт необязателен
  // Убираем протокол и www
  let cleaned = site.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '').replace(/^www\./, '');
  // Должна быть точка с зоной после неё (минимум 2 символа)
  const re = /^[a-z0-9-]+\.[a-z]{2,6}([/].*)?$/;
  if (!re.test(cleaned)) {
    return 'Сайт должен содержать доменную зону. Пример: site.kz, company.com';
  }
  return null;
}

export function LeadFormSection() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get('name') as string)?.trim();
    const phone = phoneDisplay; // берём отформатированное значение
    const email = (formData.get('email') as string)?.trim();
    const site = (formData.get('site') as string)?.trim();
    const message = (formData.get('message') as string)?.trim();

    // Валидация
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Имя обязательно';
    const phoneErr = validatePhone(phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const emailErr = validateEmail(email);
    if (emailErr) newErrors.email = emailErr;
    const siteErr = validateSite(site);
    if (siteErr) newErrors.site = siteErr;

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, site, message }),
      });
      const data = (await res.json()) as { ok?: boolean; warning?: string; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось отправить заявку');
      }

      setDone(true);
      toast({
        title: 'Заявка отправлена!',
        description: 'Спасибо! В ближайшее время с вами свяжемся.',
      });
    } catch (err) {
      toast({
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось отправить заявку',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="lead" className="relative overflow-hidden bg-amber-500 text-white">
      {/* Декоративный фон */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-neutral-900/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Левая колонка — оффер */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-white/90">Бесплатная консультация</p>

            <h2 className="mt-4 text-balance font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
              Получите план{' '}
              <span className="text-neutral-900">SEO-продвижения</span>
              <br /> под ваш бизнес
            </h2>

            <p className="mt-5 max-w-lg text-pretty text-base text-white/90 sm:text-lg">
              Закажите бесплатный разбор: SEO-специалист Marketing Bureau проанализирует ваш
              сайт, конкурентов в топе и подготовит план роста позиций в Google и Яндексе.
              Без обязательств.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                'Аудит ниши и конкурентов в топ-10 Google и Яндекс',
                'Прогноз трафика и позиций на 3–6 месяцев',
                'Расчёт стоимости продвижения под ваш бюджет',
                'План контентной стратегии и технических правок',
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-neutral-900" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-white/30 pt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/90">Контакты</p>
              <div className="mt-3 space-y-1.5 text-sm">
                <p>
                  <span className="text-white/70">Телефон:</span>{' '}
                  <a href="tel:+77756367832" className="font-medium text-white hover:text-neutral-900">
                    +7 (775) 636 78 32
                  </a>
                </p>
                <p>
                  <span className="text-white/70">Email:</span>{' '}
                  <a href="mailto:marketingbureau.kz@gmail.com" className="font-medium text-white hover:text-neutral-900">
                    marketingbureau.kz@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Правая колонка — форма */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="relative rounded-2xl border border-white/40 bg-white p-6 text-neutral-900 shadow-2xl sm:p-8">
              {done ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <CheckCircle2 className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold">Спасибо!</h3>
                  <p className="mt-2 max-w-sm text-sm text-neutral-600">
                    Заявка успешно отправлена. В ближайшее время с вами свяжется наш SEO-специалист.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setDone(false);
                      setPhoneDisplay('');
                      setErrors({});
                    }}
                  >
                    Отправить ещё одну заявку
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-display text-2xl font-bold">Оставьте заявку</h3>
                  <p className="mt-1.5 text-sm text-neutral-600">
                    Заполните форму — и мы свяжемся с вами в течение рабочего дня
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="name">Имя</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Как к вам обращаться"
                          required
                          disabled={submitting}
                          aria-invalid={!!errors.name}
                          className={errors.name ? 'border-red-500 focus-visible:border-red-500' : ''}
                          onChange={() => errors.name && setErrors({ ...errors, name: '' })}
                        />
                        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone">Телефон</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+7 (___) ___-__-__"
                          required
                          disabled={submitting}
                          value={phoneDisplay}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            setPhoneDisplay(formatted);
                            if (errors.phone) setErrors({ ...errors, phone: '' });
                          }}
                          aria-invalid={!!errors.phone}
                          className={errors.phone ? 'border-red-500 focus-visible:border-red-500' : ''}
                          inputMode="tel"
                          maxLength={18}
                        />
                        {errors.phone && (
                          <p className="text-xs text-red-600">{errors.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@company.kz"
                        disabled={submitting}
                        aria-invalid={!!errors.email}
                        className={errors.email ? 'border-red-500 focus-visible:border-red-500' : ''}
                        onChange={() => errors.email && setErrors({ ...errors, email: '' })}
                      />
                      {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="site">Адрес сайта</Label>
                      <Input
                        id="site"
                        name="site"
                        placeholder="example.kz"
                        disabled={submitting}
                        aria-invalid={!!errors.site}
                        className={errors.site ? 'border-red-500 focus-visible:border-red-500' : ''}
                        onChange={() => errors.site && setErrors({ ...errors, site: '' })}
                      />
                      {errors.site && (
                        <p className="text-xs text-red-600">{errors.site}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="message">Комментарий</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Коротко о проекте: какие услуги интересуют, есть ли сайт, цели"
                        rows={3}
                        disabled={submitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-neutral-900 text-base font-semibold hover:bg-neutral-800"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Отправляем…
                        </>
                      ) : (
                        <>
                          Отправить заявку
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-neutral-500">
                      Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.
                      Мы не передаём данные третьим лицам.
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
