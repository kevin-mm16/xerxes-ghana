"""Actual private object writes, immutability and path boundaries."""

import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from xerxes_api.evidence_storage import (
    FileEvidenceStorage,
    StorageError,
    get_evidence_storage,
)


def directory_link(link, target):
    try:
        link.symlink_to(target, target_is_directory=True)
        return
    except OSError:
        if os.name != "nt":
            pytest.skip("Directory link creation is unavailable")
    # NTFS junctions need no symlink privilege. Exercise the actual Windows
    # reparse-point guard using only pytest-owned temporary directories.
    result = subprocess.run(
        ["cmd.exe", "/d", "/c", "mklink", "/J", str(link), str(target)],
        capture_output=True,
        check=False,
        timeout=5,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    if result.returncode != 0:
        pytest.skip("NTFS junction creation is unavailable")
    assert link.is_junction()


def test_immutable_private_copy_and_idempotent_delete(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    original = storage.temporary_path()
    original.write_bytes(b"original evidence bytes")
    key = "quarantine/7e55dd2d-4a85-4a37-bb20-2f3c293dbac2/original"
    storage.put_file(key, original)
    original.write_bytes(b"attempted later mutation")
    with storage.local_copy(key) as stored:
        assert stored.read_bytes() == b"original evidence bytes"
    with pytest.raises(StorageError, match="storage_conflict"):
        storage.put_file(key, original)
    storage.delete(key)
    storage.delete(key)
    with pytest.raises(StorageError, match="storage_unavailable"), storage.local_copy(key):
        pytest.fail("Deleted evidence must not be readable")


@pytest.mark.parametrize(
    "key",
    [
        "../outside",
        "/quarantine/original",
        "quarantine/../original",
        "quarantine//original",
        "quarantine\\original",
        "quarantine/file:stream",
        "public/anything",
        "review/.hidden",
    ],
)
def test_object_keys_cannot_escape_private_namespaces(tmp_path, key):
    storage = FileEvidenceStorage(tmp_path / "private")
    source = tmp_path / "input"
    source.write_bytes(b"evidence")
    with pytest.raises(StorageError):
        storage.put_file(key, source)
    assert sorted(path.name for path in storage.root.iterdir()) == [".staging"]


def test_concurrent_writers_cannot_replace_the_first_object(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    sources = [tmp_path / "one", tmp_path / "two"]
    for number, path in enumerate(sources):
        path.write_bytes(str(number).encode())

    def write(path):
        try:
            storage.put_file("quarantine/unique/original", path)
            return "stored"
        except StorageError as error:
            return error.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(write, sources))
    assert sorted(results) == ["storage_conflict", "stored"]
    assert list(storage.staging.iterdir()) == []


def test_symlink_directory_does_not_escape_storage(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    directory_link(storage.root / "quarantine", elsewhere)
    with pytest.raises(StorageError):
        storage.delete("quarantine/do-not-touch")
    assert list(elsewhere.iterdir()) == []


def test_native_provider_fails_closed_in_production(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("EVIDENCE_STORAGE_PROVIDER", "filesystem")
    monkeypatch.setenv("EVIDENCE_STORAGE_PATH", str(tmp_path / "private"))
    with pytest.raises(StorageError):
        get_evidence_storage()
    assert not (tmp_path / "private").exists()


def test_web_directory_cannot_become_private_storage():
    web_public = Path(__file__).resolve().parents[3] / "apps/web/public/evidence"
    with pytest.raises(StorageError):
        FileEvidenceStorage(web_public)


def test_listing_and_temporary_cleanup_are_namespace_and_age_scoped(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    source = storage.temporary_path()
    source.write_bytes(b"synthetic private bytes")
    key = "review/owner/attempt/asset.jpg"
    storage.put_file(key, source)
    assert list(storage.iter_keys("review/owner/")) == [key]
    assert list(storage.iter_keys("quarantine")) == []
    assert storage.object_modified_at(key).tzinfo is not None
    old = storage.temporary_path()
    recent = storage.temporary_path()
    unrelated = storage.staging / "unrelated.txt"
    unrelated.write_bytes(b"not an application temporary")
    timestamp = (datetime.now(UTC) - timedelta(hours=2)).timestamp()
    os.utime(old, (timestamp, timestamp))
    os.utime(unrelated, (timestamp, timestamp))
    assert storage.remove_stale_temporary(datetime.now(UTC) - timedelta(hours=1)) == 1
    assert not old.exists() and recent.exists() and unrelated.exists()
    assert list(storage.iter_keys("review")) == [key]
    with pytest.raises(StorageError):
        list(storage.iter_keys("../review"))
    with pytest.raises(StorageError):
        storage.remove_stale_temporary(datetime.now())


def test_listing_never_follows_a_linked_subtree(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / "private.txt").write_bytes(b"must remain outside")
    (storage.root / "review").mkdir()
    directory_link(storage.root / "review/linked", elsewhere)
    with pytest.raises(StorageError):
        list(storage.iter_keys("review"))
    assert (elsewhere / "private.txt").read_bytes() == b"must remain outside"


def old_entry(path):
    timestamp = (datetime.now(UTC) - timedelta(hours=2)).timestamp()
    os.utime(path, (timestamp, timestamp))


def test_processing_workspace_is_private_flat_and_removed_on_exit(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    with storage.work_directory() as work:
        assert work.parent == storage.staging
        assert list(work.iterdir()) == []
        review = work / "review.jpg"
        review.write_bytes(b"synthetic review")
        storage.put_file("review/owner/attempt/asset.jpg", review)
    assert not work.exists()
    assert list(storage.staging.iterdir()) == []
    with storage.local_copy("review/owner/attempt/asset.jpg") as stored:
        assert stored.read_bytes() == b"synthetic review"


def test_processing_exception_cleans_only_its_owned_workspace(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    outside = tmp_path / "preserved.txt"
    outside.write_bytes(b"preserve")
    with pytest.raises(RuntimeError, match="synthetic failure"), storage.work_directory() as work:
        (work / "review.mp4").write_bytes(b"incomplete private review")
        raise RuntimeError("synthetic failure")
    assert not work.exists()
    assert outside.read_bytes() == b"preserve"


def test_dead_processing_workspace_is_reclaimed_but_recent_output_is_retained(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    abandoned = storage.staging / "work-abcdefgh"
    abandoned.mkdir()
    output = abandoned / "review.mp4"
    output.write_bytes(b"abandoned private output")
    marker = storage.staging / "work-abcdefgh.lock"
    marker.write_bytes(b"0")
    for path in (output, marker, abandoned):
        old_entry(path)
    recent = storage.staging / "work-ijklmnop"
    recent.mkdir()
    (recent / "review.mp4").write_bytes(b"recent output must remain")
    old_entry(recent)
    assert storage.remove_stale_temporary(datetime.now(UTC) - timedelta(hours=1)) == 1
    assert not abandoned.exists() and not marker.exists()
    assert (recent / "review.mp4").read_bytes() == b"recent output must remain"


def test_active_processing_workspace_is_protected_even_with_old_timestamps(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    with storage.work_directory() as work:
        review = work / "review.mp4"
        review.write_bytes(b"active private output")
        old_entry(review)
        old_entry(work)
        assert storage.remove_stale_temporary(datetime.now(UTC) - timedelta(hours=1)) == 0
        assert review.read_bytes() == b"active private output"
    assert not work.exists()


def test_workspace_cleanup_refuses_links_and_nested_directories(tmp_path):
    storage = FileEvidenceStorage(tmp_path / "private")
    work = storage.staging / "work-abcdefgh"
    work.mkdir()
    protected = work / "review.jpg"
    protected.write_bytes(b"must not partially delete")
    (work / "unexpected-nested").mkdir()
    old_entry(protected)
    old_entry(work)
    with pytest.raises(StorageError):
        storage.remove_stale_temporary(datetime.now(UTC) - timedelta(hours=1))
    assert protected.read_bytes() == b"must not partially delete"
    (work / "unexpected-nested").rmdir()
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    outside = elsewhere / "preserved.jpg"
    outside.write_bytes(b"outside private workspace")
    directory_link(work / "linked", elsewhere)
    old_entry(work)
    with pytest.raises(StorageError):
        storage.remove_stale_temporary(datetime.now(UTC) - timedelta(hours=1))
    assert outside.read_bytes() == b"outside private workspace"
