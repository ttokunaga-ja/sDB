# Data Pipeline Documentation

sDB publishes the source code for a reproducible local data pipeline, but it does not publish downloaded source files or generated CSV files.

## What Is Not Tracked

The following are intentionally excluded from Git:

- downloaded MEXT Excel files
- downloaded MEXT CSV files
- downloaded MEXT PDF files
- generated CSV outputs
- database dumps
- API keys and credentials

The repository `.gitignore` excludes `data/`, `*.csv`, `*.xlsx`, `*.xls`, `*.xlsm`, and `*.pdf`.

## Source Materials

The scripts target public MEXT materials, including:

- university, junior-college, technical-college, and school-corporation list pages
- school-code CSV files
- high-school department classification materials

Important links:

- [MEXT Website Terms of Use](https://www.mext.go.jp/b_menu/1351168.htm)
- [MEXT Website Terms of Use Appendix](https://www.mext.go.jp/b_menu/1366610.htm)
- [MEXT School Code](https://www.mext.go.jp/b_menu/toukei/mext_01087.html)

## Commands

Install dependencies:

```bash
make setup
```

Download source files locally:

```bash
make data-fetch
```

Generate local CSV outputs:

```bash
make data
```

Remove all downloaded/generated local data:

```bash
make clean-data
```

## Scripts

- `scripts/download_mext_excels.py`: discovers and downloads MEXT higher-education Excel files.
- `scripts/download_mext_school_codes.py`: downloads MEXT school-code CSV files.
- `scripts/build_mext_db_csv.py`: parses higher-education Excel files and creates normalized CSV outputs.
- `scripts/build_high_school_db_csv.py`: parses school-code CSV files and creates high-school institution/faculty-shaped outputs.
- `scripts/build_vocational_school_db_csv.py`: parses school-code CSV files for vocational-school-shaped outputs.
- `scripts/merge_db_csv_dirs.py`: merges generated CSV directories.
- `scripts/build_search_terms.py`: creates local search-term CSV outputs from generated CSV files.
- `scripts/academic_field.py`: deterministic heuristic classification for academic field/track labels.
- `scripts/mext_common.py`: shared row definitions, text normalization, and public ID generation.

## Processing Content

The pipeline performs these transformations:

- extracts institution, faculty, and department-like records from public source materials
- normalizes display names and language/region fields
- derives stable public IDs from source values
- maps Japanese prefectures to `JP-xx` codes
- classifies academic field and academic track with deterministic keyword rules
- generates reading and romanization search terms with `pykakasi`
- builds prefecture indexes for search filtering

High-school department data has a source limitation: the MEXT school-code CSV contains school names and addresses, but not school-specific department offerings. The script therefore uses MEXT department classification materials as a catalog and defaults or heuristically infers faculty-like labels from school names. This is processed data, not proof of school-specific department offerings.

## Attribution

Use attribution whenever generated data or API responses are published:

> Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT) public materials. Processed by sDB.

Japanese:

> 出典: 文部科学省公開資料を加工して作成

## Disclaimer

The pipeline can produce stale, incomplete, or incorrectly parsed data. Heuristic classifications are approximate. Always verify important records against the latest official MEXT source. This repository does not provide legal advice.
