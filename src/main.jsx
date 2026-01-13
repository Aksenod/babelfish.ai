import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import Translator from './routes/translator';
import './index.css';

function App() {
  return <Translator />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
