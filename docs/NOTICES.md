# Notices

## Repository Policy

sDB is a public source-code repository. It must not include:

- MEXT raw Excel, CSV, or PDF files
- generated CSV outputs
- database import files or dumps
- service-account files, database URLs, or other secrets

Only scripts, static web files, and documentation are intended for publication.

## MEXT Terms

MEXT states that content published on the MEXT website can be used under its website terms, including reproduction, public transmission, translation/adaptation, and commercial use, subject to the stated conditions. The terms require source attribution, and when content is edited or processed, the user must state that editing or processing was performed.

Relevant links:

- [MEXT Website Terms of Use](https://www.mext.go.jp/b_menu/1351168.htm)
- [MEXT Website Terms of Use Appendix](https://www.mext.go.jp/b_menu/1366610.htm)
- [MEXT School Code](https://www.mext.go.jp/b_menu/toukei/mext_01087.html)

## Required Notices For Public Pages

If a web page or document publishes data derived from MEXT materials, include:

- source attribution
- processing notice
- disclaimer that the result is not official MEXT data
- link to the MEXT terms

Recommended Japanese notice:

> 出典: 文部科学省公開資料を加工して作成。sDB は文部科学省の公式サービスではありません。

Recommended English notice:

> Source: Ministry of Education, Culture, Sports, Science and Technology (MEXT) public materials. Processed by sDB. sDB is not an official MEXT service.

The public Cloudflare Pages pages keep these notices in Markdown so they can be updated without touching React layout code:

- `content/ja/api.md`
- `content/ja/notices.md`

## Third-Party Rights

Before redistributing any source file or generated dataset, confirm whether the source page or file indicates third-party rights or a separate rule. Do not use MEXT logos, symbols, character designs, photos, decorative images, or video content unless their rights and terms have been confirmed.

## Disclaimer

This repository does not provide legal advice. The maintainers and users are responsible for confirming applicable terms before redistributing source materials or processed datasets.
