import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: its double-invoked effects would double the API calls in dev.
createRoot(document.getElementById('root')!).render(<App />)
