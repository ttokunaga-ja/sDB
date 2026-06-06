#!/usr/bin/env python3
"""学部・学科名から ISCED-F 2013 準拠の academic_field / academic_track を推定する。

外部API非依存方針 (README) に従い、機関名・学部/学科名の日本語キーワードによる
ヒューリスティック分類で生成する。確実な分類ではなく近似である点に注意。

enum値は eduanimaHandbook/07_engineering/01_DATABASE.md の
`academic_field_enum` / `academic_track_enum` と一致させる。

分類できない場合は空文字を返す (DB側で NULL になる)。
"""

from __future__ import annotations

# academic_field_enum の有効値
ACADEMIC_FIELDS = (
    "generic_programmes",
    "education",
    "arts_and_humanities",
    "social_sciences",
    "business_and_law",
    "natural_sciences",
    "ict",
    "engineering",
    "agriculture",
    "health_and_welfare",
    "services",
)

# (field, keywords) の優先順リスト。先にマッチしたものを採用する。
# 曖昧語を避けるため、できるだけ複合語・長めの語で判定する。
# 順序が重要: 上にあるほど優先される。
#
# 部分文字列の衝突に注意して並べている:
#   - 「獣医学」は「医学」を含むので agriculture を health より先に置く
#   - 「文化学」は「化学」を、「心理学」「地理学」は「理学」を含むので
#     arts / business / social を natural_sciences より先に置く
_RULES: list[tuple[str, tuple[str, ...]]] = [
    # スポーツ/体育は health の「健康」より先に拾う (健康スポーツ など)
    ("services", ("スポーツ", "体育", "武道")),
    # 農林水産・獣医 (「獣医学」が health の「医学」に吸われないよう health より前)
    (
        "agriculture",
        (
            "農", "獣医", "畜産", "酪農", "水産", "林学", "森林", "園芸", "生物資源",
            "生物生産", "アグリ", "醸造", "海洋生物", "食品科学", "食料", "生命環境",
        ),
    ),
    # 医療・保健・福祉
    (
        "health_and_welfare",
        (
            "医学", "医療", "医科", "歯学", "歯科", "薬学", "薬科", "看護", "保健",
            "リハビリ", "理学療法", "作業療法", "言語聴覚", "臨床検査", "臨床工学",
            "診療放射線", "放射線技術", "病理", "福祉", "介護", "救急救命",
            "管理栄養", "栄養", "助産", "鍼灸", "柔道整復", "整復", "口腔", "視能",
            "義肢装具", "ヘルス", "ヒューマンケア", "医用工学", "健康",
        ),
    ),
    # 教育
    (
        "education",
        (
            "教育", "教員養成", "教職", "保育", "幼児", "児童", "初等", "こども",
            "子ども",
        ),
    ),
    # 情報通信技術 (ICT)。bare「情報」は社会情報等があるため複合語のみ。
    (
        "ict",
        (
            "情報科学", "情報工", "情報通信", "情報システム", "情報メディア",
            "情報理工", "知能情報", "情報学", "総合情報", "コンピュータ",
            "データサイエンス", "データ科学", "人工知能", "ソフトウェア",
            "ネットワーク", "メディア情報", "情報に関する", "サイバー", "ＩＴ", "ICT",
            "情報技術",
        ),
    ),
    # 工学・製造・建設。化学工/応用化学は自然科学より先に拾う。
    (
        "engineering",
        (
            "工学", "理工", "工業", "建築", "土木", "機械", "電気", "電子", "材料",
            "建設", "航空", "宇宙", "船舶", "造船", "金属", "資源工", "化学工",
            "応用化学", "工科", "エネルギー", "ロボ", "メカ", "デザイン工", "環境工",
            "都市", "精密", "原子", "システム工", "生産工", "経営工",
        ),
    ),
    # 芸術・人文科学。natural より先 (「文化学」が「化学」に吸われないよう)。
    (
        "arts_and_humanities",
        (
            "文学", "人文", "哲学", "倫理", "歴史", "史学", "言語", "国文", "国語",
            "英文", "英語", "外国語", "中国語", "日本語", "独文", "仏文", "文化",
            "芸術", "美術", "音楽", "デザイン", "造形", "映像", "演劇", "宗教",
            "神学", "仏教", "書道", "工芸", "文芸", "表現", "アート", "学芸",
        ),
    ),
    # ビジネス・経営・法律 (公共政策・行政含む)。social より先 (国際経営 等)。
    (
        "business_and_law",
        (
            "経営", "商学", "商業", "会計", "ビジネス", "法学", "法律", "法務",
            "司法", "流通", "マーケティング", "金融", "税理", "起業",
            "マネジメント", "政策", "公共", "行政",
        ),
    ),
    # 社会科学・ジャーナリズム・情報。natural より先 (「心理学」「地理学」対策)。
    (
        "social_sciences",
        (
            "社会", "経済", "政治", "国際", "コミュニケーション", "心理",
            "人間", "地理", "ジャーナリズム", "メディア", "現代社会", "地域",
        ),
    ),
    # 自然科学・数学・統計
    (
        "natural_sciences",
        (
            "理学", "数学", "数理", "物理", "化学", "生物", "地球", "地学", "天文",
            "統計", "物質科学", "自然科学", "基礎科学", "生命科学", "ナノ", "環境",
        ),
    ),
    # サービス (観光・生活科学・防災等)
    (
        "services",
        (
            "観光", "ホスピタリティ", "家政", "生活科学", "生活", "調理", "製菓",
            "美容", "ファッション", "服飾", "家庭", "危機管理", "防災", "リゾート",
        ),
    ),
    # 汎用プログラム・資格 (教養・学際)
    (
        "generic_programmes",
        (
            "教養", "リベラルアーツ", "総合科学", "学際", "共通教育", "総合学術",
            "総合学科", "普通科",
        ),
    ),
]

# 文系/理系の対応。曖昧な分野 (generic / services) は空にする。
_TRACK_BY_FIELD = {
    "natural_sciences": "science",
    "ict": "science",
    "engineering": "science",
    "agriculture": "science",
    "health_and_welfare": "science",
    "arts_and_humanities": "humanities",
    "social_sciences": "humanities",
    "business_and_law": "humanities",
    "education": "humanities",
}


def classify_field(*names: str) -> str:
    """与えられた名前 (複数可、優先順) から academic_field を推定する。

    複数渡した場合は最初に分類できた名前の結果を使う。
    例: classify_field(department_name, faculty_name)
    """
    for name in names:
        if not name:
            continue
        for field, keywords in _RULES:
            if any(keyword in name for keyword in keywords):
                return field
    return ""


def classify_track(field: str, *names: str) -> str:
    """academic_field から academic_track (science/humanities) を推定する。

    field が空なら names から再分類を試みる。
    """
    if not field:
        field = classify_field(*names)
    return _TRACK_BY_FIELD.get(field, "")


if __name__ == "__main__":
    samples = [
        "医学部", "看護学部", "薬学部", "理学療法学科",
        "工学部", "情報工学科", "理工学部", "化学工学科",
        "理学部", "数学科", "化学科", "生物学科",
        "農学部", "獣医学部", "水産学部",
        "文学部", "外国語学部", "国際文化学部", "音楽学部",
        "法学部", "経営学部", "商学部", "経済学部",
        "社会学部", "国際関係学部", "心理学部",
        "教育学部", "保育学科",
        "スポーツ科学部", "観光学部", "生活科学部", "家政学部",
        "教養学部", "総合科学部", "普通科",
        "情報科学部", "データサイエンス学部",
    ]
    for s in samples:
        f = classify_field(s)
        t = classify_track(f, s)
        print(f"{s:16} -> {f or '(none)':20} {t or '-'}")
