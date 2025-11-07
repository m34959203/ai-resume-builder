import React from 'react';
import { Info } from 'lucide-react';

export default function EmptyDataBanner({
  title = 'Нужно немного больше данных',
  missing = [],
  ctaLabel = 'Улучшить резюме',
  onCta,
  hint,
}) {
  return (
    <div
      className="rounded-xl border bg-blue-50 border-blue-200 p-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-blue-200">
            <Info className="text-blue-600" size={18} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-blue-900 font-semibold">{title}</div>

          {!!missing?.length && (
            <>
              <div className="mt-2 text-sm text-blue-900/70">Отсутствуют разделы:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-blue-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </>
          )}

          {hint && <div className="mt-3 text-sm text-blue-900/70">{hint}</div>}
        </div>

        {onCta && (
          <div className="shrink-0">
            <button
              onClick={onCta}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ctaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
