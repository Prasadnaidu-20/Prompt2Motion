function ProgressView({ frames, currentFrame, totalFrames, statusMessage, errors, prompt }) {
  const progress = totalFrames > 0 ? Math.round((currentFrame / totalFrames) * 100) : 0
  const remainingFrames = totalFrames - currentFrame
  const etaSeconds = remainingFrames * 16

  return (
    <div className="progress-view">
      {/* Header */}
      <div className="progress-header">
        <h2>
          <span className="gradient-text">Generating</span> your video
        </h2>
        <div className="progress-status">
          <div className="progress-spinner"></div>
          {statusMessage}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container glass-panel">
        <div className="progress-bar-info">
          <span className="progress-bar-label">
            Frame {currentFrame} of {totalFrames}
          </span>
          <span className="progress-bar-percent">{progress}%</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {remainingFrames > 0 && (
          <div className="progress-eta">
            ⏱ ~{Math.ceil(etaSeconds / 60)} min {etaSeconds % 60}s remaining
          </div>
        )}
      </div>

      {/* Error messages */}
      {errors.map((err, i) => (
        <div key={i} className="error-banner">
          <span className="error-icon">⚠️</span>
          {err}
        </div>
      ))}

      {/* Prompt reminder */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(99, 102, 241, 0.06)',
        border: '1px solid rgba(99, 102, 241, 0.1)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--text-accent)' }}>Prompt:</strong> {prompt}
      </div>

      {/* Frames Grid */}
      <div className="frames-grid">
        {Array.from({ length: totalFrames }).map((_, i) => {
          const frame = frames.find((f) => f.index === i)
          return (
            <div key={i} className="frame-card">
              {frame ? (
                <>
                  <img src={frame.url} alt={`Frame ${i + 1}`} loading="lazy" />
                  <div className="frame-card-overlay">Frame {i + 1}</div>
                </>
              ) : (
                <div className="frame-placeholder">
                  <span className="frame-placeholder-icon">
                    {i < currentFrame ? '✓' : '⏳'}
                  </span>
                  <span>Frame {i + 1}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressView
