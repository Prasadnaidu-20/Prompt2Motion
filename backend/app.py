"""
Text-to-Video Generator — Flask Backend
========================================
Pipeline:
  1. Receive text prompt + frame count via /api/generate (SSE)
  2. Fetch N images from Pollinations.ai (rate-limited, 1 req / 15s)
  3. Stitch frames into MP4 using OpenCV
  4. Stream live progress to the frontend via Server-Sent Events
"""
import os
import json
import time
import uuid
import numpy as np 

import cv2
import requests as http_requests
from flask import Flask, request, Response, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HF_API_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"
HF_API_KEY = os.getenv("HF_API_KEY")
print(HF_API_KEY)

HF_HEADERS = {
    "Authorization": f"Bearer {HF_API_KEY}"
}

FRAME_WIDTH = 768
FRAME_HEIGHT = 512
RATE_LIMIT_DELAY = 20        # seconds between requests (15s limit + 5s buffer)
RATE_LIMIT_BACKOFF = 35      # seconds to wait after a 429 response
MAX_RETRIES = 3              # max retries per frame
VIDEO_FPS = 10             # 1 frame per second for slideshow-style video

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sse_event(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


# def get_existing_frames(folder_path):
#     files = sorted([
#         os.path.join(folder_path, f)
#         for f in os.listdir(folder_path)
#         if f.endswith(".png")
#     ])
#     return files


def _fetch_frame(prompt: str, seed: int, save_path: str):
    """
    Fetch image from Hugging Face Stable Diffusion
    """
    try:
        payload = {
            "inputs": prompt,
            "parameters": {
                "seed": seed
            }
        }

        resp = http_requests.post(
            HF_API_URL,
            headers=HF_HEADERS,
            json=payload,
            timeout=120
        )

        print("STATUS:", resp.status_code)
        print("CONTENT TYPE:", resp.headers.get("content-type"))

        if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
            with open(save_path, "wb") as f:
                f.write(resp.content)
            return True, 200

        if "application/json" in resp.headers.get("content-type", ""):
            print("HF RESPONSE:", resp.text)
            time.sleep(5)   # wait for model loading
            return False, resp.status_code

        print(f"[ERROR] HF error: {resp.text}")
        return False, resp.status_code

    except Exception as e:
        print(f"[ERROR] Exception: {e}")
        return False, 0

# def _stitch_video(frame_paths: list, video_path: str) -> bool:
#     """
#     Stitch a list of image files into an MP4 video using OpenCV.
#     Each frame is displayed for 1/VIDEO_FPS seconds.
#     """
#     if not frame_paths:
#         return False

#     # Read first frame to get dimensions
#     first = cv2.imread(frame_paths[0])
#     if first is None:
#         return False
#     h, w = first.shape[:2]

#     fourcc = cv2.VideoWriter_fourcc(*"mp4v")
#     writer = cv2.VideoWriter(video_path, fourcc, VIDEO_FPS, (w, h))

#     for path in frame_paths:
#         img = cv2.imread(path)
#         if img is None:
#             continue
#         # Resize to match first frame if needed
#         if img.shape[:2] != (h, w):
#             img = cv2.resize(img, (w, h))
#         # Write the same frame multiple times for longer display
#         for _ in range(3):  # 3 seconds per frame at 1 FPS
#             writer.write(img)

#     writer.release()
#     return os.path.exists(video_path)

def _stitch_video(frame_paths: list, video_path: str) -> bool:
    if not frame_paths:
        return False

    first = cv2.imread(frame_paths[0])
    if first is None:
        return False
    h, w = first.shape[:2]

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(video_path, fourcc, VIDEO_FPS, (w, h))

    INTERP_FRAMES = 15  # smooth frames generated between each pair

    for idx in range(len(frame_paths) - 1):
        img1 = cv2.imread(frame_paths[idx])
        img2 = cv2.imread(frame_paths[idx + 1])

        if img1 is None or img2 is None:
            continue

        if img1.shape[:2] != (h, w):
            img1 = cv2.resize(img1, (w, h))
        if img2.shape[:2] != (h, w):
            img2 = cv2.resize(img2, (w, h))

        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        # Calculate optical flow from frame1 → frame2
        flow = cv2.calcOpticalFlowFarneback(
            gray1, gray2,
            None,
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )

        # Generate intermediate frames
        for t in range(INTERP_FRAMES):
            alpha = t / INTERP_FRAMES  # 0.0 → 1.0

            # Warp img1 forward by alpha * flow
            map_x = (flow[..., 0] * alpha).astype("float32")
            map_y = (flow[..., 1] * alpha).astype("float32")

            grid_x, grid_y = np.meshgrid(np.arange(w), np.arange(h))
            remap_x = (grid_x + map_x).astype("float32")
            remap_y = (grid_y + map_y).astype("float32")

            warped = cv2.remap(img1, remap_x, remap_y,
                               interpolation=cv2.INTER_LINEAR,
                               borderMode=cv2.BORDER_REFLECT)

            # Blend warped img1 with img2 for smoother transition
            blended = cv2.addWeighted(warped, 1 - alpha, img2, alpha, 0)
            writer.write(blended)

    # Write the last frame
    last = cv2.imread(frame_paths[-1])
    if last is not None:
        if last.shape[:2] != (h, w):
            last = cv2.resize(last, (w, h))
        writer.write(last)

    writer.release()
    return os.path.exists(video_path)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/api/generate")
def generate():
    """
    SSE endpoint.
    Query params:
      - prompt (str, required)
      - frames (int, default 6, range 2-10)
    Streams events:
      - {type: "status", message: "..."}
      - {type: "frame", index, total, url}
      - {type: "done", video_url}
      - {type: "error", message: "..."}
    """
    prompt = request.args.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    try:
        num_frames = int(request.args.get("frames", 6))
        num_frames = max(2, min(10, num_frames))
    except ValueError:
        num_frames = 6

    # Create a unique job directory
    job_id = uuid.uuid4().hex[:12]
    job_dir = os.path.join(OUTPUT_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    def event_stream():
        yield _sse_event({
            "type": "status",
            "message": f"Starting generation of {num_frames} frames…",
            "job_id": job_id,
        })

        # ---------------------------------------------------------------
        # API-based frame generation is DISABLED.
        # Using pre-existing images from the output folder instead.
        # ---------------------------------------------------------------

        frame_paths = []
        for i in range(num_frames):
            seed = 42 + i
            frame_filename = f"frame_{i:03d}.png"
            frame_path = os.path.join(job_dir, frame_filename)
        
            dynamic_prompt = f"{prompt}, cinematic, slight motion, frame {i}"
        
            yield _sse_event({
                "type": "status",
                "message": f"Generating frame {i + 1} of {num_frames}…",
            })
        
            # Try up to MAX_RETRIES times
            success = False
            for attempt in range(MAX_RETRIES):
                ok, status = _fetch_frame(dynamic_prompt, seed + attempt, frame_path)
        
                if ok:
                    success = True
                    frame_paths.append(frame_path)
                    yield _sse_event({
                        "type": "frame",
                        "index": i,
                        "total": num_frames,
                        "url": f"/api/frames/{job_id}/{frame_filename}",
                    })
                    break
                time.sleep(2)
        
            if not success:
                yield _sse_event({
                    "type": "error",
                    "message": f"Frame {i + 1} failed after {MAX_RETRIES} attempts. Skipping.",
                })


        # Stitch video
        if len(frame_paths) < 2:
            yield _sse_event({
                "type": "error",
                "message": "Not enough frames were generated to create a video.",
            })
            return

        yield _sse_event({
            "type": "status",
            "message": "Stitching frames into video…",
        })

        video_filename = "output.mp4"
        video_path = os.path.join(job_dir, video_filename)
        ok = _stitch_video(frame_paths, video_path)

        if ok:
            yield _sse_event({
                "type": "done",
                "video_url": f"/api/videos/{job_id}/{video_filename}",
                "job_id": job_id,
            })
        else:
            yield _sse_event({
                "type": "error",
                "message": "Failed to stitch video.",
            })

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/api/frames/<job_id>/<filename>")
def serve_frame(job_id, filename):
    """Serve a generated frame image."""
    job_dir = os.path.join(OUTPUT_DIR, job_id)
    return send_from_directory(job_dir, filename)


@app.route("/api/videos/<job_id>/<filename>")
def serve_video(job_id, filename):
    """Serve a generated video file."""
    job_dir = os.path.join(OUTPUT_DIR, job_id)
    return send_from_directory(
        job_dir,
        "output.mp4",
        mimetype="video/mp4",
        as_attachment=False,  # streams in browser
        download_name=filename
    )


@app.route("/api/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("=" * 60)
    print("  Text-to-Video Generator Backend")
    print(f"  Output directory: {OUTPUT_DIR}")
    print("  Endpoints:")
    print("    GET /api/generate?prompt=...&frames=6")
    print("    GET /api/frames/<job_id>/<filename>")
    print("    GET /api/videos/<job_id>/<filename>")
    print("    GET /api/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)