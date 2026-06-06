#!/usr/bin/env python3
"""DB向けCSVビルダー共通の dataclass・public_id 生成・テキスト正規化。

institutions / faculties / departments の列定義 (= CSV ヘッダ) は、大学系
(build_mext_db_csv.py) と高校/専門学校系 (build_high_school_db_csv.py /
build_vocational_school_db_csv.py) で**完全に一致**している必要がある。
merge_db_csv_dirs.py がヘッダ不一致を検出して落とすため、各スクリプトで個別に
定義すると暗黙の同期契約になってしまう。ここを単一定義にして構造的に保証する。

public_id は sha256 ベースの決定的 base62 (8桁)。namespace でテーブルを分け、
同じ入力からは常に同じ id を返すため、再生成しても出力はバイト単位で一致する。
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any

REGION_CODE = "JP"
DISPLAY_LANGUAGE = "ja"
PUBLIC_ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def to_base62(number: int, length: int = 8) -> str:
    base = len(PUBLIC_ID_ALPHABET)
    chars: list[str] = []
    for _ in range(length):
        number, remainder = divmod(number, base)
        chars.append(PUBLIC_ID_ALPHABET[remainder])
    return "".join(reversed(chars))


def public_id(namespace: str, natural_key: str) -> str:
    digest = hashlib.sha256(f"{namespace}:{natural_key}".encode("utf-8")).digest()
    # to_base62(length=8) は下位 8 桁 (= number mod 62**8) しか使わないので、
    # 上位ビットの切り捨ては暗黙の剰余になる。明示の % は不要。
    return to_base62(int.from_bytes(digest[:8], "big"))


@dataclass
class InstitutionRow:
    public_id: str
    name: str
    display_name: str
    display_language: str
    region_code: str
    institution_type: str
    prefecture_code: str
    address: str
    website_url: str
    deleted_at: str
    source_fiscal_year_label: str
    source_fiscal_year_ad: str
    source_category: str
    source_file_label: str
    source_workbook_path: str
    source_sheet_name: str
    source_title: str
    source_name_prefix: str
    source_name_english: str
    name_source: str


@dataclass
class FacultyRow:
    public_id: str
    institution_public_id: str
    name: str
    display_name: str
    display_language: str
    region_code: str
    academic_field: str
    deleted_at: str
    source_section: str
    source_row: int
    source_fiscal_year_label: str
    source_category: str
    source_file_label: str
    source_workbook_path: str
    source_sheet_name: str
    name_source: str


@dataclass
class DepartmentRow:
    public_id: str
    faculty_public_id: str
    name: str
    display_name: str
    display_language: str
    region_code: str
    academic_field: str
    academic_track: str
    deleted_at: str
    source_section: str
    source_row: int
    source_prefecture_code: str
    source_prefecture_name: str
    source_city: str
    source_fiscal_year_label: str
    source_category: str
    source_file_label: str
    source_workbook_path: str
    source_sheet_name: str
    name_source: str
