import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Translator from './routes/translator';
import SessionsPage from './components/SessionsPage';
import './index.css';

// Определяем basename в зависимости от режима
// В разработке используем пустой basename, в продакшене - /babelfish.ai
const basename = import.meta.env.PROD ? '/babelfish.ai' : '';

/**
 * Компонент для перенаправления на страницу с сессиями при перезагрузке страницы сессии.
 * Главная страница (/) отображает список сессий (SessionsPage).
 * При перезагрузке страницы сессии (/session/:id) перенаправляет на главную,
 * чтобы предотвратить проблемы с восстановлением состояния сессии.
 * 
 * Редирект происходит только при настоящей перезагрузке страницы (F5/Cmd+R),
 * но не при программной навигации через React Router.
 */
function RedirectToHome() {
  const navigate = useNavigate();
  const currentLocation = useLocation();
  const hasRedirectedRef = React.useRef(false);

  // Используем useLayoutEffect для синхронного редиректа до рендера
  // Это предотвращает черный экран при перезагрузке страницы сессии
  React.useLayoutEffect(() => {
    // Предотвращаем повторные редиректы
    if (hasRedirectedRef.current) {
      return;
    }

    // Проверяем, была ли это перезагрузка страницы через Navigation Timing API
    // Используем более надежный метод проверки
    let isPageReload = false;
    
    try {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        // type === 'reload' означает перезагрузку страницы (F5, Cmd+R)
        // type === 'navigate' означает прямой переход по ссылке или первый визит
        // type === 'back_forward' означает переход назад/вперед
        isPageReload = navEntry.type === 'reload';
      }
    } catch (e) {
      // Fallback для старых браузеров
      if (window.performance && window.performance.navigation) {
        isPageReload = window.performance.navigation.type === 1; // TYPE_RELOAD
      }
    }
    
    // Редиректим ТОЛЬКО при перезагрузке страницы сессии
    // НЕ редиректим при программной навигации через navigate()
    if (isPageReload && currentLocation.pathname !== '/') {
      console.log('Page reload detected, redirecting to home from:', currentLocation.pathname);
      hasRedirectedRef.current = true;
      // Редиректим сразу, без задержки, чтобы предотвратить рендер компонента Translator
      navigate('/', { replace: true });
    } else {
      // Сбрасываем флаг при нормальной навигации
      hasRedirectedRef.current = false;
    }
  }, [navigate, currentLocation.pathname]);

  // Сбрасываем флаг при переходе на главную страницу
  React.useEffect(() => {
    if (currentLocation.pathname === '/') {
      hasRedirectedRef.current = false;
    }
  }, [currentLocation.pathname]);

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
        {/* Главная страница - список сессий */}
        <Route path="/" element={<SessionsPage />} />
        {/* Страница работы с конкретной сессией */}
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
