"""Decode untrusted evidence into bounded PRIVATE review derivatives.

Metadata removal is not visual/audio redaction. Nothing produced here is approved
for public delivery; faces, voices and landmarks still require human review.
"""

import hashlib
import json
import math
import os
import shutil
import subprocess
import tempfile
import time
import warnings
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import PIL
import psutil
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024
MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
MAX_VIDEO_SECONDS = 120
MAX_VIDEO_DIMENSION = 4096
MAX_PROCESS_RSS = 512 * 1024 * 1024
MAX_TOOL_LOG = 512 * 1024
PROCESSING_VERSION = "xersxes-private-media-v1"
IMAGE_FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
VIDEO_TYPES = {"video/mp4", "video/quicktime"}


class ProcessingError(Exception):
    def __init__(self, code: str, *, retryable: bool = False):
        self.code = code
        self.retryable = retryable
        super().__init__(code)


@dataclass(frozen=True)
class ProcessedMedia:
    detected_mime_type: str
    media_kind: str
    width: int
    height: int
    duration_seconds: float | None
    review_path: Path
    thumbnail_path: Path
    review_sha256: str
    thumbnail_sha256: str
    processing_version: str


def sniff_media_type(prefix: bytes) -> str | None:
    """A conservative signature check. Full decoding remains mandatory."""
    if prefix.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if prefix.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(prefix) >= 12 and prefix[:4] == b"RIFF" and prefix[8:12] == b"WEBP":
        return "image/webp"
    # Accept modern ISO-BMFF containers only. HEIF/AVIF, 3GP and legacy MOV
    # without a recognizable ftyp are outside the initial allowlist.
    offset = 0
    for _ in range(8):
        if offset + 16 > len(prefix):
            break
        length = int.from_bytes(prefix[offset : offset + 4], "big")
        kind = prefix[offset + 4 : offset + 8]
        if length < 8:
            break
        if kind == b"ftyp":
            brand = prefix[offset + 8 : offset + 12]
            if brand == b"qt  ":
                return "video/quicktime"
            if brand in {
                b"isom",
                b"iso2",
                b"iso3",
                b"iso4",
                b"iso5",
                b"iso6",
                b"mp41",
                b"mp42",
                b"avc1",
                b"M4V ",
                b"MSNV",
            }:
                return "video/mp4"
            return None
        if kind not in {b"free", b"skip", b"wide"} or length > len(prefix) - offset:
            break
        offset += length
    return None


def _sha256(path: Path) -> str:
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def _tool(name: str) -> str:
    path = os.environ.get(f"{name.upper()}_PATH") or shutil.which(name)
    if not path or not Path(path).is_file():
        raise ProcessingError("processor_unavailable", retryable=True)
    return str(Path(path).resolve())


def _run_limited(arguments: list[str], *, timeout: int, max_stdout: int = MAX_TOOL_LOG) -> bytes:
    # Do not pass database credentials, storage credentials or FFREPORT into
    # decoder processes. RSS sampling is a resource guard, not a security sandbox.
    environment = {
        name: value
        for name, value in os.environ.items()
        if name.upper() in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP"}
    }
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        try:
            process = subprocess.Popen(
                arguments,
                stdin=subprocess.DEVNULL,
                stdout=output,
                stderr=errors,
                env=environment,
                close_fds=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except OSError:
            raise ProcessingError("processor_unavailable", retryable=True) from None
        started = time.monotonic()
        try:
            try:
                monitor = psutil.Process(process.pid)
            except psutil.NoSuchProcess:
                monitor = None
            except psutil.Error:
                raise ProcessingError("processor_unavailable", retryable=True) from None
            while process.poll() is None:
                if time.monotonic() - started > timeout:
                    raise ProcessingError("processing_timeout")
                if (
                    os.fstat(output.fileno()).st_size > max_stdout
                    or os.fstat(errors.fileno()).st_size > MAX_TOOL_LOG
                ):
                    raise ProcessingError("invalid_media")
                try:
                    if monitor is not None and monitor.memory_info().rss > MAX_PROCESS_RSS:
                        raise ProcessingError("media_too_large")
                except psutil.NoSuchProcess:
                    pass
                except psutil.Error:
                    raise ProcessingError("processor_unavailable", retryable=True) from None
                time.sleep(0.05)
            if process.returncode != 0:
                raise ProcessingError("invalid_media")
            if os.fstat(output.fileno()).st_size > max_stdout:
                raise ProcessingError("invalid_media")
            output.seek(0)
            return output.read(max_stdout)
        finally:
            if process.poll() is None:
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
            process.wait(timeout=10)


@lru_cache(maxsize=2)
def _tool_version(binary: str) -> str:
    text = _run_limited([binary, "-version"], timeout=10).decode("utf-8", errors="replace")
    parts = text.splitlines()[0].split() if text else []
    return parts[2][:64] if len(parts) > 2 else "unknown"


def _probe(path: Path) -> dict:
    result = _run_limited(
        [
            _tool("ffprobe"),
            "-v",
            "error",
            "-max_alloc",
            "67108864",
            "-protocol_whitelist",
            "file,pipe",
            "-probesize",
            "5242880",
            "-analyzeduration",
            "5000000",
            "-enable_drefs",
            "0",
            "-use_absolute_path",
            "0",
            "-f",
            "mov",
            "-show_entries",
            "format=format_name,duration,size:stream=index,codec_type,codec_name,width,height,duration,avg_frame_rate,nb_frames",
            "-of",
            "json",
            str(path),
        ],
        timeout=20,
        max_stdout=65536,
    )
    try:
        data = json.loads(result)
        if not isinstance(data, dict):
            raise TypeError
        return data
    except (ValueError, TypeError):
        raise ProcessingError("invalid_media") from None


def _video_info(data: dict, *, output: bool = False) -> tuple[int, int, float]:
    try:
        streams = data["streams"]
        if "mov" not in data["format"]["format_name"].split(","):
            raise ValueError
        if not isinstance(streams, list) or not 1 <= len(streams) <= 2:
            raise ValueError
        videos = [stream for stream in streams if stream["codec_type"] == "video"]
        audios = [stream for stream in streams if stream["codec_type"] == "audio"]
        if len(videos) != 1 or len(audios) > 1 or len(videos) + len(audios) != len(streams):
            raise ValueError
        video = videos[0]
        allowed = {"h264"} if output else {"h264", "hevc", "mpeg4"}
        if video["codec_name"] not in allowed:
            raise ProcessingError("unsupported_media")
        width, height = int(video["width"]), int(video["height"])
        duration = float(data["format"]["duration"])
        if min(width, height) < 1 or not math.isfinite(duration) or duration <= 0:
            raise ValueError
        if (
            width > MAX_VIDEO_DIMENSION
            or height > MAX_VIDEO_DIMENSION
            or duration > MAX_VIDEO_SECONDS
        ):
            raise ProcessingError("media_too_large")
        if output and (width > 1280 or height > 720):
            raise ValueError
        rate = video.get("avg_frame_rate", "0/0").split("/")
        if len(rate) == 2 and float(rate[1]) > 0 and float(rate[0]) / float(rate[1]) > 120:
            raise ProcessingError("media_too_large")
        return width, height, duration
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        raise ProcessingError("invalid_media") from None


def _fresh_rgb(image: Image.Image) -> Image.Image:
    oriented = ImageOps.exif_transpose(image)
    fresh = Image.new("RGB", oriented.size, "white")
    if "A" in oriented.getbands() or "transparency" in oriented.info:
        rgba = oriented.convert("RGBA")
        fresh.paste(rgba, mask=rgba.getchannel("A"))
    else:
        fresh.paste(oriented.convert("RGB"))
    return fresh


def _image(source: Path, mime: str, destination: Path) -> ProcessedMedia:
    review = destination / "review.jpg"
    thumbnail = destination / "thumbnail.jpg"
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(source, formats=list(IMAGE_FORMATS.values())) as candidate:
                if (
                    candidate.format != IMAGE_FORMATS[mime]
                    or getattr(candidate, "n_frames", 1) != 1
                ):
                    raise ProcessingError("unsupported_media")
                if min(candidate.size) < 1 or candidate.width * candidate.height > MAX_IMAGE_PIXELS:
                    raise ProcessingError("media_too_large")
                candidate.verify()
            with Image.open(source, formats=list(IMAGE_FORMATS.values())) as candidate:
                candidate.load()
                fresh = _fresh_rgb(candidate)
            fresh.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            fresh.save(review, "JPEG", quality=85, optimize=True)
            if review.stat().st_size > MAX_IMAGE_BYTES:
                raise ProcessingError("media_too_large")
            width, height = fresh.size
            fresh.thumbnail((320, 320), Image.Resampling.LANCZOS)
            fresh.save(thumbnail, "JPEG", quality=80, optimize=True)
            if thumbnail.stat().st_size > MAX_THUMBNAIL_BYTES:
                raise ProcessingError("media_too_large")
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ProcessingError("media_too_large") from None
    except (OSError, ValueError, SyntaxError, UnidentifiedImageError):
        raise ProcessingError("invalid_media") from None
    return ProcessedMedia(
        mime,
        "image",
        width,
        height,
        None,
        review,
        thumbnail,
        _sha256(review),
        _sha256(thumbnail),
        f"{PROCESSING_VERSION};pillow={PIL.__version__}",
    )


def _video(source: Path, mime: str, destination: Path) -> ProcessedMedia:
    _, _, input_duration = _video_info(_probe(source))
    binary = _tool("ffmpeg")
    review = destination / "review.mp4"
    thumbnail = destination / "thumbnail.jpg"
    _run_limited(
        [
            binary,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-n",
            "-max_alloc",
            "67108864",
            "-threads",
            "2",
            "-protocol_whitelist",
            "file,pipe",
            "-probesize",
            "5242880",
            "-analyzeduration",
            "5000000",
            "-enable_drefs",
            "0",
            "-use_absolute_path",
            "0",
            "-f",
            "mov",
            "-i",
            str(source),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-sn",
            "-dn",
            "-map_metadata",
            "-1",
            "-map_metadata:s",
            "-1",
            "-map_chapters",
            "-1",
            "-vf",
            "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30,format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "25",
            "-maxrate",
            "2500k",
            "-bufsize",
            "5000k",
            "-threads",
            "2",
            "-filter_threads",
            "2",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-ac",
            "2",
            "-max_muxing_queue_size",
            "1024",
            "-t",
            str(MAX_VIDEO_SECONDS),
            "-fs",
            str(MAX_VIDEO_BYTES),
            "-movflags",
            "+faststart",
            str(review),
        ],
        timeout=180,
    )
    if not review.is_file() or review.stat().st_size > MAX_VIDEO_BYTES:
        raise ProcessingError("media_too_large")
    width, height, duration = _video_info(_probe(review), output=True)
    if abs(duration - input_duration) > 1:
        raise ProcessingError("invalid_media")
    _run_limited(
        [
            binary,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-n",
            "-max_alloc",
            "67108864",
            "-threads",
            "2",
            "-protocol_whitelist",
            "file,pipe",
            "-enable_drefs",
            "0",
            "-use_absolute_path",
            "0",
            "-f",
            "mov",
            "-i",
            str(review),
            "-map",
            "0:v:0",
            "-frames:v",
            "1",
            "-vf",
        "scale=w='min(320,iw)':h='min(320,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
            "-q:v",
            "3",
            "-map_metadata",
            "-1",
            "-threads",
            "2",
            "-filter_threads",
            "2",
            str(thumbnail),
        ],
        timeout=20,
    )
    if not thumbnail.is_file() or thumbnail.stat().st_size > MAX_THUMBNAIL_BYTES:
        raise ProcessingError("invalid_media")
    return ProcessedMedia(
        mime,
        "video",
        width,
        height,
        duration,
        review,
        thumbnail,
        _sha256(review),
        _sha256(thumbnail),
        f"{PROCESSING_VERSION};ffmpeg={_tool_version(binary)}",
    )


def process_media(source_path: Path, declared_mime: str, output_dir: Path) -> ProcessedMedia:
    if declared_mime not in {*IMAGE_FORMATS, *VIDEO_TYPES}:
        raise ProcessingError("unsupported_media")
    try:
        source = Path(source_path).resolve(strict=True)
        maximum = MAX_IMAGE_BYTES if declared_mime in IMAGE_FORMATS else MAX_VIDEO_BYTES
        if not 0 < source.stat().st_size <= maximum:
            raise ProcessingError("media_too_large")
        with source.open("rb") as stream:
            detected = sniff_media_type(stream.read(4096))
        if detected != declared_mime:
            raise ProcessingError("unsupported_media")
        destination = Path(output_dir).resolve()
        destination.mkdir(mode=0o700, parents=True, exist_ok=True)
        # Caller must provide a fresh attempt directory. Never overwrite a prior
        # result; stale workers must not mutate another worker's reviewed bytes.
        if any(destination.iterdir()):
            raise ProcessingError("invalid_media")
        if declared_mime in IMAGE_FORMATS:
            return _image(source, declared_mime, destination)
        return _video(source, declared_mime, destination)
    except OSError:
        raise ProcessingError("storage_unavailable", retryable=True) from None
