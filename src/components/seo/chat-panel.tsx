'use client';

import { useState, useRef, useEffect } from 'react';
import { useSeoStore } from '@/lib/seo-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { isChatOpen, toggleChat, chatMessages, isChatThinking, sendChatMessage, report } = useSeoStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatThinking]);

  if (!report) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isChatThinking) return;
    setInput('');
    await sendChatMessage(text);
  };

  const quickPrompts = [
    'Почему у страницы низкий скор?',
    'Перепиши title под запрос "купить квартиру"',
    'Какие 3 правки сделать в первую очередь?',
    'Что не так с meta description?',
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => toggleChat(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-amber-400 shadow-lg shadow-black/30 transition-all hover:bg-neutral-800 hover:scale-105',
          isChatOpen && 'pointer-events-none opacity-0',
        )}
        aria-label="Открыть чат-ассистент"
      >
        <Bot className="h-6 w-6" />
      </button>

      <Sheet open={isChatOpen} onOpenChange={(open) => toggleChat(open)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <SheetTitle className="text-base">SEO-ассистент</SheetTitle>
                  <SheetDescription className="text-xs">
                    Спросите про отчёт или попросите переписать текст
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleChat(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-3">
            <div ref={scrollRef} className="space-y-3">
              {chatMessages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                    Привет! Я вижу отчёт по{' '}
                    <span className="font-medium text-foreground truncate">{report.targetUrl}</span>. Спросите про любую
                    проблему или попросите переписать title/description.
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Быстрые вопросы:</p>
                    {quickPrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setInput(p);
                        }}
                        className="block w-full rounded-md border bg-card px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      m.role === 'user'
                        ? 'bg-neutral-900 text-white rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm',
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  </div>
                </div>
              ))}
              {isChatThinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Напишите вопрос…"
                disabled={isChatThinking}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isChatThinking}
                className="bg-neutral-900 text-white hover:bg-neutral-800"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
