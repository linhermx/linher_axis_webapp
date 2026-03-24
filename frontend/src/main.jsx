import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/ui-primitives.css';
import './styles/app-shell.css';
import './styles/app-modules.css';

const THEME_STORAGE_KEY = 'axis_theme';
const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const initialTheme = storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light';

document.documentElement.setAttribute('data-theme', initialTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
