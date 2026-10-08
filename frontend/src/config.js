export const SCRAPER_API = import.meta.env.VITE_SCRAPER_URL || ''
export const RENDER_API = import.meta.env.VITE_API_URL || ''

export const APP_NAME = 'CogniSite'
export const APP_TAGLINE = 'Website Knowledge Base & Customer Support Platform'

// Active knowledge bases created by scraping
export const ENTERPRISE_KNOWLEDGE_BASES = []

// Local storage site registry helpers
export function getScrapedSites() {
  try {
    const list = localStorage.getItem('cognisite_indexed_sites')
    return list ? JSON.parse(list) : []
  } catch (err) {
    void err
    return []
  }
}

export function addScrapedSite(siteData) {
  try {
    const current = getScrapedSites()
    const existingIndex = current.findIndex(s => s.websiteId === siteData.websiteId)
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...siteData }
    } else {
      current.unshift(siteData)
    }
    localStorage.setItem('cognisite_indexed_sites', JSON.stringify(current))
  } catch (err) {
    void err
  }
}

export function removeScrapedSite(websiteId) {
  try {
    const current = getScrapedSites().filter(s => s.websiteId !== websiteId)
    localStorage.setItem('cognisite_indexed_sites', JSON.stringify(current))
    localStorage.removeItem(`cognisite_bot_${websiteId}`)
  } catch (err) {
    void err
  }
}

export function clearAllLocalSites() {
  try {
    const current = getScrapedSites()
    current.forEach(s => localStorage.removeItem(`cognisite_bot_${s.websiteId}`))
    localStorage.removeItem('cognisite_indexed_sites')
  } catch (err) {
    void err
  }
}

// Helper to get or customize chatbot settings per website
export function getChatbotConfig(websiteId, fallback = null) {
  try {
    const saved = localStorage.getItem(`cognisite_bot_${websiteId}`)
    if (saved) return JSON.parse(saved)
  } catch (err) {
    void err
  }

  const base = ENTERPRISE_KNOWLEDGE_BASES.find(b => b.websiteId === websiteId)
  if (base?.chatbot) return base.chatbot

  if (fallback?.chatbot) return fallback.chatbot

  return {
    title: `${websiteId} Assistant`,
    welcomeMessage: `Hello. How can I assist you with information about ${websiteId}?`,
    primaryColor: '#0f172a',
    logoUrl: ''
  }
}

export function saveChatbotConfig(websiteId, config) {
  try {
    localStorage.setItem(`cognisite_bot_${websiteId}`, JSON.stringify(config))
  } catch (err) {
    void err
  }
}