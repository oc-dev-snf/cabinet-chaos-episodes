# Neural TTS server (Piper)

This service provides per-character neural TTS for the Cabinet Chaos web app.

## API

- `GET /health`
- `POST /v1/speak`

`POST /v1/speak` body:

```json
{
  "episode": "2026-03-28-episode-042...",
  "title": "Tom, Torque & Gochujang",
  "format": "mp3",
  "segments": [
    {"type": "dialogue", "speaker": "CALLUM", "text": "..."},
    {"type": "scene", "text": "OPEN PLAN OFFICE"}
  ]
}
```

## Run locally

1. Install Piper + ffmpeg and download voice models.
2. Set model env vars (you can map multiple roles to one model initially):

```bash
export PIPER_MODEL_CALLUM=models/en_GB-alan-medium.onnx
export PIPER_MODEL_TOM=models/en_GB-alan-medium.onnx
export PIPER_MODEL_MARS=models/en_GB-cori-high.onnx
export PIPER_MODEL_ANALYST=models/en_GB-cori-high.onnx
export PIPER_MODEL_NARRATOR=models/en_GB-alan-medium.onnx
export PIPER_MODEL_SCENE=models/en_GB-cori-high.onnx
```

3. Start server:

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Wire into web app

Use query param:

- `https://oc-dev-snf.github.io/cabinet-chaos-episodes/?ttsApi=https://YOUR-TTS-HOST`

When configured, the frontend prefers this neural endpoint first, then falls back to browser/system voices.
