export const SCRAPER_API = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:5000'
export const RENDER_API = import.meta.env.VITE_API_URL || 'https://chatbot-gurp.onrender.com'

// Showcase Pre-Indexed Websites for instant resume demo
export const SHOWCASE_SITES = [
  {
    websiteId: 'd2itechnology',
    name: 'd2i Technology',
    url: 'https://d2itechnology.com',
    description: 'Enterprise IT solutions, cloud architectures, and software engineering services.',
    chunks: 142,
    lastScraped: '2026-03-28T10:00:00.000Z',
    sampleQuestions: [
      'What core engineering services do you provide?',
      'How does your cloud migration process work?',
      'How can I get in touch with the technical sales team?',
      'What industries do you specialize in?'
    ]
  },
  {
    websiteId: 'portfolio-demo',
    name: 'Developer Portfolio',
    url: 'https://github.com/PrakharTagra',
    description: 'Software engineer portfolio showcasing AI engineering, RAG pipelines, and full-stack systems.',
    chunks: 68,
    lastScraped: '2026-04-01T14:30:00.000Z',
    sampleQuestions: [
      'What is the architecture of this RAG chat agent?',
      'Which tech stack is used across backend and frontend?',
      'Why is the scraper decoupled from the serving API?',
      'How does the two-threshold confidence gate work?'
    ]
  }
]

export const TUTORIAL_CONFIG = {
  defaultVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder until user sets their screen recording
  title: 'Full Stack RAG Chatbot Walkthrough',
  chapters: [
    { time: '0:00', title: 'System Architecture & Decoupled Design' },
    { time: '0:45', title: 'Headless Scraping & Semantic Chunking' },
    { time: '1:30', title: 'Vector Embeddings in ChromaDB Cloud' },
    { time: '2:15', title: 'Grounded Generation with Groq (Llama 3.1)' },
    { time: '3:00', title: 'Testing Playground & Confidence Gating' },
    { time: '3:45', title: 'Embeddable Web Widget & Lead Capture' },
  ]
}