"""Decode real synthetic media and reject unsafe or unsupported inputs."""

import hashlib
import json
import shutil
import subprocess
import sys

import pytest
from PIL import Image

from xerxes_api import media_processing as processing
from xerxes_api.media_processing import ProcessingError, process_media, sniff_media_type


@pytest.mark.parametrize(
    ("prefix", "expected"),
    [
        (b"\xff\xd8\xff\xe0", "image/jpeg"),
        (b"\x89PNG\r\n\x1a\n", "image/png"),
        (b"RIFF\x10\x00\x00\x00WEBP", "image/webp"),
        (b"\x00\x00\x00\x18ftypisom\x00\x00\x02\x00", "video/mp4"),
        (b"\x00\x00\x00\x18ftypqt  \x00\x00\x02\x00", "video/quicktime"),
        (b"\x00\x00\x00\x18ftypheic\x00\x00\x02\x00", None),
        (b"GIF89a", None),
    ],
)
def test_signature_allowlist(prefix, expected):
    assert sniff_media_type(prefix) == expected


def test_image_review_derivative_removes_metadata_and_preserves_original(tmp_path):
    source = tmp_path / "private-photo.jpg"
    image = Image.new("RGB", (120, 80), "green")
    exif = Image.Exif()
    exif[315] = "private contributor"
    exif[274] = 6
    exif[306] = "2020:01:02 03:04:05"
    image.save(source, exif=exif)
    original = source.read_bytes()
    result = process_media(source, "image/jpeg", tmp_path / "attempt")
    assert source.read_bytes() == original
    assert (result.width, result.height, result.media_kind) == (80, 120, "image")
    with Image.open(result.review_path) as review:
        assert len(review.getexif()) == 0
        assert "icc_profile" not in review.info
    assert b"private contributor" not in result.review_path.read_bytes()
    assert result.review_sha256 == hashlib.sha256(result.review_path.read_bytes()).hexdigest()
    assert result.thumbnail_sha256 == hashlib.sha256(result.thumbnail_path.read_bytes()).hexdigest()


@pytest.mark.parametrize(("mime", "format_"), [("image/png", "PNG"), ("image/webp", "WEBP")])
def test_image_formats_become_bounded_jpeg_reviews(tmp_path, mime, format_):
    source = tmp_path / "input"
    Image.new("RGBA", (2500, 1000), (100, 150, 200, 100)).save(source, format_)
    result = process_media(source, mime, tmp_path / "attempt")
    assert (result.width, result.height) == (2048, 819)
    with Image.open(result.review_path) as review:
        assert review.format == "JPEG"
    with Image.open(result.thumbnail_path) as thumbnail:
        assert max(thumbnail.size) <= 320


def test_signature_mismatch_and_corrupt_media_are_rejected(tmp_path):
    source = tmp_path / "input.png"
    Image.new("RGB", (20, 20)).save(source)
    with pytest.raises(ProcessingError, match="unsupported_media"):
        process_media(source, "image/jpeg", tmp_path / "mismatch")
    source.write_bytes(b"\x89PNG\r\n\x1a\nmalformed")
    with pytest.raises(ProcessingError, match="invalid_media"):
        process_media(source, "image/png", tmp_path / "corrupt")


def test_animated_images_are_not_silently_reduced_to_one_frame(tmp_path):
    source = tmp_path / "animated.webp"
    first = Image.new("RGB", (20, 20), "red")
    first.save(
        source, save_all=True, append_images=[Image.new("RGB", (20, 20), "blue")], duration=100
    )
    with pytest.raises(ProcessingError, match="unsupported_media"):
        process_media(source, "image/webp", tmp_path / "attempt")


def test_image_pixel_limit_is_checked_before_decoding_large_images(tmp_path, monkeypatch):
    source = tmp_path / "input.png"
    Image.new("RGB", (20, 20)).save(source)
    monkeypatch.setattr(processing, "MAX_IMAGE_PIXELS", 100)
    with pytest.raises(ProcessingError, match="media_too_large"):
        process_media(source, "image/png", tmp_path / "attempt")


@pytest.mark.parametrize(
    ("budget", "limit"),
    [
        ("MAX_IMAGE_BYTES", 200),
        ("MAX_THUMBNAIL_BYTES", 20),
    ],
)
def test_image_derivatives_cannot_exceed_reserved_output_bytes(
    tmp_path, monkeypatch, budget, limit
):
    source = tmp_path / "input.png"
    Image.new("RGB", (8, 8)).save(source)
    monkeypatch.setattr(processing, budget, limit)
    with pytest.raises(ProcessingError, match="media_too_large"):
        process_media(source, "image/png", tmp_path / "attempt")


def test_private_tool_environment_and_runtime_limit(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "private-value-that-must-not-reach-decoders")
    output = processing._run_limited(
        [sys.executable, "-c", "import os;print('DATABASE_URL' in os.environ)"],
        timeout=5,
    )
    assert output.strip() == b"False"
    with pytest.raises(ProcessingError, match="processing_timeout"):
        processing._run_limited([sys.executable, "-c", "import time;time.sleep(3)"], timeout=0)


def test_tool_stdout_cannot_exceed_the_budget():
    with pytest.raises(ProcessingError, match="invalid_media"):
        processing._run_limited(
            [sys.executable, "-c", "print('x'*10000)"], timeout=5, max_stdout=128
        )


def test_decoder_is_stopped_when_its_memory_cannot_be_bounded(monkeypatch):
    monkeypatch.setattr(processing, "MAX_PROCESS_RSS", 1)
    with pytest.raises(ProcessingError, match="media_too_large"):
        processing._run_limited([sys.executable, "-c", "import time;time.sleep(3)"], timeout=5)


@pytest.fixture(scope="module", params=[("mp4", "video/mp4"), ("mov", "video/quicktime")])
def video(request, tmp_path_factory):
    binary = shutil.which("ffmpeg")
    if not binary or not shutil.which("ffprobe"):
        pytest.skip("Install FFmpeg/ffprobe to exercise real video processing")
    extension, mime = request.param
    size = "240x320" if extension == "mov" else "320x240"
    path = tmp_path_factory.mktemp("synthetic-video") / f"input.{extension}"
    subprocess.run(
        [
            binary,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-n",
            "-f",
            "lavfi",
            "-i",
            f"color=c=green:s={size}:r=10:d=1.2",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=1000:duration=1.2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-threads",
            "1",
            "-c:a",
            "aac",
            "-metadata",
            "title=private-camera-identifier",
            "-metadata",
            "creation_time=2020-01-02T03:04:05Z",
            "-shortest",
            str(path),
        ],
        check=True,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        timeout=20,
    )
    return path, mime


def test_real_video_is_reencoded_with_private_review_thumbnail(video, tmp_path):
    source, mime = video
    before = source.read_bytes()
    result = process_media(source, mime, tmp_path / "attempt")
    assert result.media_kind == "video"
    assert 0 < result.duration_seconds <= 2
    assert result.width <= 1280 and result.height <= 720
    assert result.review_sha256 != hashlib.sha256(before).hexdigest()
    assert source.read_bytes() == before
    metadata = subprocess.run(
        [
            shutil.which("ffprobe"),
            "-v",
            "error",
            "-show_entries",
            "format_tags:stream_tags",
            "-of",
            "json",
            str(result.review_path),
        ],
        check=True,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        timeout=10,
    )
    tags = json.loads(metadata.stdout)
    assert "private-camera-identifier" not in json.dumps(tags)
    assert "2020-01-02" not in json.dumps(tags)
    with Image.open(result.thumbnail_path) as thumbnail:
        assert thumbnail.format == "JPEG" and len(thumbnail.getexif()) == 0
        assert max(thumbnail.size) <= 320


def test_video_duration_limit_rejects_before_transcoding(video, tmp_path, monkeypatch):
    source, mime = video
    monkeypatch.setattr(processing, "MAX_VIDEO_SECONDS", 1)
    with pytest.raises(ProcessingError, match="media_too_large"):
        process_media(source, mime, tmp_path / "attempt")
