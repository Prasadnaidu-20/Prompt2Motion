function HeroSection({ prompt, setPrompt, numFrames, setNumFrames, onGenerate }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onGenerate()
  }

  return (
    <section className="hero">
      {/* Eyebrow badge */}
      <div className="hero-eyebrow">
        <span className="hero-eyebrow-dot"></span>
        AI-Powered Video Generation
      </div>

      {/* Title */}
      <h1>
        Turn your <span className="gradient-text">imagination</span><br />
        into stunning videos
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Describe any scene, story, or concept — our AI generates beautiful frames 
        and stitches them into a seamless video, all in real time.
      </p>

      {/* Form */}
      <form className="prompt-form" onSubmit={handleSubmit}>
        <div className="prompt-input-wrapper">
          <textarea
            id="prompt-input"
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video scene… e.g., 'A futuristic city at sunset with flying cars and neon lights reflecting on glass skyscrapers'"
            rows={4}
            maxLength={500}
          />
        </div>

        <div className="prompt-controls">
          <div className="frames-control">
            <label htmlFor="frames-slider">Frames:</label>
            <input
              id="frames-slider"
              type="range"
              className="frames-slider"
              min={2}
              max={10}
              value={numFrames}
              onChange={(e) => setNumFrames(Number(e.target.value))}
            />
            <span className="frames-value">{numFrames}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              (~{numFrames * 16}s)
            </span>
          </div>

          <button
            id="generate-button"
            type="submit"
            className="generate-btn"
            disabled={!prompt.trim()}
          >
            <span className="generate-btn-icon">🎬</span>
            Generate Video
          </button>
        </div>
      </form>
    </section>
  )
}

export default HeroSection
