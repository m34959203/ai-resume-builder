import React, { useEffect } from 'react';
import { finishHHOAuth } from '../../services/bff';

export default function HHCallback() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    (async () => {
      try {
        if (code) await finishHHOAuth(code);
      } catch (e) {
        console.error(e);
      } finally {
        window.location.replace('/?page=builder');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-gray-600">Завершаем авторизацию в HeadHunter…</div>
    </div>
  );
}
