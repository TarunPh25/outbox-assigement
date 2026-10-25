import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

type Kind = 'success' | 'error';
interface Toast { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.kind === 'error'
              ? <XCircle size={16} className="shrink-0 text-red-400" />
              : <CheckCircle size={16} className="shrink-0 text-brand" />}
            <span className={t.kind === 'error' ? 'text-red-200' : 'text-ink'}>{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
