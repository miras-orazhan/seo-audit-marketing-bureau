'use client';

import { useState, useEffect } from 'react';

interface AdminData {
  services: { id: number; title: string; description: string; order: number; isActive: boolean }[];
  faqs: { id: number; question: string; answer: string; order: number; isActive: boolean }[];
  settings: { id: number; key: string; value: string }[];
  stats: { auditsTotal: number; leadsTotal: number; uniqueSitesAnalyzed: number };
  recentLeads: { id: string; name: string; phone: string; email: string | null; site: string | null; status: string; createdAt: string }[];
  recentAudits: { id: string; url: string; overallScore: number; createdAt: string }[];
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'audits' | 'services' | 'faq' | 'settings'>('dashboard');
  const [editingService, setEditingService] = useState<number | null>(null);
  const [editingFaq, setEditingFaq] = useState<number | null>(null);

  // Проверяем сессию при загрузке
  useEffect(() => {
    const token = localStorage.getItem("adminToken") ?? "";
    if (token) {
      setLoggedIn(true);
      loadData();
    }
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await res.json();
      if (result.token) {
        localStorage.setItem('adminToken', result.token);
        setLoggedIn(true);
        loadData();
      } else {
        setLoginError(result.error || 'Ошибка входа');
      }
    } catch {
      setLoginError('Не удалось подключиться к серверу');
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setLoggedIn(false);
    setData(null);
  };

  const loadData = async () => {
    const token = localStorage.getItem("adminToken") ?? "";
    try {
      const res = await fetch('/api/admin/data', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else if (res.status === 401) {
        logout();
      }
    } catch {}
  };

  const updateService = async (id: number, data: { title: string; description: string; isActive: boolean }) => {
    const token = localStorage.getItem("adminToken") ?? "";
    await fetch('/api/admin/services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...data }),
    });
    loadData();
  };

  const updateFaq = async (id: number, data: { question: string; answer: string; isActive: boolean }) => {
    const token = localStorage.getItem("adminToken") ?? "";
    await fetch('/api/admin/faqs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...data }),
    });
    loadData();
  };

  const updateSetting = async (key: string, value: string) => {
    const token = localStorage.getItem("adminToken") ?? "";
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, value }),
    });
    loadData();
  };

  const updateLeadStatus = async (id: string, status: string) => {
    const token = localStorage.getItem("adminToken") ?? "";
    await fetch('/api/admin/leads', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    });
    loadData();
  };

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-neutral-900">Админ-панель</h1>
          <p className="mt-1 text-sm text-neutral-500">Marketing Bureau SEO Lens</p>
          <form onSubmit={login} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="admin@marketingbureau.kz"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                required
              />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!data) return <div className="flex min-h-screen items-center justify-center">Загрузка...</div>;

  const tabs = [
    { id: 'dashboard', label: 'Дашборд' },
    { id: 'leads', label: `Заявки (${data.recentLeads.length})` },
    { id: 'audits', label: `Аудиты (${data.recentAudits.length})` },
    { id: 'services', label: 'Услуги' },
    { id: 'faq', label: 'FAQ' },
    { id: 'settings', label: 'Настройки' },
  ] as const;

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="bg-neutral-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">Админ-панель — Marketing Bureau</h1>
          <button onClick={logout} className="rounded-md bg-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-600">
            Выйти
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === t.id ? 'border-amber-500 text-amber-600' : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-6">
              <p className="text-3xl font-bold text-amber-600">{data.stats.auditsTotal}</p>
              <p className="mt-1 text-sm text-neutral-500">Всего аудитов</p>
            </div>
            <div className="rounded-xl border bg-white p-6">
              <p className="text-3xl font-bold text-amber-600">{data.stats.leadsTotal}</p>
              <p className="mt-1 text-sm text-neutral-500">Всего заявок</p>
            </div>
            <div className="rounded-xl border bg-white p-6">
              <p className="text-3xl font-bold text-amber-600">{data.stats.uniqueSitesAnalyzed}</p>
              <p className="mt-1 text-sm text-neutral-500">Уникальных сайтов</p>
            </div>
          </div>
        )}

        {/* Leads */}
        {tab === 'leads' && (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="p-3 text-left">Дата</th>
                  <th className="p-3 text-left">Имя</th>
                  <th className="p-3 text-left">Телефон</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Сайт</th>
                  <th className="p-3 text-left">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-xs text-neutral-500">{new Date(lead.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="p-3 font-medium">{lead.name}</td>
                    <td className="p-3">{lead.phone}</td>
                    <td className="p-3 text-neutral-600">{lead.email || '—'}</td>
                    <td className="p-3 text-neutral-600">{lead.site || '—'}</td>
                    <td className="p-3">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="new">Новая</option>
                        <option value="contacted">Связались</option>
                        <option value="closed">Закрыта</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audits */}
        {tab === 'audits' && (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-neutral-50">
                <tr>
                  <th className="p-3 text-left">Дата</th>
                  <th className="p-3 text-left">URL</th>
                  <th className="p-3 text-left">Скор</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.recentAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-xs text-neutral-500">{new Date(audit.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="p-3 font-medium">{audit.url}</td>
                    <td className="p-3">
                      <span className={`font-bold ${audit.overallScore >= 80 ? 'text-emerald-600' : audit.overallScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {audit.overallScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Services */}
        {tab === 'services' && (
          <div className="space-y-3">
            {data.services.map((s) => (
              <div key={s.id} className="rounded-xl border bg-white p-4">
                {editingService === s.id ? (
                  <ServiceEditForm
                    service={s}
                    onSave={(d) => { updateService(s.id, d); setEditingService(null); }}
                    onCancel={() => setEditingService(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold">{s.title}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{s.description}</p>
                      <span className={`mt-2 inline-block rounded px-2 py-0.5 text-xs ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                        {s.isActive ? 'Активна' : 'Скрыта'}
                      </span>
                    </div>
                    <button onClick={() => setEditingService(s.id)} className="text-sm text-amber-600 hover:underline">
                      Изменить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        {tab === 'faq' && (
          <div className="space-y-3">
            {data.faqs.map((f) => (
              <div key={f.id} className="rounded-xl border bg-white p-4">
                {editingFaq === f.id ? (
                  <FaqEditForm
                    faq={f}
                    onSave={(d) => { updateFaq(f.id, d); setEditingFaq(null); }}
                    onCancel={() => setEditingFaq(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold">{f.question}</h3>
                      <p className="mt-1 text-sm text-neutral-600">{f.answer}</p>
                    </div>
                    <button onClick={() => setEditingFaq(f.id)} className="ml-4 text-sm text-amber-600 hover:underline">
                      Изменить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <div className="space-y-3">
            {data.settings.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border bg-white p-4">
                <span className="w-40 shrink-0 text-sm font-medium text-neutral-700">{s.key}</span>
                <input
                  defaultValue={s.value}
                  onBlur={(e) => { if (e.target.value !== s.value) updateSetting(s.key, e.target.value); }}
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ServiceEditForm({ service, onSave, onCancel }: {
  service: { title: string; description: string; isActive: boolean };
  onSave: (data: { title: string; description: string; isActive: boolean }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [isActive, setIsActive] = useState(service.isActive);
  return (
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Активна
      </label>
      <div className="flex gap-2">
        <button onClick={() => onSave({ title, description, isActive })} className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-white">Сохранить</button>
        <button onClick={onCancel} className="rounded-md border px-4 py-1.5 text-sm">Отмена</button>
      </div>
    </div>
  );
}

function FaqEditForm({ faq, onSave, onCancel }: {
  faq: { question: string; answer: string; isActive: boolean };
  onSave: (data: { question: string; answer: string; isActive: boolean }) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [isActive, setIsActive] = useState(faq.isActive);
  return (
    <div className="space-y-3">
      <input value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
      <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className="w-full rounded-md border px-3 py-2 text-sm" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Активен
      </label>
      <div className="flex gap-2">
        <button onClick={() => onSave({ question, answer, isActive })} className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-white">Сохранить</button>
        <button onClick={onCancel} className="rounded-md border px-4 py-1.5 text-sm">Отмена</button>
      </div>
    </div>
  );
}
