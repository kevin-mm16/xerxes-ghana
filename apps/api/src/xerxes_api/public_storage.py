"""Immutable publication objects in a separate root that is never a static mount."""

import os
import re
from collections.abc import Iterator
from pathlib import Path

from xerxes_api.evidence_storage import FileEvidenceStorage, StorageError, _is_link

_ROOT = Path(__file__).resolve().parents[4]
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\Z")


def validate_public_key(key: str) -> tuple[str, ...]:
    if not isinstance(key, str) or len(key) > 240:
        raise StorageError("storage_unavailable", retryable=False)
    parts = tuple(key.split("/"))
    if (
        len(parts) != 4
        or parts[0] != "published"
        or not _UUID.fullmatch(parts[1])
        or not _UUID.fullmatch(parts[2])
        or parts[3] not in {"asset.jpg", "asset.mp4", "thumbnail.jpg"}
    ):
        raise StorageError("storage_unavailable", retryable=False)
    return parts


class PublishedFileStorage(FileEvidenceStorage):
    """Reuse immutable staging/resource guards with an independent namespace policy."""

    def _path(self, key: str, *, make_parents: bool = False) -> Path:
        parts = validate_public_key(key)
        try:
            if _is_link(self.root):
                raise StorageError()
            current = self.root
            for part in parts[:-1]:
                current /= part
                if _is_link(current):
                    raise StorageError()
                if make_parents:
                    current.mkdir(mode=0o700, exist_ok=True)
            target = self.root.joinpath(*parts)
            if _is_link(target) or not target.resolve().is_relative_to(self.root):
                raise StorageError("storage_unavailable", retryable=False)
            return target
        except OSError:
            raise StorageError() from None

    def iter_keys(self, prefix: str = "published") -> Iterator[str]:
        parts = prefix.removesuffix("/").split("/")
        if (
            not 1 <= len(parts) <= 3
            or parts[0] != "published"
            or any(not _UUID.fullmatch(part) for part in parts[1:])
        ):
            raise StorageError("storage_unavailable", retryable=False)
        try:
            target = self.root
            for part in parts:
                target /= part
                if _is_link(target) or not target.resolve().is_relative_to(self.root):
                    raise StorageError()
            if not target.exists():
                return
            for folder, directories, files in os.walk(target, followlinks=False):
                parent = Path(folder)
                if _is_link(parent) or not parent.resolve().is_relative_to(self.root):
                    raise StorageError()
                for name in [*directories, *files]:
                    if _is_link(parent / name):
                        raise StorageError()
                for name in files:
                    key = (parent / name).relative_to(self.root).as_posix()
                    validate_public_key(key)
                    yield key
        except OSError:
            raise StorageError() from None


def get_public_storage() -> PublishedFileStorage:
    # As with private storage, an application-gated filesystem is a local MVP
    # adapter. A production object provider must preserve the publication gate.
    if os.environ.get(
        "PUBLIC_MEDIA_STORAGE_PROVIDER", "filesystem"
    ) != "filesystem" or os.environ.get("APP_ENV") not in {"development", "test"}:
        raise StorageError("storage_unavailable", retryable=False)
    configured = Path(os.environ.get("PUBLIC_MEDIA_STORAGE_PATH", ".local/published"))
    root = configured if configured.is_absolute() else _ROOT / configured
    private_config = Path(os.environ.get("EVIDENCE_STORAGE_PATH", ".local/evidence"))
    private = private_config if private_config.is_absolute() else _ROOT / private_config
    resolved, private_resolved = root.resolve(), private.resolve()
    if resolved.is_relative_to(private_resolved) or private_resolved.is_relative_to(resolved):
        raise StorageError("storage_unavailable", retryable=False)
    return PublishedFileStorage(root)
