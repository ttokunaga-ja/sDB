#!/usr/bin/env python3
"""Build search-term CSV files (institution_terms / faculty_terms) from combined CSV.

検索 API 用の *_terms 設計 (term + term_type + language_code + weight、
マスターを論理参照) に合わせた検索専用レイヤを生成する。

sDB では外部API非依存で決定的に生成する (academic_field と同方針):

  - primary    : 正式名称 (display_name の漢字、英語 name は language_code='en')
  - alias       : 読み (pykakasi のひらがな / カタカナ) と ローマ字 (hepburn, language_code='ja-Latn')
  - abbreviation: 接尾辞 (大学/大学院/専門学校 等) を除いた略称

これにより検索 API は漢字・英語・ひらがな・カタカナ・ローマ字・略称のいずれでも引けるようになる。

出力 (既定で data/processed/combined_db_csv 内):
  - institution_terms.csv (institution_public_id, term, term_type, language_code, weight)
  - faculty_terms.csv       (faculty_public_id, term, term_type, language_code, weight)
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

try:
    import pykakasi
except ModuleNotFoundError as exc:  # pragma: no cover - environment guard
    raise SystemExit(
        "pykakasi is required. Install it with `python3 -m pip install -r requirements.txt`."
    ) from exc

DEFAULT_DIR = Path("data/processed/combined_db_csv")
# 大学の複数キャンパス都道府県 (build_mext_db_csv.py が出力)。検索レイヤの都道府県索引に統合する。
DEFAULT_CAMPUS_PREFECTURES = Path("data/processed/mext_db_csv/institution_prefectures.csv")

# 機関名の接尾辞 (長い/具体的なものを先に判定)
INSTITUTION_SUFFIXES = [
    "大学院", "短期大学", "高等専門学校", "高等専修学校", "高等学校",
    "専門学校", "専修学校", "大学校", "大学", "学院", "学校",
]

_kks = pykakasi.kakasi()


def to_hira(text: str) -> str:
    return "".join(part["hira"] for part in _kks.convert(text)).strip()


def to_kana(text: str) -> str:
    return "".join(part["kana"] for part in _kks.convert(text)).strip()


def to_roma(text: str) -> str:
    return "".join(part["hepburn"] for part in _kks.convert(text)).strip().lower()


def abbreviation(name: str) -> str:
    for suffix in INSTITUTION_SUFFIXES:
        if name.endswith(suffix) and len(name) - len(suffix) >= 2:
            return name[: -len(suffix)]
    return ""


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


class TermWriter:
    """(entity_id, term, language_code) で重複排除しつつ行を集める。"""

    def __init__(self, id_field: str) -> None:
        self.id_field = id_field
        self.rows: list[dict[str, str]] = []
        self._seen: set[tuple[str, str, str]] = set()

    def add(self, entity_id: str, term: str, term_type: str, language_code: str, weight: float) -> None:
        term = term.strip()
        if not term or len(term) > 255:
            return
        key = (entity_id, term, language_code)
        if key in self._seen:
            return
        self._seen.add(key)
        self.rows.append({
            self.id_field: entity_id,
            "term": term,
            "term_type": term_type,
            "language_code": language_code,
            "weight": f"{weight:g}",
        })

    def write(self, path: Path) -> None:
        fields = [self.id_field, "term", "term_type", "language_code", "weight"]
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=fields)
            writer.writeheader()
            writer.writerows(self.rows)


def build_institution_terms(rows: list[dict[str, str]]) -> TermWriter:
    w = TermWriter("institution_public_id")
    for r in rows:
        pid = r["public_id"]
        display = r.get("display_name", "")
        name_en = r.get("name", "")
        # primary: 漢字表示名
        w.add(pid, display, "primary", "ja", 1.0)
        # primary: 英語名 (display と異なる場合のみ)
        if name_en and name_en != display:
            w.add(pid, name_en, "primary", "en", 1.0)
            w.add(pid, name_en.lower(), "alias", "en", 0.6)
        # alias: 読み (ひらがな / カタカナ) と ローマ字
        w.add(pid, to_hira(display), "alias", "ja", 0.6)
        w.add(pid, to_kana(display), "alias", "ja-Kana", 0.6)
        w.add(pid, to_roma(display), "alias", "ja-Latn", 0.6)
        # abbreviation: 接尾辞除去 + その読み
        abbr = abbreviation(display)
        if abbr:
            w.add(pid, abbr, "abbreviation", "ja", 0.4)
            w.add(pid, to_hira(abbr), "alias", "ja", 0.4)
            w.add(pid, to_kana(abbr), "alias", "ja-Kana", 0.4)
            w.add(pid, to_roma(abbr), "alias", "ja-Latn", 0.4)
    return w


def build_faculty_terms(rows: list[dict[str, str]]) -> TermWriter:
    w = TermWriter("faculty_public_id")
    for r in rows:
        pid = r["public_id"]
        display = r.get("display_name", "")
        w.add(pid, display, "primary", "ja", 1.0)
        w.add(pid, to_hira(display), "alias", "ja", 0.6)
        w.add(pid, to_kana(display), "alias", "ja-Kana", 0.6)
        w.add(pid, to_roma(display), "alias", "ja-Latn", 0.6)
    return w


def build_institution_prefectures(
    institutions: list[dict[str, str]], campus_path: Path
) -> list[tuple[str, str]]:
    """機関ごとの都道府県索引 (本部 + 全キャンパス) を組み立てる。

    全機関の本部県 (combined institutions.csv の prefecture_code) を基底に、大学の
    複数キャンパス県 (campus_path) を足して (public_id, prefecture_code) を重複排除する。
    """
    seen: set[tuple[str, str]] = set()
    for r in institutions:
        pid, code = r["public_id"], r.get("prefecture_code", "").strip()
        if pid and code:
            seen.add((pid, code))
    if campus_path.exists():
        for r in load_csv(campus_path):
            pid, code = r["institution_public_id"], r.get("prefecture_code", "").strip()
            if pid and code:
                seen.add((pid, code))
    return sorted(seen)


def write_prefectures(path: Path, rows: list[tuple[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["institution_public_id", "prefecture_code"])
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DIR,
                        help="combined CSV のディレクトリ (institutions.csv / faculties.csv を読む)")
    parser.add_argument("--output-dir", type=Path, default=None,
                        help="出力先 (既定は --data-dir と同じ)")
    parser.add_argument("--campus-prefectures", type=Path, default=DEFAULT_CAMPUS_PREFECTURES,
                        help="大学の複数キャンパス都道府県CSV (build_mext_db_csv.py 出力)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out = args.output_dir or args.data_dir

    institutions = load_csv(args.data_dir / "institutions.csv")
    faculties = load_csv(args.data_dir / "faculties.csv")

    inst_terms = build_institution_terms(institutions)
    fac_terms = build_faculty_terms(faculties)

    inst_terms.write(out / "institution_terms.csv")
    fac_terms.write(out / "faculty_terms.csv")

    pref_rows = build_institution_prefectures(institutions, args.campus_prefectures)
    write_prefectures(out / "institution_prefectures.csv", pref_rows)

    multi_count = _count_multi(pref_rows)
    print(
        f"institutions={len(institutions)} -> institution_terms={len(inst_terms.rows)}\n"
        f"faculties={len(faculties)} -> faculty_terms={len(fac_terms.rows)}\n"
        f"institution_prefectures={len(pref_rows)} (多県機関={multi_count})\n"
        f"output_dir={out}"
    )
    return 0


def _count_multi(pref_rows: list[tuple[str, str]]) -> int:
    counts: dict[str, int] = {}
    for pid, _code in pref_rows:
        counts[pid] = counts.get(pid, 0) + 1
    return sum(1 for n in counts.values() if n > 1)


if __name__ == "__main__":
    raise SystemExit(main())
