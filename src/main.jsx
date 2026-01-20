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
  const location = useLocation();

  React.useEffect(() => {
    // Проверяем, была ли это перезагрузка страницы через Navigation Timing API
    const navigationEntries = performance.getEntriesByType('navigation');
    const isPageReload = navigationEntries.length > 0 && 
      navigationEntries[0].type === 'reload';
    
    // При перезагрузке всегда перенаправляем на главную
    if (isPageReload && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, []); // Пустой массив зависимостей - выполняется только при монтировании

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
