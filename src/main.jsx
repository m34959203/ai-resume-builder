import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Если позже захочешь развести страницы — добавишь сюда элементы вместо App
const router = createHashRouter(
  [
    { path: '/*', element: <App /> },
    // примеры на будущее:
    // { path: '/', element: <AIResumeBuilder /> },
    // { path: '/oauth/hh/callback', element: <HHCallback /> },
  ],
  {
    // включаем поведение v7 уже сейчас
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
