#!/usr/bin/env python3
import argparse
import re
import subprocess
import tempfile
from pathlib import Path


def clean_markdown(md: str) -> str:
    lines = []
    for raw in md.splitlines():
        line = raw.strip()
        if not line:
            lines.append("")
            continue
        if line.startswith("---"):
            continue
        # Skip high-level title metadata headings but keep section headings as spoken cues
        if line.startswith("# "):
            continue

        line = re.sub(r"^##\s+", "", line)
        line = re.sub(r"^###\s+", "", line)
        line = line.replace("**", "")
        line = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", line)
        line = line.replace("_", "")

        # Turn speaker cues into natural speech separators
        line = re.sub(r"^([A-Z][A-Z\s\-']{1,40}):\s*", r"\1. ", line)

        # Read scene directions a bit cleaner
        if line.startswith("(") and line.endswith(")"):
            line = f"Scene note. {line[1:-1]}"

        lines.append(line)

    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def run(cmd):
    subprocess.run(cmd, check=True)


def synth_episode(md_path: Path, out_mp3: Path, voice: str, speed: int, pitch: int, amplitude: int):
    md = md_path.read_text(encoding="utf-8", errors="replace")
    text = clean_markdown(md)
    if not text:
        return False

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        txt = td / "input.txt"
        wav = td / "out.wav"
        txt.write_text(text, encoding="utf-8")

        run([
            "espeak-ng",
            "-v", voice,
            "-s", str(speed),
            "-p", str(pitch),
            "-a", str(amplitude),
            "-f", str(txt),
            "-w", str(wav),
        ])

        out_mp3.parent.mkdir(parents=True, exist_ok=True)
        run([
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(wav),
            "-codec:a", "libmp3lame",
            "-q:a", "5",
            str(out_mp3),
        ])
    return True


def main():
    ap = argparse.ArgumentParser(description="Generate FOSS episode audio with espeak-ng + ffmpeg")
    ap.add_argument("--episodes-dir", default="episodes")
    ap.add_argument("--audio-dir", default="audio")
    ap.add_argument("--voice", default="en-gb+m3", help="espeak-ng voice")
    ap.add_argument("--speed", type=int, default=170)
    ap.add_argument("--pitch", type=int, default=38)
    ap.add_argument("--amplitude", type=int, default=125)
    ap.add_argument("--force", action="store_true", help="regenerate existing audio files")
    args = ap.parse_args()

    episodes_dir = Path(args.episodes_dir)
    audio_dir = Path(args.audio_dir)

    episode_files = sorted(episodes_dir.glob("*.md"))
    if not episode_files:
        print("No episode markdown files found.")
        return

    made = 0
    skipped = 0
    for md_path in episode_files:
        out_mp3 = audio_dir / f"{md_path.stem}.mp3"
        if out_mp3.exists() and not args.force:
            skipped += 1
            continue
        print(f"Generating {out_mp3.name} ...")
        ok = synth_episode(md_path, out_mp3, args.voice, args.speed, args.pitch, args.amplitude)
        if ok:
            made += 1

    print(f"Done. generated={made} skipped={skipped} total={len(episode_files)}")


if __name__ == "__main__":
    main()
