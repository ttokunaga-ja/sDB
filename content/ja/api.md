## API ドキュメント

この文書は、sDB API を利用するために必要な認証、エンドポイント、リクエスト、レスポンス仕様を説明します。

## Base URL

sDB API の Base URL は次の値です。

```text
https://sdb.api.takumi-tokunaga.com
```

## 認証

`/v1/*` の API には API キーが必要です。リクエスト時に次のヘッダーを付与してください。

```http
X-API-Key: $SDB_API_KEY
Accept: application/json
```

JSON を送信する `POST` リクエストでは、次のヘッダーも指定してください。

```http
Content-Type: application/json
```

API キーは `tkp_` で始まる 68 文字の文字列です。未発行の場合は、ポートフォリオの Contact ページから取得導線へ進んでください。

- API キー取得: [https://takumi-tokunaga.com/contact/](https://takumi-tokunaga.com/contact/)

## 共通仕様

- 文字コードは UTF-8 です。
- レスポンスは JSON です。
- ID には `publicId` を使用します。`publicId` は sDB が生成する公開用 ID であり、文部科学省の公式 ID ではありません。
- `{publicId}` を含むエンドポイントでは、直前の検索や一覧レスポンスで返された `publicId` を指定します。
- `limit` と `offset` によるページングを使用します。
- `prefectureCode` は `JP-13` のような都道府県コードです。

代表的なエラー:

```json
{
  "error": "API_KEY_INVALID",
  "message": "api key is invalid"
}
```

HTTP ステータスの目安:

- `400`: クエリパラメータやリクエスト本文が不正
- `401`: API キーが未指定または無効
- `402`: 日次クレジット不足
- `403`: API キーが失効済み、またはアクセス不可
- `404`: 指定した `publicId` が存在しない
- `500`: サーバー内部エラー

## Institutions

### `GET /v1/institutions`

教育機関を検索します。

Query parameters:

- `q`: 検索文字列
- `type`: `university`, `graduate_school`, `junior_college`, `technical_college`, `technical_college_advanced`, `high_school`, `vocational_school`
- `prefectureCode`: `JP-13` などの都道府県コード
- `limit`: 取得件数
- `offset`: ページング開始位置

Request:

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/institutions?q=ritsumeikan&type=university&prefectureCode=JP-26&limit=10" \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Accept: application/json"
```

Response:

```json
{
  "items": [
    {
      "publicId": "Qh1rOPTq",
      "name": "Ritsumeikan University",
      "displayName": "立命館大学",
      "institutionType": "university",
      "prefectureCode": "JP-26"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### `GET /v1/institutions/{publicId}`

教育機関の詳細を取得します。`{publicId}` には `GET /v1/institutions` のレスポンスで返された `publicId` を指定します。

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/institutions/Qh1rOPTq" \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Accept: application/json"
```

### `GET /v1/institutions/{publicId}/faculties`

教育機関に紐づく学部・研究科を取得します。

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/institutions/Qh1rOPTq/faculties?limit=20" \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Accept: application/json"
```

Response:

```json
{
  "items": [
    {
      "publicId": "o4xNXqd4",
      "name": "国際関係学部",
      "displayName": "国際関係学部",
      "academicField": "social_sciences"
    }
  ],
  "total": 16,
  "limit": 20,
  "offset": 0
}
```

## Faculties

### `GET /v1/faculties/{publicId}/departments`

学部・研究科に紐づく学科を取得します。`{publicId}` には `GET /v1/institutions/{publicId}/faculties` のレスポンスで返された `publicId` を指定します。

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/faculties/o4xNXqd4/departments?limit=20" \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Accept: application/json"
```

Response:

```json
{
  "items": [
    {
      "publicId": "wcdVaYOl",
      "name": "アメリカン大学・立命館大学国際連携学科",
      "displayName": "アメリカン大学・立命館大学国際連携学科",
      "academicField": "social_sciences",
      "academicTrack": "humanities"
    }
  ],
  "total": 2,
  "limit": 20,
  "offset": 0
}
```

## Suggest

### `GET /v1/suggest`

教育機関名の軽量サジェストを取得します。autocomplete 向けの endpoint で、`GET /v1/institutions` の total-count query は実行しません。

Query parameters:

- `q`: 検索文字列
- `type`: 学校種別フィルタ
- `prefectureCode`: 都道府県フィルタ
- `limit`: 取得件数

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/suggest?q=tokyo&type=university&prefectureCode=JP-13&limit=10" \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Accept: application/json"
```

## Selection Events

### `POST /v1/selections`

利用者が選択した教育機関、学部、学科を記録します。検索品質や候補順位の改善に使う任意イベントです。検索結果の取得には必須ではありません。

Request:

```bash
curl "https://sdb.api.takumi-tokunaga.com/v1/selections" \
  -X POST \
  -H "X-API-Key: $SDB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"type":"institution","publicId":"Qh1rOPTq"}'
```

Body:

```json
{
  "type": "institution",
  "publicId": "Qh1rOPTq"
}
```

`type` は `institution`, `faculty`, `department` のいずれかです。`publicId` には選択された対象の `publicId` を指定します。

## 出典・加工内容・免責

API レスポンスには、文部科学省公開資料を加工したデータが含まれる場合があります。API 利用者がレスポンス内容を外部に表示、保存、再配布、またはサービス内で利用する場合は、出典、加工内容、MEXT 規約リンク、免責を表示してください。

- 出典: 文部科学省公開資料を加工して作成
- 加工内容: 取得した公開資料を正規化し、教育機関、学部・研究科、学科、検索語、都道府県コードなどの検索用データへ変換
- MEXT 利用規約: [https://www.mext.go.jp/b_menu/1351168.htm](https://www.mext.go.jp/b_menu/1351168.htm)
- MEXT 利用規約別記: [https://www.mext.go.jp/b_menu/1366610.htm](https://www.mext.go.jp/b_menu/1366610.htm)
- 免責: sDB は文部科学省の公式サービスではなく、データの完全性、正確性、最新性を保証しません。
