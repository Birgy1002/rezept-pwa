import { useEffect, useState } from 'react'

function App() {
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = () => setInstalled(true)
    window.addEventListener('appinstalled', handler)
    return () => window.removeEventListener('appinstalled', handler)
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <h1>🍳 Rezept PWA</h1>
      <p>React + Vite + PWA ist eingerichtet ✅</p>
      {installed && <p>📲 App wurde installiert!</p>}
    </main>
  )
}

export default App
