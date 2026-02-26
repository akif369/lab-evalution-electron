import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

type AlertPatchedWindow = Window & {
  __leapAlertPatched?: boolean
  __leapNativeAlert?: Window['alert']
  __leapAlertHost?: HTMLDivElement
  __leapAlertStyle?: HTMLStyleElement
}

function installNonBlockingAlert() {
  const scopedWindow = window as AlertPatchedWindow
  if (scopedWindow.__leapAlertPatched) return

  scopedWindow.__leapAlertPatched = true
  scopedWindow.__leapNativeAlert = window.alert.bind(window)

  const ensureStyle = () => {
    if (scopedWindow.__leapAlertStyle && document.contains(scopedWindow.__leapAlertStyle)) {
      return scopedWindow.__leapAlertStyle
    }

    const style = document.createElement('style')
    style.textContent = `
      @keyframes leapAlertIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `
    document.head.appendChild(style)
    scopedWindow.__leapAlertStyle = style
    return style
  }

  const ensureHost = () => {
    if (scopedWindow.__leapAlertHost && document.contains(scopedWindow.__leapAlertHost)) {
      return scopedWindow.__leapAlertHost
    }

    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.inset = '0'
    host.style.display = 'flex'
    host.style.alignItems = 'center'
    host.style.justifyContent = 'flex-start'
    host.style.flexDirection = 'column'
    host.style.padding = '24px 16px 16px'
    host.style.gap = '12px'
    host.style.zIndex = '9999'
    host.style.pointerEvents = 'none'
    document.body.appendChild(host)
    scopedWindow.__leapAlertHost = host
    return host
  }

  const showToast = (message: string) => {
    ensureStyle()
    const host = ensureHost()
    host.innerHTML = ''

    const toast = document.createElement('div')
    toast.style.background = 'linear-gradient(160deg, #111827 0%, #1f2937 100%)'
    toast.style.color = '#ffffff'
    toast.style.border = '1px solid rgba(148, 163, 184, 0.35)'
    toast.style.borderRadius = '16px'
    toast.style.padding = '18px 20px'
    toast.style.width = 'min(640px, calc(100vw - 32px))'
    toast.style.boxShadow = '0 18px 48px rgba(0,0,0,0.45)'
    toast.style.fontSize = '15px'
    toast.style.lineHeight = '1.5'
    toast.style.pointerEvents = 'auto'
    toast.style.backdropFilter = 'blur(10px)'
    toast.style.animation = 'leapAlertIn 220ms ease forwards'

    const header = document.createElement('div')
    header.style.display = 'flex'
    header.style.alignItems = 'center'
    header.style.gap = '10px'
    header.style.marginBottom = '8px'

    const dot = document.createElement('span')
    dot.textContent = '●'
    dot.style.color = '#22c55e'
    dot.style.fontSize = '12px'

    const title = document.createElement('strong')
    title.textContent = 'Notification'
    title.style.fontSize = '14px'
    title.style.letterSpacing = '0.2px'
    title.style.color = '#e2e8f0'

    const body = document.createElement('div')
    body.textContent = message || 'Notice'
    body.style.color = '#f8fafc'
    body.style.wordBreak = 'break-word'

    header.append(dot, title)
    toast.append(header, body)
    host.appendChild(toast)

    window.setTimeout(() => {
      toast.style.transition = 'opacity 180ms ease, transform 180ms ease'
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(8px) scale(0.98)'
      window.setTimeout(() => {
        toast.remove()
      }, 220)
    }, 3200)
  }

  window.alert = ((message?: string) => {
    showToast(String(message ?? ''))
  }) as Window['alert']
}

installNonBlockingAlert()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
