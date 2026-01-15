import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Translator from './routes/translator';
import SessionList from './components/SessionList';
import './index.css';

// Определяем basename в зависимости от режима
// В разработке используем пустой basename, в продакшене - /babelfish.ai
const basename = import.meta.env.PROD ? '/babelfish.ai' : '';

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
