import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'

// 1. Importar el logo desde assets (asegúrate de que la ruta coincida con tu estructura)
import logoVita from './assets/Vita+.svg'

// 2. Configurar el favicon y el título fijo global
const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
link.type = 'image/svg+xml';
link.rel = 'icon';
link.href = logoVita;
document.getElementsByTagName('head')[0].appendChild(link);

document.title = "Farmacias Vita+";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)