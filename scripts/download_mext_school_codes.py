#!/usr/bin/env python3
"""Download MEXT school-code CSV files for elementary/secondary schools."""

from __future__ import annotations

import argparse
import csv
import json
import re
import shutil
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


START_URL = "https://www.mext.go.jp/b_menu/toukei/mext_01087.html"
DEFAULT_OUTPUT_DIR = Path("data/raw/mext_school_codes")
USER_AGENT = "sDB-school-code-downloader/1.0"


@dataclass
class DownloadedFile:
    label: str
    area: str
    source_url: str
    output_path: str
    bytes_written: int
    downloaded_at: str


class LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
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
        text = re.sub(r"\s+", " ", "".join(self._text_parts)).strip()
        self.links.append((text, self._href))
        self._href = None
        self._text_parts = []


def validate_https_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Only https URLs are supported: {url}")
    return url


def fetch(url: str) -> bytes:
    url = validate_https_url(url)
    curl = shutil.which("curl")
    if curl:
        return subprocess.check_output(
            [
                curl,
                "-L",
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                "90",
                "--user-agent",
                USER_AGENT,
                url,
            ]
        )
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
        return response.read()


def latest_school_code_csv_links(start_url: str) -> list[tuple[str, str, str]]:
    html = fetch(start_url).decode("utf-8", errors="replace")
    parser = LinkParser()
    parser.feed(html)

    csv_links = [(text, urljoin(start_url, href)) for text, href in parser.links if ".csv" in href.lower()]
    if len(csv_links) < 3:
        raise RuntimeError("Could not find latest school-code CSV links on the MEXT page.")

    # In the current MEXT page, the first CSV is elementary/secondary east,
    # the second is higher-education, and the third is elementary/secondary west.
    return [
        ("east", csv_links[0][0], csv_links[0][1]),
        ("west", csv_links[2][0], csv_links[2][1]),
    ]


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-url", default=START_URL)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    records: list[DownloadedFile] = []
    for area, label, url in latest_school_code_csv_links(args.start_url):
        output_path = args.output_dir / f"latest_{area}.csv"
        data = fetch(url)
        output_path.write_bytes(data)
        record = DownloadedFile(
            label=label,
            area=area,
            source_url=url,
            output_path=str(output_path),
            bytes_written=len(data),
            downloaded_at=now_utc(),
        )
        records.append(record)
        print(f"saved {area}: {output_path} ({len(data)} bytes)", flush=True)

    with (args.output_dir / "manifest.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(asdict(records[0]).keys()))
        writer.writeheader()
        for record in records:
            writer.writerow(asdict(record))

    with (args.output_dir / "manifest.json").open("w", encoding="utf-8") as file:
        json.dump([asdict(record) for record in records], file, ensure_ascii=False, indent=2)
        file.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
