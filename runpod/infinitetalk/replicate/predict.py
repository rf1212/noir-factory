"""
Replicate Cog predictor for InfiniteTalk LipSync.

Accepts image_url + audio_url, runs Wan2.1 InfiniteTalk inference,
uploads output MP4 to Supabase, returns public video URL as a string.
"""

import os
import json
import subprocess
import tempfile
from pathlib import Path

import httpx
from cog import BasePredictor, Input
from huggingface_hub import snapshot_download

WEIGHTS_DIR = Path("/src/weights")
INFINITETALK_REPO = Path("/src/InfiniteTalk")


class Predictor(BasePredictor):
    def setup(self):
        """Download model weights once on cold start. Cached across predictions."""
        os.environ["PYTHONPATH"] = str(INFINITETALK_REPO)
        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

        for repo_id, local_name in [
            ("TencentGameMate/chinese-wav2vec2-base", "chinese-wav2vec2-base"),
            ("MeiGen-AI/InfiniteTalk", "InfiniteTalk"),
            ("Wan-AI/Wan2.1-I2V-14B-480P", "Wan2.1-I2V-14B-480P"),
        ]:
            dest = WEIGHTS_DIR / local_name
            if dest.exists() and any(dest.iterdir()):
                print(f"[weights] {local_name} cached")
                continue
            print(f"[weights] Downloading {repo_id}...")
            snapshot_download(repo_id=repo_id, local_dir=str(dest))
            print(f"[weights] {local_name} done")

        print("[setup] Ready.")

    def predict(
        self,
        image_url: str = Input(description="Avatar image URL (JPG/PNG)"),
        audio_url: str = Input(description="TTS audio URL (WAV)"),
        job_id: str = Input(description="Job ID used for Supabase upload path"),
        resolution: str = Input(
            description="Output resolution",
            default="480p",
            choices=["480p", "720p"],
        ),
        fps: int = Input(description="Frames per second", default=25),
    ) -> str:
        """Run InfiniteTalk inference and return Supabase public video URL."""

        env = os.environ.copy()
        env["PYTHONPATH"] = str(INFINITETALK_REPO)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # ---- Download inputs ------------------------------------------------
            image_path = tmpdir / "input_image.jpg"
            audio_path = tmpdir / "input_audio.wav"
            self._download(image_url, image_path)
            self._download(audio_url, audio_path)

            print(f"[run] Image: {image_path} ({image_path.stat().st_size} bytes)")
            print(f"[run] Audio: {audio_path} ({audio_path.stat().st_size} bytes)")

            # ---- Build input JSON -----------------------------------------------
            # CRITICAL: InfiniteTalk expects a SINGLE dict with these keys:
            #   cond_video  — path to reference image (despite the name)
            #   cond_audio  — dict mapping person IDs to audio paths
            #   prompt      — text description
            # NOT a list, and NOT {"image": ..., "audio": ...}
            input_json = tmpdir / "input.json"
            input_json.write_text(
                json.dumps(
                    {
                        "prompt": "A person is talking naturally with clear lip movements",
                        "cond_video": str(image_path),
                        "cond_audio": {"person1": str(audio_path)},
                    }
                )
            )

            output_path = tmpdir / "output_video"

            # ---- Run inference --------------------------------------------------
            cmd = [
                "python",
                str(INFINITETALK_REPO / "generate_infinitetalk.py"),
                "--ckpt_dir",
                str(WEIGHTS_DIR / "Wan2.1-I2V-14B-480P"),
                "--wav2vec_dir",
                str(WEIGHTS_DIR / "chinese-wav2vec2-base"),
                "--infinitetalk_dir",
                str(
                    WEIGHTS_DIR
                    / "InfiniteTalk"
                    / "single"
                    / "infinitetalk.safetensors"
                ),
                "--input_json",
                str(input_json),
                "--size",
                f"infinitetalk-{'480' if resolution == '480p' else '720'}",
                "--sample_steps",
                "40",
                "--mode",
                "streaming",
                "--motion_frame",
                "9",
                "--save_file",
                str(output_path),
                "--num_persistent_param_in_dit",
                "0",
            ]

            print(f"[run] Launching inference ...")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(INFINITETALK_REPO),
                env=env,
            )
            if result.returncode != 0:
                err = result.stderr[-3000:] if result.stderr else "unknown error"
                print(f"[run] STDERR:\n{err}")
                raise RuntimeError(f"InfiniteTalk failed:\n{err}")

            print("[run] Inference completed.")

            # ---- Locate output --------------------------------------------------
            output_mp4 = Path(str(output_path) + ".mp4")
            if not output_mp4.exists():
                # try common alternatives
                for suffix in ["_0.mp4", "_000.mp4", "/output.mp4"]:
                    alt = Path(str(output_path) + suffix)
                    if alt.exists():
                        output_mp4 = alt
                        break
                else:
                    tmp_files = list(tmpdir.glob("**/*.mp4"))
                    if tmp_files:
                        output_mp4 = tmp_files[0]
                    else:
                        raise RuntimeError(
                            f"Output not found. tmpdir contents: "
                            f"{[str(p) for p in tmpdir.rglob('*')]}"
                        )

            print(f"[run] Output: {output_mp4} ({output_mp4.stat().st_size} bytes)")

            # ---- Upload to Supabase ---------------------------------------------
            video_url = self._upload_to_supabase(output_mp4, job_id)
            print(f"[run] Uploaded: {video_url}")
            return video_url

    # ---- Helpers ----------------------------------------------------------------
    def _download(self, url: str, dest: Path):
        with httpx.stream("GET", url, follow_redirects=True, timeout=120) as r:
            r.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in r.iter_bytes():
                    f.write(chunk)

    def _upload_to_supabase(self, file_path: Path, job_id: str) -> str:
        supabase_url = os.environ.get("SUPABASE_URL", "https://ghzvppbkuudkpzlcidlx.supabase.co")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoenZwcGJrdXVka3B6bGNpZGx4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTc0NzA2NSwiZXhwIjoyMDg1MzIzMDY1fQ.S1MrbhVNYXBMllMyykJdpimkkWrfe_8a6sIHQgwIIRo")
        bucket = "pipeline-media"
        object_path = f"lipsync/{job_id}.mp4"

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "video/mp4",
            "x-upsert": "true",
        }
        resp = httpx.post(url, content=file_bytes, headers=headers, timeout=120)
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Supabase upload failed ({resp.status_code}): {resp.text[:500]}"
            )
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{object_path}"
