#!/usr/bin/env python3
"""Build DB-oriented vocational-school CSV files from MEXT school-code CSV files.

専修学校 (学校種 H1) を institution_type=`vocational_school` として生成する。

学校コード一覧には専門課程の学科 (分野) 情報が含まれないため、`faculties` /
`departments` は生成しない (ヘッダのみの空CSVを出力し、merge と import に支障が
出ないようにする)。高校が学科を持てるのは MEXT 高等学校学科コード表という公式
カタログがあるためで、専修学校には対応する公式カタログが無い。

注意: 学校コード一覧の H1(専修) には専門課程以外 (高等課程の高等専修学校、農業
大学校、各種の養成施設など) も含まれる。MEXT の公式区分をそのまま採用し、
すべて vocational_school として扱う。
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, OrderedDict
from dataclasses import asdict
from pathlib import Path

# scripts/ ディレクトリ内の兄弟モジュール (実行時 sys.path[0] = scripts/)。
# 高校スクリプトの dataclass と補助関数を再利用し、CSV ヘッダの整合を保証する。
from build_high_school_db_csv import (
    DISPLAY_LANGUAGE,
    PREFECTURE_CODES,
    REGION_CODE,
    DepartmentRow,
    FacultyRow,
    InstitutionRow,
    leading_code,
    load_school_code_rows,
    normalize_text,
    public_id,
)

DEFAULT_INPUT_DIR = Path("data/raw/mext_school_codes")
DEFAULT_OUTPUT_DIR = Path("data/processed/mext_vocational_school_db_csv")
SCHOOL_KIND_PREFIX = "H1"  # H1(専修) = 専修学校


def build_institutions(input_dir: Path, include_branches: bool) -> tuple[list[InstitutionRow], Counter[str]]:
    institutions: OrderedDict[str, InstitutionRow] = OrderedDict()
    setup_counts: Counter[str] = Counter()

    for source_path, row in load_school_code_rows(input_dir):
        if not row["学校種"].startswith(SCHOOL_KIND_PREFIX):
            continue
        if row["属性情報廃止年月日"]:
            continue
        if not include_branches and not row["本分校"].startswith("1"):
            continue

        school_code = row["学校コード"]
        display_name = normalize_text(row["学校名"])
        prefecture_number = leading_code(row["都道府県番号"])
        institution_public_id = public_id("vocational_school_institution", school_code)
        setup_counts[normalize_text(row["設置区分"])[:1] or "?"] += 1
        institutions[institution_public_id] = InstitutionRow(
            public_id=institution_public_id,
            name=display_name,
            display_name=display_name,
            display_language=DISPLAY_LANGUAGE,
            region_code=REGION_CODE,
            institution_type="vocational_school",
            prefecture_code=PREFECTURE_CODES.get(prefecture_number, ""),
            address=normalize_text(row["学校所在地"]),
            website_url="",
            deleted_at="",
            source_fiscal_year_label="令和7年度",
            source_fiscal_year_ad="2025",
            source_category="school_code",
            source_file_label="令和7年5月1日時点 学校コード一覧",
            source_workbook_path=str(source_path),
            source_sheet_name="",
            source_title=f"{row['学校種']} {display_name}",
            source_name_prefix="",
            source_name_english="",
            name_source="fallback_display_name",
        )

    return list(institutions.values()), setup_counts


def fieldnames(dataclass_type: type) -> list[str]:
    return list(dataclass_type.__dataclass_fields__.keys())


def write_csv(path: Path, fields: list[str], rows: list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow(row if isinstance(row, dict) else asdict(row))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--include-branches",
        action="store_true",
        help="分校も含める (既定は本校のみ)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    institutions, setup_counts = build_institutions(args.input_dir, args.include_branches)

    write_csv(args.output_dir / "institutions.csv", fieldnames(InstitutionRow), institutions)
    # 学科情報が無いため faculties / departments はヘッダのみ (merge/import 互換のため)
    write_csv(args.output_dir / "faculties.csv", fieldnames(FacultyRow), [])
    write_csv(args.output_dir / "departments.csv", fieldnames(DepartmentRow), [])

    summary = {
        "output_dir": str(args.output_dir),
        "institution_type": "vocational_school",
        "institutions": len(institutions),
        "faculties": 0,
        "departments": 0,
        "setup_category_counts": dict(setup_counts),
        "notes": [
            "専修学校 (学校種 H1) を vocational_school として生成。",
            "学校コード一覧に専門課程の学科情報が無いため faculties / departments は生成しない。",
            "H1(専修) には高等専修学校・農業大学校・各種養成施設なども含まれる (MEXT 区分準拠)。",
        ],
    }
    with (args.output_dir / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
