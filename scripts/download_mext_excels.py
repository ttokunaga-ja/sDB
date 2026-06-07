#!/usr/bin/env python3
"""Download MEXT university-related Excel lists and write manifests.

The source page links to yearly detail pages. Each detail page then links to
Excel files for universities, junior colleges, colleges of technology, or
school corporations. This script discovers those links, stores downloaded
files under data/raw/mext_excels/files, and writes CSV/JSON manifests.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlparse
from urllib.request import Request, urlopen


START_URL = "https://www.mext.go.jp/a_menu/koutou/ichiran/mext_01853.html"
DEFAULT_OUTPUT_DIR = Path("data/raw/mext_excels")
USER_AGENT = "sDB-mext-downloader/1.0"
REQUEST_TIMEOUT_SECONDS = 60
RETRY_COUNT = 3
RETRY_SLEEP_SECONDS = 2


@dataclass(frozen=True)
class Link:
    text: str
    href: str


@dataclass
class ExcelRecord:
    index: int
    category: str
    category_label: str
    fiscal_year_label: str
    fiscal_year_reiwa: int | None
    fiscal_year_ad: int | None
    source_page_title: str
    source_page_url: str
    file_label: str
    file_sequence: str
    url: str
    output_path: str
    status: str
    http_status: int | None
    content_type: str | None
    content_length: int | None
    last_modified: str | None
    bytes_written: int | None
    downloaded_at: str | None
    error: str | None


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[Link] = []
        self._href: str | None = None
        self._text_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        self._href = dict(attrs).get("href")
        self._text_parts = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or self._href is None:
            return
        text = normalize_text("".join(self._text_parts))
        if self._href:
            self.links.append(Link(text=text, href=self._href))
        self._href = None
        self._text_parts = []


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def request_url(url: str, method: str = "GET") -> Request:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Only https URLs are supported: {url}")
    return Request(url, headers={"User-Agent": USER_AGENT}, method=method)


def fetch_bytes(url: str) -> tuple[bytes, dict[str, str], int]:
    last_error: Exception | None = None
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            with urlopen(request_url(url), timeout=REQUEST_TIMEOUT_SECONDS) as response:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
                headers = {key.lower(): value for key, value in response.headers.items()}
                return response.read(), headers, response.status
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_SLEEP_SECONDS * attempt)
    assert last_error is not None
    raise last_error


def fetch_text(url: str) -> str:
    data, headers, _status = fetch_bytes(url)
    content_type = headers.get("content-type", "")
    match = re.search(r"charset=([^;]+)", content_type, re.IGNORECASE)
    encodings = [match.group(1)] if match else []
    encodings.extend(["utf-8", "cp932"])
    for encoding in encodings:
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def head_metadata(url: str) -> tuple[int | None, dict[str, str]]:
    last_error: Exception | None = None
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            with urlopen(request_url(url, method="HEAD"), timeout=REQUEST_TIMEOUT_SECONDS) as response:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
                return response.status, {key.lower(): value for key, value in response.headers.items()}
        except (HTTPError, URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_SLEEP_SECONDS * attempt)
    raise RuntimeError(str(last_error))


def parse_links(url: str) -> list[Link]:
    parser = LinkParser()
    parser.feed(fetch_text(url))
    return parser.links


def discover_detail_pages(start_url: str) -> list[Link]:
    links = parse_links(start_url)
    detail_pages: list[Link] = []
    seen: set[str] = set()
    for link in links:
        absolute_url = urljoin(start_url, link.href)
        if not absolute_url.startswith("https://www.mext.go.jp/a_menu/koutou/ichiran/"):
            continue
        if not absolute_url.endswith(".html"):
            continue
        if "年度" not in link.text:
            continue
        if absolute_url in seen:
            continue
        seen.add(absolute_url)
        detail_pages.append(Link(text=link.text, href=absolute_url))
    return detail_pages


def classify_page(title: str) -> tuple[str, str]:
    if "短期大学" in title:
        return "junior_college", "短期大学"
    if "高等専門学校" in title:
        return "kosen", "高等専門学校"
    if "学校法人" in title:
        return "corporation", "文部科学大臣所轄学校法人"
    if "大学" in title:
        return "university", "大学"
    return "unknown", "不明"


def fiscal_year(title: str) -> tuple[str, int | None, int | None, str]:
    match = re.search(r"令和(\d+)年度", title)
    if not match:
        return "unknown", None, None, "unknown"
    reiwa = int(match.group(1))
    ad = 2018 + reiwa
    return f"令和{reiwa}年度", reiwa, ad, f"r{reiwa:02d}"


def file_sequence(label: str, url: str) -> str:
    match = re.match(r"([0-9]+(?:-[0-9]+)?)", label)
    if match:
        return match.group(1)
    stem = Path(unquote(urlparse(url).path)).stem
    match = re.search(r"_([0-9]+(?:-[0-9]+)?)$", stem)
    if match:
        return match.group(1)
    return "unknown"


def clean_label(label: str) -> str:
    return normalize_text(re.sub(r"\s*\(Excel:[^)]+\)\s*$", "", label))


def output_filename(index: int, label: str, url: str) -> str:
    sequence = file_sequence(label, url).replace("-", "_")
    remote_name = Path(unquote(urlparse(url).path)).name
    extension = Path(remote_name).suffix.lower() or ".xlsx"
    return f"{index:03d}_{sequence}_{Path(remote_name).stem}{extension}"


def content_length(headers: dict[str, str]) -> int | None:
    value = headers.get("content-length")
    return int(value) if value and value.isdigit() else None


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def discover_excels(start_url: str, output_dir: Path) -> list[ExcelRecord]:
    records: list[ExcelRecord] = []
    detail_pages = discover_detail_pages(start_url)

    for page in detail_pages:
        category, category_label = classify_page(page.text)
        year_label, reiwa, ad, year_slug = fiscal_year(page.text)
        excel_links = [
            link
            for link in parse_links(page.href)
            if re.search(r"\.xls[xm]?(?:$|[?#])", link.href, re.IGNORECASE)
        ]

        for link in excel_links:
            index = len(records) + 1
            absolute_url = urljoin(page.href, link.href)
            label = clean_label(link.text)
            relative_path = Path("files") / category / year_slug / output_filename(index, label, absolute_url)
            records.append(
                ExcelRecord(
                    index=index,
                    category=category,
                    category_label=category_label,
                    fiscal_year_label=year_label,
                    fiscal_year_reiwa=reiwa,
                    fiscal_year_ad=ad,
                    source_page_title=page.text,
                    source_page_url=page.href,
                    file_label=label,
                    file_sequence=file_sequence(label, absolute_url),
                    url=absolute_url,
                    output_path=str(output_dir / relative_path),
                    status="discovered",
                    http_status=None,
                    content_type=None,
                    content_length=None,
                    last_modified=None,
                    bytes_written=None,
                    downloaded_at=None,
                    error=None,
                )
            )
    return records


def enrich_with_head(records: Iterable[ExcelRecord]) -> None:
    for record in records:
        try:
            status, headers = head_metadata(record.url)
            record.http_status = status
            record.content_type = headers.get("content-type")
            record.content_length = content_length(headers)
            record.last_modified = headers.get("last-modified")
        except Exception as exc:  # noqa: BLE001
            record.status = "head_failed"
            record.error = str(exc)


def should_skip(record: ExcelRecord, force: bool) -> bool:
    path = Path(record.output_path)
    if force or not path.exists():
        return False
    if record.content_length is None:
        return True
    return path.stat().st_size == record.content_length


def download_record(record: ExcelRecord, force: bool) -> None:
    output_path = Path(record.output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if should_skip(record, force):
        record.status = "skipped_existing"
        record.bytes_written = output_path.stat().st_size
        return

    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    try:
        if temp_path.exists():
            temp_path.unlink()
        data, headers, status = fetch_bytes(record.url)
        temp_path.write_bytes(data)
        bytes_written = temp_path.stat().st_size
        if record.content_length is not None and bytes_written != record.content_length:
            raise RuntimeError(
                f"size mismatch: expected {record.content_length}, got {bytes_written}"
            )
        temp_path.replace(output_path)
        record.http_status = status
        record.content_type = headers.get("content-type", record.content_type)
        record.content_length = content_length(headers) or record.content_length
        record.last_modified = headers.get("last-modified", record.last_modified)
        record.bytes_written = bytes_written
        record.downloaded_at = now_utc()
        record.status = "downloaded"
        record.error = None
    except Exception as exc:  # noqa: BLE001
        if temp_path.exists():
            temp_path.unlink()
        record.status = "download_failed"
        record.error = str(exc)


def write_manifests(records: list[ExcelRecord], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "manifest.csv"
    json_path = output_dir / "manifest.json"
    fields = list(asdict(records[0]).keys()) if records else [field.name for field in ExcelRecord.__dataclass_fields__.values()]

    with csv_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow(asdict(record))

    with json_path.open("w", encoding="utf-8") as file:
        json.dump([asdict(record) for record in records], file, ensure_ascii=False, indent=2)
        file.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-url", default=START_URL)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--dry-run", action="store_true", help="Discover links and write manifests without downloading files.")
    parser.add_argument("--force", action="store_true", help="Download files even when an existing file has the expected size.")
    parser.add_argument("--latest-only", action="store_true", help="Only process the latest fiscal year discovered from the source page.")
    parser.add_argument(
        "--fiscal-year",
        type=int,
        default=None,
        help="Only process one fiscal year. Accepts Reiwa year, e.g. 6, or western year, e.g. 2024.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of Excel records processed.")
    parser.add_argument("--workers", type=int, default=4, help="Number of parallel download workers.")
    parser.add_argument("--head", action="store_true", help="Run HEAD checks before downloading. Dry-run uses HEAD unless --skip-head is set.")
    parser.add_argument("--skip-head", action="store_true", help="Skip HEAD checks.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    records = discover_excels(args.start_url, args.output_dir)
    if args.latest_only and records:
        latest_ad = max(record.fiscal_year_ad or 0 for record in records)
        records = [record for record in records if record.fiscal_year_ad == latest_ad]
    if args.fiscal_year is not None:
        if args.fiscal_year >= 1900:
            records = [record for record in records if record.fiscal_year_ad == args.fiscal_year]
        else:
            records = [record for record in records if record.fiscal_year_reiwa == args.fiscal_year]
    if args.limit is not None:
        records = records[: args.limit]

    if not records:
        print("No Excel links discovered.", file=sys.stderr)
        return 1

    if not args.skip_head and (args.dry_run or args.head):
        enrich_with_head(records)

    if not args.dry_run:
        worker_count = max(1, args.workers)
        if worker_count == 1:
            for number, record in enumerate(records, start=1):
                print(
                    f"[{number}/{len(records)}] start {record.category}/{record.fiscal_year_label}: {record.file_label}",
                    flush=True,
                )
                download_record(record, force=args.force)
                print(
                    f"[{number}/{len(records)}] {record.status} {record.category}/{record.fiscal_year_label}: {record.file_label}",
                    flush=True,
                )
                if record.status == "download_failed":
                    print(f"  ERROR: {record.error}", file=sys.stderr)
        else:
            print(f"Downloading {len(records)} files with {worker_count} workers.", flush=True)
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = {executor.submit(download_record, record, args.force): record for record in records}
                for number, future in enumerate(as_completed(futures), start=1):
                    record = futures[future]
                    future.result()
                    print(
                        f"[{number}/{len(records)}] {record.status} {record.category}/{record.fiscal_year_label}: {record.file_label}",
                        flush=True,
                    )
                    if record.status == "download_failed":
                        print(f"  ERROR: {record.error}", file=sys.stderr)

    write_manifests(records, args.output_dir)

    failures = [record for record in records if record.status.endswith("_failed")]
    total_bytes = sum(record.bytes_written or 0 for record in records)
    print(
        json.dumps(
            {
                "records": len(records),
                "downloaded_or_existing_bytes": total_bytes,
                "failures": len(failures),
                "manifest_csv": str(args.output_dir / "manifest.csv"),
                "manifest_json": str(args.output_dir / "manifest.json"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
