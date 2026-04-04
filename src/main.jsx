import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/providers';
import './styles/variables.css';
import './styles/reset.css';

const rootElement = document.getElementById('root');

createRoot(rootElement).render(
  createElement(
    StrictMode,
    null,
    createElement(AppProviders, null, createElement(App)),
  ),
);
