# 🎬 Prompt2Motion — Text-to-Video Generator

Convert text prompts into smooth videos using AI-generated images and optical flow interpolation.

---

## 🚀 Demo

```
"A sunset over the ocean with waves crashing" → 🎥 smooth video
```

---

## 🧠 How It Works

```
Text Prompt
    ↓
HuggingFace SDXL (generates N images)
    ↓
Optical Flow Interpolation (OpenCV)
    ↓
MP4 Video Output
```

1. User enters a text prompt and frame count
2. Backend generates images via **Stable Diffusion XL** on HuggingFace
3. Optical flow calculates pixel movement between frames
4. 15 smooth interpolated frames are generated between each image pair
5. Final MP4 video is stitched and served to the frontend

---

## 🗂️ Project Structure

```
Prompt2Motion/
├── backend/
│   ├── app.py          # Flask backend — SSE, image gen, video stitching
│   ├── .env            # API keys (never commit this!)
│   ├── requirements.txt
│   └── output/         # Generated frames and videos saved here
├── frontend/
│   └── ...             # React / HTML frontend
├── .gitignore
└── README.md
```

---

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/Prasadnaidu-20/Prompt2Motion.git
cd Prompt2Motion
```

### 2. Backend setup
```bash
cd backend
pip install -r requirements.txt
```

### 3. Create `.env` file
```
HF_API_KEY=hf_your_huggingface_token_here
```
> Get your token from: https://huggingface.co/settings/tokens

### 4. Run the backend
```bash
python app.py
```
Backend runs on `http://localhost:5000`

### 5. Run the frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/generate?prompt=...&frames=6` | SSE stream — generates video |
| `GET` | `/api/frames/<job_id>/<filename>` | Serves generated frame images |
| `GET` | `/api/videos/<job_id>/<filename>` | Serves final MP4 video |
| `GET` | `/api/health` | Health check |

### SSE Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `status` | `message` | Progress update |
| `frame` | `index, total, url` | Frame ready |
| `done` | `video_url, job_id` | Video ready |
| `error` | `message` | Something failed |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, Flask, Flask-CORS |
| Image Generation | HuggingFace — `stabilityai/stable-diffusion-xl-base-1.0` |
| Video Processing | OpenCV, NumPy |
| Streaming | Server-Sent Events (SSE) |
| Frontend | React |

---

## 📦 Requirements

```
flask
flask-cors
opencv-python
numpy
requests
python-dotenv
```

Install all:
```bash
pip install -r requirements.txt
```

---

## 🔧 Configuration

Inside `app.py` you can tweak these settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `VIDEO_FPS` | `10` | Frames per second in output video |
| `INTERP_FRAMES` | `15` | Smooth frames generated between each image pair |
| `MAX_RETRIES` | `3` | Retry attempts per frame if API fails |
| `FRAME_WIDTH` | `768` | Image width |
| `FRAME_HEIGHT` | `512` | Image height |

---

## ⚠️ Important Notes

- **Never commit your `.env` file** — it contains your API key
- HuggingFace free tier may hit rate limits for heavy models
- More frames = better video quality but longer generation time
- Output videos and frames are saved in `backend/output/<job_id>/`

---

## 📄 License

MIT License — feel free to use and modify.

---

## 🙌 Author

**Prasad Naidu**
- GitHub: [@Prasadnaidu-20](https://github.com/Prasadnaidu-20)