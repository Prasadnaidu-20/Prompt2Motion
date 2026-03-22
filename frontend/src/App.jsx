import { useState, useRef } from 'react'
import './App.css'
import HeroSection from './components/HeroSection'
import ProgressView from './components/ProgressView'
import VideoPlayer from './components/VideoPlayer'

const API_BASE = 'http://localhost:5000'

function App() {
  const [state, setState] = useState('idle') // idle | generating | done
  const [prompt, setPrompt] = useState('')
  const [numFrames, setNumFrames] = useState(6)
  const [frames, setFrames] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [errors, setErrors] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [totalFrames, setTotalFrames] = useState(0)
  const eventSourceRef = useRef(null)

  const handleGenerate = () => {
    if (!prompt.trim()) return

    setState('generating')
    setFrames([])
    setErrors([])
    setVideoUrl('')
    setCurrentFrame(0)
    setTotalFrames(numFrames)
    setStatusMessage('Connecting to server…')

    const params = new URLSearchParams({
      prompt: prompt.trim(),
      frames: numFrames.toString(),
    })

    const eventSource = new EventSource(`${API_BASE}/api/generate?${params}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'status':
            setStatusMessage(data.message)
            break

          case 'frame':
            setCurrentFrame(data.index + 1)
            setFrames((prev) => [
              ...prev,
              {
                index: data.index,
                url: `${API_BASE}${data.url}`,
              },
            ])
            break

          case 'done':
            setVideoUrl(`${API_BASE}${data.video_url}`)
            setStatusMessage('Video ready!')
            setState('done')
            eventSource.close()
            break

          case 'error':
            setErrors((prev) => [...prev, data.message])
            break

          default:
            break
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err)
      }
    }

    eventSource.onerror = () => {
      // SSE connection closed (normal after "done" event)
      eventSource.close()
      if (state !== 'done' && !videoUrl) {
        setErrors((prev) => [...prev, 'Connection to server lost.'])
      }
    }
  }

  const handleReset = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    setState('idle')
    setFrames([])
    setErrors([])
    setVideoUrl('')
    setCurrentFrame(0)
    setTotalFrames(0)
    setStatusMessage('')
  }

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <a href="/" className="navbar-brand" id="navbar-logo">
          <div className="navbar-logo">🎬</div>
          <span>FrameForge <span className="gradient-text">AI</span></span>
        </a>
        <span className="navbar-badge">✨text-2-motion</span>
      </nav>

      {/* Main Content */}
      <main className="app-content">
        {state === 'idle' && (
          <HeroSection
            prompt={prompt}
            setPrompt={setPrompt}
            numFrames={numFrames}
            setNumFrames={setNumFrames}
            onGenerate={handleGenerate}
          />
        )}

        {state === 'generating' && (
          <ProgressView
            frames={frames}
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            statusMessage={statusMessage}
            errors={errors}
            prompt={prompt}
          />
        )}

        {state === 'done' && (
          <VideoPlayer
            videoUrl={videoUrl}
            frames={frames}
            prompt={prompt}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}

export default App
