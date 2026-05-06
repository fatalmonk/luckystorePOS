import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { registerServiceWorker } from './lib/sw-register'
import './index.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

registerServiceWorker()
