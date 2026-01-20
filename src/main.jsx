import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Translator from './routes/translator';
import SessionList from './components/SessionList';
import './index.css';

// Определяем basename в зависимости от режима
// В разработке используем пустой basename, в продакшене - /babelfish.ai
const basename = import.meta.env.PROD ? '/babelfish.ai' : '';

// Компонент для перенаправления на главную при перезагрузке страницы
function RedirectToHome() {
  const navigate = useNavigate();
  const currentLocation = useLocation();

  // Используем useLayoutEffect для синхронного редиректа до рендера
  // Это предотвращает черный экран при перезагрузке страницы сессии
  React.useLayoutEffect(() => {
    // Проверяем, была ли это перезагрузка страницы через Navigation Timing API
    const navigationEntries = performance.getEntriesByType('navigation');
    const navEntry = navigationEntries.length > 0 ? navigationEntries[0] : null;
    
    // Определяем перезагрузку: только если type === 'reload'
    // type === 'navigate' означает прямой переход по ссылке или первый визит - не редиректим
    const isPageReload = navEntry?.type === 'reload';
    
    // При перезагрузке всегда перенаправляем на главную
    if (isPageReload && currentLocation.pathname !== '/') {
      // Редиректим сразу, без задержки, чтобы предотвратить рендер компонента Translator
      navigate('/', { replace: true });
    }
  }, [navigate, currentLocation.pathname]);

  return null;
}

// eslint-disable-next-line react-refresh/only-export-components
function App() {

  return (
    <BrowserRouter 
      basename={basename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <RedirectToHome />
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="/session/:id" element={<Translator />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
