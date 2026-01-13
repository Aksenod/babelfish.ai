import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Translator from './routes/translator';
import './index.css';

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  return <Translator />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
