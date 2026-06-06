#!/usr/bin/env python3
"""Build DB-oriented high-school CSV files from MEXT school-code CSV files."""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, OrderedDict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

# scripts/ ディレクトリ内の兄弟モジュール (実行時 sys.path[0] = scripts/)。
# dataclass / public_id / normalize_text は大学系と共有し CSV ヘッダの整合を保証する。
# build_vocational_school_db_csv.py はこれらを本モジュール経由で再利用する。
from academic_field import classify_field
from mext_common import (  # noqa: F401  (PREFECTURE_CODES と並ぶ再エクスポート元)
    DISPLAY_LANGUAGE,
    REGION_CODE,
    DepartmentRow,
    FacultyRow,
    InstitutionRow,
    normalize_text,
    public_id,
)


DEFAULT_INPUT_DIR = Path("data/raw/mext_school_codes")
DEFAULT_OUTPUT_DIR = Path("data/processed/mext_school_code_db_csv")

PREFECTURE_CODES = {
    "01": "JP-01",
    "02": "JP-02",
    "03": "JP-03",
    "04": "JP-04",
    "05": "JP-05",
    "06": "JP-06",
    "07": "JP-07",
    "08": "JP-08",
    "09": "JP-09",
    "10": "JP-10",
    "11": "JP-11",
    "12": "JP-12",
    "13": "JP-13",
    "14": "JP-14",
    "15": "JP-15",
    "16": "JP-16",
    "17": "JP-17",
    "18": "JP-18",
    "19": "JP-19",
    "20": "JP-20",
    "21": "JP-21",
    "22": "JP-22",
    "23": "JP-23",
    "24": "JP-24",
    "25": "JP-25",
    "26": "JP-26",
    "27": "JP-27",
    "28": "JP-28",
    "29": "JP-29",
    "30": "JP-30",
    "31": "JP-31",
    "32": "JP-32",
    "33": "JP-33",
    "34": "JP-34",
    "35": "JP-35",
    "36": "JP-36",
    "37": "JP-37",
    "38": "JP-38",
    "39": "JP-39",
    "40": "JP-40",
    "41": "JP-41",
    "42": "JP-42",
    "43": "JP-43",
    "44": "JP-44",
    "45": "JP-45",
    "46": "JP-46",
    "47": "JP-47",
}

HIGH_SCHOOL_FACULTY_CATALOG = [
    ("110", "普通科", "ordinary_course"),
    ("120", "学際領域学科", "ordinary_interdisciplinary"),
    ("130", "地域社会学科", "ordinary_regional_society"),
    ("140", "その他普通科", "ordinary_other"),
    ("200", "農業に関する学科", "agriculture"),
    ("300", "工業に関する学科", "industry"),
    ("400", "商業に関する学科", "commerce"),
    ("500", "水産に関する学科", "fisheries"),
    ("600", "家庭に関する学科", "home_economics"),
    ("700", "看護に関する学科", "nursing"),
    ("720", "情報に関する学科", "information"),
    ("750", "福祉に関する学科", "welfare"),
    ("800", "その他の専門教育を施す学科", "specialized_other"),
    ("801", "理数関係", "science_mathematics"),
    ("802", "外国語関係", "foreign_language"),
    ("803", "音楽・美術関係", "music_fine_arts"),
    ("804", "体育関係", "physical_education"),
    ("900", "総合学科", "integrated_course"),
]

INFERENCE_RULES = [
    (("総合",), ("900", "総合学科", "inferred_from_school_name")),
    (("農業", "農林", "園芸"), ("200", "農業に関する学科", "inferred_from_school_name")),
    (("工業", "工科", "工芸", "機械", "電気", "科学技術"), ("300", "工業に関する学科", "inferred_from_school_name")),
    (("商業", "ビジネス"), ("400", "商業に関する学科", "inferred_from_school_name")),
    (("水産", "海洋"), ("500", "水産に関する学科", "inferred_from_school_name")),
    (("家庭", "家政", "生活"), ("600", "家庭に関する学科", "inferred_from_school_name")),
    (("看護",), ("700", "看護に関する学科", "inferred_from_school_name")),
    (("情報",), ("720", "情報に関する学科", "inferred_from_school_name")),
    (("福祉",), ("750", "福祉に関する学科", "inferred_from_school_name")),
    (("理数",), ("801", "理数関係", "inferred_from_school_name")),
    (("国際", "外国語"), ("802", "外国語関係", "inferred_from_school_name")),
    (("音楽", "美術", "芸術"), ("803", "音楽・美術関係", "inferred_from_school_name")),
    (("体育", "スポーツ"), ("804", "体育関係", "inferred_from_school_name")),
]


@dataclass
class FacultyCatalogRow:
    code: str
    display_name: str
    slug: str
    source: str


def leading_code(value: str) -> str:
    match = re.match(r"(\d+)", value)
    return match.group(1) if match else ""


def choose_faculty(name: str, mode: str) -> tuple[str, str, str]:
    if mode == "default":
        return "110", "普通科", "default_general_course"
    for needles, result in INFERENCE_RULES:
        if any(needle in name for needle in needles):
            return result
    return "110", "普通科", "default_general_course"


def load_school_code_rows(input_dir: Path) -> list[tuple[Path, dict[str, str]]]:
    rows: list[tuple[Path, dict[str, str]]] = []
    for path in sorted(input_dir.glob("*.csv")):
        if path.name == "manifest.csv":
            continue
        with path.open(encoding="cp932", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                rows.append((path, row))
    return rows


def build_rows(input_dir: Path, include_branches: bool, faculty_mode: str) -> tuple[list[InstitutionRow], list[FacultyRow], list[DepartmentRow], Counter[str]]:
    institutions: OrderedDict[str, InstitutionRow] = OrderedDict()
    faculties: OrderedDict[str, FacultyRow] = OrderedDict()
    departments: list[DepartmentRow] = []
    faculty_counts: Counter[str] = Counter()

    for source_path, row in load_school_code_rows(input_dir):
        if not row["学校種"].startswith("D1"):
            continue
        if row["属性情報廃止年月日"]:
            continue
        if not include_branches and not row["本分校"].startswith("1"):
            continue

        school_code = row["学校コード"]
        display_name = normalize_text(row["学校名"])
        prefecture_number = leading_code(row["都道府県番号"])
        institution_public_id = public_id("high_school_institution", school_code)
        institution = InstitutionRow(
            public_id=institution_public_id,
            name=display_name,
            display_name=display_name,
            display_language=DISPLAY_LANGUAGE,
            region_code=REGION_CODE,
            institution_type="high_school",
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
        institutions[institution_public_id] = institution

        faculty_code, faculty_display, faculty_source = choose_faculty(display_name, faculty_mode)
        faculty_public_id = public_id("high_school_faculty", f"{school_code}|{faculty_code}|{faculty_display}")
        faculty_counts[faculty_display] += 1
        faculties[faculty_public_id] = FacultyRow(
            public_id=faculty_public_id,
            institution_public_id=institution_public_id,
            name=faculty_display,
            display_name=faculty_display,
            display_language=DISPLAY_LANGUAGE,
            region_code=REGION_CODE,
            academic_field=classify_field(faculty_display),
            deleted_at="",
            source_section=f"high_school_department_code:{faculty_code}",
            source_row=0,
            source_fiscal_year_label="令和7年度",
            source_category="school_code_with_department_code_catalog",
            source_file_label="学校コード一覧 + 高等学校学科コード表",
            source_workbook_path=str(source_path),
            source_sheet_name="",
            name_source=faculty_source,
        )

    return list(institutions.values()), list(faculties.values()), departments, faculty_counts


def write_rows(path: Path, rows: list[Any], fields: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = fields or (list(asdict(rows[0]).keys()) if rows else [])
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--include-branches", action="store_true", help="Include branch schools as separate institutions.")
    parser.add_argument(
        "--faculty-mode",
        choices=["inferred", "default"],
        default="inferred",
        help="Use name-based faculty inference or assign 普通科 to every high school.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    institutions, faculties, departments, faculty_counts = build_rows(
        args.input_dir,
        include_branches=args.include_branches,
        faculty_mode=args.faculty_mode,
    )

    write_rows(args.output_dir / "institutions.csv", institutions)
    write_rows(args.output_dir / "faculties.csv", faculties)
    write_rows(
        args.output_dir / "departments.csv",
        departments,
        fields=list(DepartmentRow.__dataclass_fields__.keys()),
    )
    write_rows(
        args.output_dir / "high_school_faculty_catalog.csv",
        [
            FacultyCatalogRow(code=code, display_name=display, slug=slug, source="MEXT high-school department code table")
            for code, display, slug in HIGH_SCHOOL_FACULTY_CATALOG
        ],
    )

    summary = {
        "source": "MEXT school-code CSV + MEXT high-school department-code table",
        "faculty_mode": args.faculty_mode,
        "include_branches": args.include_branches,
        "institutions": len(institutions),
        "faculties": len(faculties),
        "departments": len(departments),
        "faculty_counts": dict(sorted(faculty_counts.items())),
        "output_dir": str(args.output_dir),
        "notes": [
            "School names and addresses come from the MEXT school-code CSV.",
            "School-specific department offerings are not present in the MEXT school-code CSV.",
            "Faculty rows are generated from the MEXT high-school department-code catalog and are defaulted or inferred from school names.",
        ],
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with (args.output_dir / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2)
        file.write("\n")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

