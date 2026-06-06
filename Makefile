# sDB public-source helper targets.
#
# This repository intentionally does not track downloaded Excel/PDF files or
# generated CSV files. All data output goes under data/, which is gitignored.

PYTHON ?= python3
NPM ?= npm
FRONTEND_PORT ?= 5173

.PHONY: setup check frontend-build frontend-serve data-fetch data-mext data-high-school data-vocational data-merge terms-build data clean-data

setup:
	$(PYTHON) -m venv .venv
	. .venv/bin/activate && python -m pip install -r requirements.txt
	$(NPM) install

check: frontend-build
	$(PYTHON) -m py_compile scripts/*.py

frontend-build:
	$(NPM) run build

data-fetch:
	$(PYTHON) scripts/download_mext_excels.py --latest-only --workers 4
	$(PYTHON) scripts/download_mext_school_codes.py

data-mext:
	$(PYTHON) scripts/build_mext_db_csv.py

data-high-school:
	$(PYTHON) scripts/build_high_school_db_csv.py

data-vocational:
	$(PYTHON) scripts/build_vocational_school_db_csv.py

data-merge:
	$(PYTHON) scripts/merge_db_csv_dirs.py \
	  data/processed/mext_db_csv \
	  data/processed/mext_school_code_db_csv \
	  data/processed/mext_vocational_school_db_csv

terms-build:
	$(PYTHON) scripts/build_search_terms.py

data: data-mext data-high-school data-vocational data-merge terms-build

frontend-serve:
	@echo "frontend: http://localhost:$(FRONTEND_PORT)"
	$(NPM) run dev -- --host 127.0.0.1 --port $(FRONTEND_PORT)

clean-data:
	rm -rf data
