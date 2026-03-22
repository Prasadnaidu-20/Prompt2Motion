function VideoPlayer({ videoUrl, frames, prompt, onReset }) {

  return (
    <div className="video-view">
      {/* Header */}
      <div className="video-view-header">
        <h2>
          Your video is <span className="gradient-text">ready!</span> 🎉
        </h2>
        <p className="video-view-subtitle">
          Generated from: "<em>{prompt}</em>"
        </p>
      </div>

      {/* Video Player */}
      <div className="video-player-wrapper glass-panel">
        <video
          id="video-player"
          src={videoUrl}
          controls
          autoPlay
          loop
          playsInline
          style={{ maxHeight: '500px' }}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Actions */}
      <div className="video-actions">
        <a href="/api/videos/{job_id}/output.mp4" download="video.mp4" className="btn-primary">⬇️ Download MP4</a>
        <button id="new-video-button" className="btn-secondary" onClick={onReset}>
          ✨ Generate Another
        </button>
      </div>

      {/* Frames Preview */}
      {frames.length > 0 && (
        <div className="frames-preview">
          <h3>Generated Frames ({frames.length})</h3>
          <div className="frames-preview-grid">
            {frames.map((frame) => (
              <div key={frame.index} className="frames-preview-item">
                <img src={frame.url} alt={`Frame ${frame.index + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
