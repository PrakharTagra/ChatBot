export const SCRAPER_API = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:5000'
export const RENDER_API = import.meta.env.VITE_API_URL || 'https://chatbot-n350.onrender.com'

export const APP_NAME = 'CogniSite AI'
export const APP_TAGLINE = 'Autonomous Website Knowledge Agents & Grounded RAG Platform'

// Pre-Configured Enterprise Knowledge Bases
export const ENTERPRISE_KNOWLEDGE_BASES = [
  {
    websiteId: 'd2itechnology',
    name: 'd2i Technology Cloud',
    url: 'https://d2itechnology.com',
    description: 'Enterprise IT solutions, cloud infrastructure architectures, and mission-critical software engineering.',
    chunks: 142,
    status: 'Operational',
    lastSync: '2026-04-05T09:15:00.000Z',
    sampleQuestions: [
      'What enterprise cloud engineering services do you provide?',
      'How does your cloud migration roadmap work?',
      'How do I schedule a technical consultation with the solutions team?',
      'What industries and compliance standards do you specialize in?'
    ]
  },
  {
    websiteId: 'portfolio-demo',
    name: 'Engineering Systems & Architecture',
    url: 'https://github.com/PrakharTagra',
    description: 'Autonomous AI infrastructure, RAG pipelines, distributed vector indexing, and low-latency microservices.',
    chunks: 68,
    status: 'Operational',
    lastSync: '2026-04-06T11:20:00.000Z',
    sampleQuestions: [
      'What is the decoupled architecture of this RAG pipeline?',
      'How does the dual-threshold confidence gate prevent hallucinations?',
      'Why is the crawler separated from the real-time inference API?',
      'How is tenant data isolated across ChromaDB and MongoDB collections?'
    ]
  }
]

// Product Tour Video Configuration
export const PRODUCT_TOUR_CONFIG = {
  defaultVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  title: 'CogniSite Platform Tour & Technical Architecture Walkthrough',
  chapters: [
    { time: '0:00', title: 'CogniSite Platform Overview & Enterprise RAG' },
    { time: '0:45', title: 'Autonomous Playwright Crawler & Semantic Extraction' },
    { time: '1:30', title: 'High-Dimensional Vector Embeddings (Chroma Cloud)' },
    { time: '2:15', title: 'Sub-300ms Inference via Groq LPU (Llama 3.1 8B)' },
    { time: '3:00', title: 'Dual-Threshold Confidence Gate & Zero-Hallucination Sentinel' },
    { time: '3:45', title: 'Instant CDN Widget Deployment & Isolated Lead Routing' },
  ]
}