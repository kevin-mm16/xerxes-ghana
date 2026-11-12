"""Private, immutable evidence objects behind a provider-neutral interface.

The native filesystem provider is for development/tests. It is never mounted by
the web server and deliberately does not provide public URLs.
"""

import errno
import os
import re
import shutil
import tempfile
from collections.abc import Iterator
from contextlib import AbstractContextManager, contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

if os.name == "nt":
    import msvcrt
else:
    import fcntl


class StorageError(Exception):
    """A safe operational error; object keys and filesystem paths stay private."""

    def __init__(self, code: str = "storage_unavailable", *, retryable: bool = True):
        self.code = code
        self.retryable = retryable
        super().__init__(code)


class EvidenceStorage(Protocol):
    def temporary_path(self) -> Path: ...

    def put_file(self, key: str, source: Path) -> None: ...

    def local_copy(self, key: str) -> AbstractContextManager[Path]: ...

    def delete(self, key: str) -> None: ...

    def iter_keys(self, prefix: str) -> Iterator[str]: ...

    def object_modified_at(self, key: str) -> datetime: ...

    def remove_stale_temporary(self, older_than: datetime) -> int: ...

    def work_directory(self) -> AbstractContextManager[Path]: ...


_SEGMENT = re.compile(r"[a-z0-9][a-z0-9._-]{0,100}\Z")
_ROOT = Path(__file__).resolve().parents[4]


def validate_object_key(key: str) -> tuple[str, ...]:
    if not isinstance(key, str) or len(key) > 300:
        raise StorageError("storage_unavailable", retryable=False)
    parts = tuple(key.split("/"))
    if (
        not 2 <= len(parts) <= 5
        or parts[0] not in {"quarantine", "review"}
        or any(part in {".", ".."} or not _SEGMENT.fullmatch(part) for part in parts)
    ):
        raise StorageError("storage_unavailable", retryable=False)
    return parts


def _validate_prefix(prefix: str) -> tuple[str, ...]:
    if not isinstance(prefix, str) or len(prefix) > 300:
        raise StorageError("storage_unavailable", retryable=False)
    parts = tuple(prefix.removesuffix("/").split("/"))
    if (
        not 1 <= len(parts) <= 5
        or parts[0] not in {"quarantine", "review"}
        or any(part in {".", ".."} or not _SEGMENT.fullmatch(part) for part in parts)
    ):
        raise StorageError("storage_unavailable", retryable=False)
    return parts


class FileEvidenceStorage:
    """Private files, with an atomic exclusive commit and independent bytes."""

    def __init__(self, root: Path):
        raw_root = Path(root).absolute()
        if any(_is_link(part) for part in (raw_root, *raw_root.parents)):
            raise StorageError("storage_unavailable")
        self.root = raw_root.resolve()
        web_root = (_ROOT / "apps/web").resolve()
        if self.root == Path(self.root.anchor) or self.root.is_relative_to(web_root):
            raise StorageError("storage_unavailable")
        try:
            self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
            self.staging = self.root / ".staging"
            if _is_link(self.staging):
                raise StorageError("storage_unavailable")
            self.staging.mkdir(mode=0o700, exist_ok=True)
        except OSError:
            raise StorageError() from None

    def _path(self, key: str, *, make_parents: bool = False) -> Path:
        parts = validate_object_key(key)
        current = self.root
        try:
            if _is_link(self.root):
                raise StorageError()
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

    def temporary_path(self) -> Path:
        try:
            if _is_link(self.staging) or not self.staging.resolve().is_relative_to(self.root):
                raise StorageError()
            descriptor, name = tempfile.mkstemp(
                prefix="evidence-", suffix=".part", dir=self.staging
            )
            os.close(descriptor)
            return Path(name)
        except OSError:
            raise StorageError() from None

    def _checked_staging(self):
        if _is_link(self.staging) or not self.staging.resolve().is_relative_to(self.root):
            raise StorageError()

    @contextmanager
    def _work_lock(self, marker: Path) -> Iterator[bool]:
        descriptor = None
        locked = False
        try:
            self._checked_staging()
            if marker.parent != self.staging or _is_link(marker):
                raise StorageError()
            descriptor = os.open(
                marker, os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0), 0o600
            )
            if os.fstat(descriptor).st_size == 0:
                os.write(descriptor, b"0")
            os.lseek(descriptor, 0, os.SEEK_SET)
            try:
                if os.name == "nt":
                    msvcrt.locking(descriptor, msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as error:
                if error.errno in {errno.EACCES, errno.EAGAIN, errno.EDEADLK}:
                    yield False
                    return
                raise
            locked = True
            yield True
        except OSError:
            raise StorageError() from None
        finally:
            if descriptor is not None:
                try:
                    if locked:
                        os.lseek(descriptor, 0, os.SEEK_SET)
                        if os.name == "nt":
                            msvcrt.locking(descriptor, msvcrt.LK_UNLCK, 1)
                        else:
                            fcntl.flock(descriptor, fcntl.LOCK_UN)
                finally:
                    os.close(descriptor)
            if locked and not _is_link(marker):
                try:
                    marker.unlink(missing_ok=True)
                except OSError:
                    pass

    def _remove_work_directory(self, path: Path, *, older_than: datetime | None = None) -> bool:
        self._checked_staging()
        if path.parent != self.staging or not re.fullmatch(r"work-[a-z0-9_]{8}", path.name):
            raise StorageError()
        if _is_link(path) or not path.resolve().is_relative_to(self.staging):
            raise StorageError()
        if not path.exists():
            return False
        children = list(path.iterdir())
        # Validate the entire flat workspace before deleting anything. Unknown
        # nested directories or links require operator attention, never traversal.
        for child in children:
            if _is_link(child) or not child.is_file() or not child.resolve().is_relative_to(path):
                raise StorageError()
        if older_than is not None and (
            datetime.fromtimestamp(path.stat().st_mtime, tz=UTC) >= older_than
            or any(
                datetime.fromtimestamp(child.stat().st_mtime, tz=UTC) >= older_than
                for child in children
            )
        ):
            return False
        for child in children:
            child.unlink(missing_ok=True)
        path.rmdir()
        return True

    @contextmanager
    def work_directory(self) -> Iterator[Path]:
        self._checked_staging()
        try:
            path = Path(tempfile.mkdtemp(prefix="work-", dir=self.staging))
            marker = self.staging / f"{path.name}.lock"
            with self._work_lock(marker) as locked:
                if not locked:
                    raise StorageError()
                try:
                    yield path
                finally:
                    self._remove_work_directory(path)
        except OSError:
            raise StorageError() from None

    def put_file(self, key: str, source: Path) -> None:
        target = self._path(key, make_parents=True)
        staged: Path | None = None
        try:
            if source.is_symlink() or not source.is_file():
                raise StorageError("storage_unavailable", retryable=False)
            # Copy first so subsequent changes to the caller's staging file do
            # not alter the original. Linking the completed private copy is
            # atomic and refuses any overwrite, including concurrent writers.
            staged = self.temporary_path()
            with source.open("rb") as incoming, staged.open("wb") as outgoing:
                shutil.copyfileobj(incoming, outgoing, length=1024 * 1024)
                outgoing.flush()
                os.fsync(outgoing.fileno())
            os.link(staged, target, follow_symlinks=False)
        except FileExistsError:
            raise StorageError("storage_conflict", retryable=False) from None
        except OSError:
            raise StorageError() from None
        finally:
            if staged is not None:
                try:
                    staged.unlink(missing_ok=True)
                except OSError:
                    pass

    @contextmanager
    def local_copy(self, key: str) -> Iterator[Path]:
        target = self._path(key)
        if not target.is_file():
            raise StorageError("storage_unavailable", retryable=False)
        yield target

    def delete(self, key: str) -> None:
        target = self._path(key)
        try:
            target.unlink(missing_ok=True)
        except OSError:
            raise StorageError() from None

    def iter_keys(self, prefix: str) -> Iterator[str]:
        parts = _validate_prefix(prefix)
        current = self.root
        try:
            if _is_link(self.root):
                raise StorageError()
            for part in parts:
                current /= part
                if _is_link(current):
                    raise StorageError()
            if not current.resolve().is_relative_to(self.root):
                raise StorageError()
            if not current.exists():
                return
            if current.is_file():
                key = current.relative_to(self.root).as_posix()
                validate_object_key(key)
                yield key
                return

            def fail_walk(_error):
                raise StorageError()

            for folder, directories, filenames in os.walk(
                current, topdown=True, onerror=fail_walk, followlinks=False
            ):
                parent = Path(folder)
                if _is_link(parent) or not parent.resolve().is_relative_to(self.root):
                    raise StorageError()
                for name in [*directories, *filenames]:
                    if _is_link(parent / name):
                        raise StorageError()
                for name in filenames:
                    key = (parent / name).relative_to(self.root).as_posix()
                    validate_object_key(key)
                    yield key
        except OSError:
            raise StorageError() from None

    def object_modified_at(self, key: str) -> datetime:
        try:
            return datetime.fromtimestamp(self._path(key).stat().st_mtime, tz=UTC)
        except OSError:
            raise StorageError() from None

    def remove_stale_temporary(self, older_than: datetime) -> int:
        if older_than.tzinfo is None or older_than.utcoffset() is None:
            raise StorageError("storage_unavailable", retryable=False)
        if older_than > datetime.now(UTC):
            raise StorageError("storage_unavailable", retryable=False)
        removed = 0
        try:
            if _is_link(self.staging) or not self.staging.resolve().is_relative_to(self.root):
                raise StorageError()
            for path in self.staging.iterdir():
                if _is_link(path):
                    raise StorageError()
                if not path.exists():
                    continue
                if re.fullmatch(r"work-[a-z0-9_]{8}", path.name) and path.is_dir():
                    if datetime.fromtimestamp(path.stat().st_mtime, tz=UTC) >= older_than:
                        continue
                    with self._work_lock(self.staging / f"{path.name}.lock") as locked:
                        if locked and self._remove_work_directory(path, older_than=older_than):
                            removed += 1
                    continue
                if (
                    re.fullmatch(r"work-[a-z0-9_]{8}\.lock", path.name)
                    and not path.with_suffix("").exists()
                    and datetime.fromtimestamp(path.stat().st_mtime, tz=UTC) < older_than
                ):
                    with self._work_lock(path):
                        pass
                    continue
                if (
                    re.fullmatch(r"evidence-[a-z0-9_]{8}\.part", path.name)
                    and path.is_file()
                    and datetime.fromtimestamp(path.stat().st_mtime, tz=UTC) < older_than
                ):
                    path.unlink(missing_ok=True)
                    removed += 1
        except OSError:
            raise StorageError() from None
        return removed


def get_evidence_storage() -> EvidenceStorage:
    provider = os.environ.get("EVIDENCE_STORAGE_PROVIDER", "filesystem")
    if provider != "filesystem" or os.environ.get("APP_ENV") not in {"development", "test"}:
        raise StorageError("storage_unavailable", retryable=False)
    configured = os.environ.get("EVIDENCE_STORAGE_PATH")
    root = Path(configured) if configured else _ROOT / ".local/evidence"
    if not root.is_absolute():
        root = _ROOT / root
    return FileEvidenceStorage(root)


def _is_link(path: Path) -> bool:
    return path.is_symlink() or path.is_junction()
