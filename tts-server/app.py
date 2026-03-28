from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field


PIPER_BIN = os.getenv("PIPER_BIN", "piper")
FFMPEG_BIN = os.getenv("FFMPEG_BIN", "ffmpeg")
CACHE_DIR = Path(os.getenv("TTS_CACHE_DIR", "/tmp/cabinet-chaos-tts-cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Configure model paths via env. You can point multiple roles to the same model to start.
VOICE_MODEL_MAP = {
    "CALLUM": os.getenv("PIPER_MODEL_CALLUM", "models/en_GB-alan-medium.onnx"),
    "TOM": os.getenv("PIPER_MODEL_TOM", "models/en_GB-alan-medium.onnx"),
    "MARS": os.getenv("PIPER_MODEL_MARS", "models/en_GB-cori-high.onnx"),
    "ANALYST": os.getenv("PIPER_MODEL_ANALYST", "models/en_GB-cori-high.onnx"),
    "NARRATOR": os.getenv("PIPER_MODEL_NARRATOR", "models/en_GB-alan-medium.onnx"),
    "SCENE": os.getenv("PIPER_MODEL_SCENE", "models/en_GB-cori-high.onnx"),
}


class Segment(BaseModel):
    type: Literal["dialogue", "scene", "narration"]
    text: str = Field(min_length=1)
    speaker: str | None = None


class SpeakRequest(BaseModel):
    episode: str
    title: str = ""
    segments: list[Segment]
    format: Literal["mp3", "wav"] = "mp3"


app = FastAPI(title="Cabinet Chaos Neural TTS API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def model_for_segment(seg: Segment) -> str:
    if seg.type == "scene":
        return VOICE_MODEL_MAP["SCENE"]
    if seg.type == "dialogue" and seg.speaker:
        return VOICE_MODEL_MAP.get(seg.speaker.upper(), VOICE_MODEL_MAP["NARRATOR"])
    return VOICE_MODEL_MAP["NARRATOR"]


def run_checked(cmd: list[str]):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "command failed").strip())


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/v1/speak")
def speak(req: SpeakRequest):
    if not req.segments:
        raise HTTPException(status_code=400, detail="segments required")

    cache_key = hashlib.sha256(
        json.dumps(req.model_dump(), sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
    ext = "mp3" if req.format == "mp3" else "wav"
    out_file = CACHE_DIR / f"{cache_key}.{ext}"
    if out_file.exists():
        return FileResponse(path=str(out_file), media_type=f"audio/{ext}", filename=out_file.name)

    with tempfile.TemporaryDirectory(prefix="cabinet-chaos-tts-") as td:
        tdp = Path(td)
        wav_parts: list[Path] = []

        for i, seg in enumerate(req.segments):
            model = model_for_segment(seg)
            in_txt = tdp / f"seg-{i:04d}.txt"
            out_wav = tdp / f"seg-{i:04d}.wav"
            in_txt.write_text(seg.text.strip(), encoding="utf-8")

            cmd = [PIPER_BIN, "--model", model, "--output_file", str(out_wav), "--input_file", str(in_txt)]
            try:
                run_checked(cmd)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"piper failed for segment {i}: {e}")

            wav_parts.append(out_wav)

        list_file = tdp / "concat.txt"
        list_file.write_text("\n".join([f"file '{p.as_posix()}'" for p in wav_parts]), encoding="utf-8")
        merged_wav = tdp / "merged.wav"

        try:
            run_checked([
                FFMPEG_BIN,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c",
                "copy",
                str(merged_wav),
            ])
        except Exception:
            # fallback to re-encode concat if stream copy fails
            run_checked([
                FFMPEG_BIN,
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                str(merged_wav),
            ])

        if req.format == "wav":
            shutil.copy2(merged_wav, out_file)
        else:
            run_checked([
                FFMPEG_BIN,
                "-y",
                "-i",
                str(merged_wav),
                "-codec:a",
                "libmp3lame",
                "-q:a",
                "4",
                str(out_file),
            ])

    return FileResponse(path=str(out_file), media_type=f"audio/{ext}", filename=out_file.name)
