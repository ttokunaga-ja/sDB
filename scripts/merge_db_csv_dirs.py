#!/usr/bin/env python3
"""Merge multiple DB-oriented CSV directories into one read/import set."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


TABLES = ["institutions", "faculties", "departments"]


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("data/processed/combined_db_csv"))
    parser.add_argument("input_dirs", nargs="+", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    summary: dict[str, int | str | list[str]] = {"output_dir": str(args.output_dir), "input_dirs": [str(path) for path in args.input_dirs]}

    for table in TABLES:
        merged_fields: list[str] | None = None
        merged_rows: list[dict[str, str]] = []
        seen_public_ids: set[str] = set()
        for input_dir in args.input_dirs:
            fields, rows = read_csv(input_dir / f"{table}.csv")
            if merged_fields is None:
                merged_fields = fields
            elif fields != merged_fields:
                raise RuntimeError(f"header mismatch for {table}: {input_dir}")
            for row in rows:
                public_id = row.get("public_id", "")
                if public_id and public_id in seen_public_ids:
                    raise RuntimeError(f"duplicate public_id in {table}: {public_id}")
                if public_id:
                    seen_public_ids.add(public_id)
                merged_rows.append(row)
        assert merged_fields is not None
        write_csv(args.output_dir / f"{table}.csv", merged_fields, merged_rows)
        summary[table] = len(merged_rows)

    with (args.output_dir / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

