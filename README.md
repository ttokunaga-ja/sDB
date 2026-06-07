# sDB

sDB is a public, source-only education institution search page and data-processing toolkit.

This repository intentionally does **not** include downloaded Excel/PDF files, raw source data, generated CSV files, database dumps, backend containers, API keys, or database import SQL. The public scope is limited to:

- a Cloudflare Pages search app in `src/`
- Python scripts that show how MEXT public materials can be downloaded and normalized locally
- documentation for the API contract, data sources, processing steps, attribution, and disclaimer

The API server, database, API-key issuing service, and generated data are operated outside this repository.

## Search App

The web app is built with React + MUI for Cloudflare Pages. The root route `/` contains only the education institution search form. Reference pages live on separate routes:

- `/overview/`
- `/api/`
- `/notices/`

Serve the web app locally:

```bash
npm install
make frontend-serve
```

Open `http://localhost:5173`. The search app always calls `https://sdb.api.takumi-tokunaga.com`.

If the API requires authentication, enter the issued API key in the search page. The key is sent as `X-API-Key` and is kept only in the current page state. It is not written to browser storage, and route changes clear the form state.

If a user does not have an API key, the search page links to the portfolio Contact page:

- [https://takumi-tokunaga.com/contact/](https://takumi-tokunaga.com/contact/)

## Cloudflare Pages

The production site is deployed to Cloudflare Pages by GitHub Actions with Wrangler Direct Upload, following the same deployment model as the portfolio repository.

- Cloudflare Pages project: `sdb`
- Production branch: `master`
- Build command: `npm run build`
- Build output directory: `dist`
- Custom domain: `sdb.takumi-tokunaga.com`
- API origin used by the frontend build: `https://sdb.api.takumi-tokunaga.com`

The GitHub Actions workflow requires these repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The build bundles Markdown from `content/ja/` into the React documentation routes. Cloudflare Pages should publish only the `dist` directory, not the repository root.

`public/_headers` and `public/_redirects` are copied into `dist/` by Vite. The redirect file allows direct access to `/overview/`, `/api/`, and `/notices/` on Cloudflare Pages. This repository does not include Cloudflare Pages Functions.

## Markdown Content

The public documentation routes are sourced from Markdown, similar to the portfolio repository's Markdown-first content workflow.

Edit these source files:

- `content/ja/overview.md`: public overview and usage instructions
- `content/ja/api.md`: public API documentation
- `content/ja/notices.md`: source attribution, processing notice, MEXT terms links, and disclaimer

Then run:

```bash
npm run build
```

Generated files under `dist/` are ignored by Git and recreated during local serving or Cloudflare Pages builds.

## Python Data Pipeline

Install dependencies:

```bash
make setup
```

Fetch public MEXT source files locally:

```bash
make data-fetch
```

Generate local CSV outputs:

```bash
make data
```

All downloaded files and generated CSV outputs are written under `data/`, which is gitignored. Do not commit `data/`, `*.csv`, `*.xlsx`, `*.xls`, or `*.pdf`.

## Source And Processing Notice

The data pipeline targets public materials published by the Ministry of Education, Culture, Sports, Science and Technology (MEXT), including:

- MEXT university, junior college, and technical college lists
- MEXT school-code CSV files
- MEXT high-school department classification materials

The scripts normalize those materials into institution/faculty/department-shaped CSV files for local processing. They also generate deterministic public IDs, approximate academic-field labels, reading/romanization search terms, and prefecture indexes. These generated outputs are processed data and are not represented as official MEXT data.

Attribution example:

> Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT) public materials. Processed by sDB.

Japanese attribution example:

> 出典: 文部科学省公開資料を加工して作成

## Copyright And Terms

MEXT states that content published on the MEXT website can be used under its website terms, including reproduction, public transmission, translation/adaptation, and commercial use, subject to the stated conditions. The terms also require source attribution and a processing notice when edited or processed.

Relevant links:

- [MEXT Website Terms of Use](https://www.mext.go.jp/b_menu/1351168.htm)
- [MEXT Website Terms of Use Appendix](https://www.mext.go.jp/b_menu/1366610.htm)
- [MEXT School Code](https://www.mext.go.jp/b_menu/toukei/mext_01087.html)

This repository does not redistribute MEXT Excel/PDF/CSV files or generated CSV outputs. If you operate an API or publish processed data, display source attribution, describe the processing, and avoid presenting the result as an official MEXT service or official MEXT dataset.

## Disclaimer

This project is not affiliated with, endorsed by, or operated by MEXT. The scripts and web app are provided for technical reproducibility. The generated data may contain parsing errors, stale records, heuristic classifications, or differences from the latest official source. This repository does not provide legal advice; confirm applicable terms before redistributing source materials or processed datasets.

## Reference

- [API documentation](docs/API.md)
- [Data pipeline documentation](docs/DATA_PIPELINE.md)
- [Notices](docs/NOTICES.md)
