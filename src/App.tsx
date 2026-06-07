import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  AppBar,
  Autocomplete,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  FormControl,
  GlobalStyles,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  type SelectChangeEvent
} from "@mui/material";
import { marked } from "marked";
import React from "react";
import { createPortal } from "react-dom";
import apiMarkdownEn from "../content/en/api.md?raw";
import noticesMarkdownEn from "../content/en/notices.md?raw";
import overviewMarkdownEn from "../content/en/overview.md?raw";
import apiMarkdown from "../content/ja/api.md?raw";
import noticesMarkdown from "../content/ja/notices.md?raw";
import overviewMarkdown from "../content/ja/overview.md?raw";
import { theme } from "./theme";

type PageKey = "home" | "overview" | "api" | "notices" | "notFound";
type Locale = "ja" | "en";
type DocPageKey = Exclude<PageKey, "home" | "notFound">;

type CodeBlockTarget = {
  id: string;
  element: HTMLPreElement;
};

type Institution = {
  publicId: string;
  name?: string;
  displayName: string;
  institutionType?: string;
  prefectureCode?: string;
};

type Faculty = {
  publicId: string;
  displayName: string;
  academicField?: string;
};

type Department = {
  publicId: string;
  displayName: string;
  academicField?: string;
  academicTrack?: string;
};

type ListResponse<T> = {
  items?: T[];
  total?: number;
  limit?: number;
  offset?: number;
};

type PrefectureOption = {
  code: string;
  name: string;
  reading: string;
};

const MAX_ITEMS = 10;
const MIN_QUERY_LEN = 1;
const LEGACY_API_KEY_STORAGE_KEY = "sdb_api_key";
const API_KEY_PATTERN = /^tkp_[a-f0-9]{64}$/;
const API_KEY_REQUEST_URL = "https://takumi-tokunaga.com/contact/";
const PRODUCTION_API_BASE_URL = "https://sdb.api.takumi-tokunaga.com";
const LOCALE_STORAGE_KEY = "sdb_locale";

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  university: "大学",
  graduate_school: "大学院",
  junior_college: "短期大学",
  technical_college: "高等専門学校",
  technical_college_advanced: "高専専攻科",
  high_school: "高等学校",
  vocational_school: "専門学校"
};

const INSTITUTION_TYPE_LABELS_EN: Record<string, string> = {
  university: "University",
  graduate_school: "Graduate school",
  junior_college: "Junior college",
  technical_college: "College of technology",
  technical_college_advanced: "Advanced course",
  high_school: "High school",
  vocational_school: "Vocational school"
};

const ACADEMIC_FIELD_LABELS: Record<string, string> = {
  generic_programmes: "汎用プログラム・資格",
  education: "教育",
  arts_and_humanities: "芸術・人文科学",
  social_sciences: "社会科学・情報",
  business_and_law: "ビジネス・経営・法律",
  natural_sciences: "自然科学・数学・統計",
  ict: "情報通信技術 (ICT)",
  engineering: "工学・製造・建設",
  agriculture: "農林水産・獣医",
  health_and_welfare: "保健・福祉",
  services: "サービス"
};

const ACADEMIC_FIELD_LABELS_EN: Record<string, string> = {
  generic_programmes: "Generic programmes",
  education: "Education",
  arts_and_humanities: "Arts and humanities",
  social_sciences: "Social sciences and information",
  business_and_law: "Business, management, and law",
  natural_sciences: "Natural sciences, mathematics, and statistics",
  ict: "Information and communication technology",
  engineering: "Engineering, manufacturing, and construction",
  agriculture: "Agriculture, forestry, fisheries, and veterinary",
  health_and_welfare: "Health and welfare",
  services: "Services"
};

const ACADEMIC_TRACK_LABELS: Record<string, string> = {
  science: "理系",
  humanities: "文系"
};

const ACADEMIC_TRACK_LABELS_EN: Record<string, string> = {
  science: "Science",
  humanities: "Humanities"
};

const PREFECTURES: PrefectureOption[] = [
  ["JP-01", "北海道", "ほっかいどう hokkaido"],
  ["JP-02", "青森県", "あおもり aomori"],
  ["JP-03", "岩手県", "いわて iwate"],
  ["JP-04", "宮城県", "みやぎ miyagi"],
  ["JP-05", "秋田県", "あきた akita"],
  ["JP-06", "山形県", "やまがた yamagata"],
  ["JP-07", "福島県", "ふくしま fukushima"],
  ["JP-08", "茨城県", "いばらき ibaraki"],
  ["JP-09", "栃木県", "とちぎ tochigi"],
  ["JP-10", "群馬県", "ぐんま gunma"],
  ["JP-11", "埼玉県", "さいたま saitama"],
  ["JP-12", "千葉県", "ちば chiba"],
  ["JP-13", "東京都", "とうきょう tokyo"],
  ["JP-14", "神奈川県", "かながわ kanagawa"],
  ["JP-15", "新潟県", "にいがた niigata"],
  ["JP-16", "富山県", "とやま toyama"],
  ["JP-17", "石川県", "いしかわ ishikawa"],
  ["JP-18", "福井県", "ふくい fukui"],
  ["JP-19", "山梨県", "やまなし yamanashi"],
  ["JP-20", "長野県", "ながの nagano"],
  ["JP-21", "岐阜県", "ぎふ gifu"],
  ["JP-22", "静岡県", "しずおか shizuoka"],
  ["JP-23", "愛知県", "あいち aichi"],
  ["JP-24", "三重県", "みえ mie"],
  ["JP-25", "滋賀県", "しが shiga"],
  ["JP-26", "京都府", "きょうと kyoto"],
  ["JP-27", "大阪府", "おおさか osaka"],
  ["JP-28", "兵庫県", "ひょうご hyogo"],
  ["JP-29", "奈良県", "なら nara"],
  ["JP-30", "和歌山県", "わかやま wakayama"],
  ["JP-31", "鳥取県", "とっとり tottori"],
  ["JP-32", "島根県", "しまね shimane"],
  ["JP-33", "岡山県", "おかやま okayama"],
  ["JP-34", "広島県", "ひろしま hiroshima"],
  ["JP-35", "山口県", "やまぐち yamaguchi"],
  ["JP-36", "徳島県", "とくしま tokushima"],
  ["JP-37", "香川県", "かがわ kagawa"],
  ["JP-38", "愛媛県", "えひめ ehime"],
  ["JP-39", "高知県", "こうち kochi"],
  ["JP-40", "福岡県", "ふくおか fukuoka"],
  ["JP-41", "佐賀県", "さが saga"],
  ["JP-42", "長崎県", "ながさき nagasaki"],
  ["JP-43", "熊本県", "くまもと kumamoto"],
  ["JP-44", "大分県", "おおいた oita"],
  ["JP-45", "宮崎県", "みやざき miyazaki"],
  ["JP-46", "鹿児島県", "かごしま kagoshima"],
  ["JP-47", "沖縄県", "おきなわ okinawa"]
].map(([code, name, reading]) => ({ code, name, reading }));

const NAV_ITEMS: Array<{ key: DocPageKey; href: string; icon: React.ReactNode }> = [
  { key: "overview", href: "/overview/", icon: <InfoRoundedIcon /> },
  { key: "api", href: "/api/", icon: <ArticleRoundedIcon /> },
  { key: "notices", href: "/notices/", icon: <PolicyRoundedIcon /> }
];

const DOC_PAGES: Record<Locale, Record<DocPageKey, { title: string; lead: string; markdown: string }>> = {
  ja: {
    overview: {
      title: "概要と使用方法",
      lead: "sDBは、日本の教育機関を検索するためのページです。",
      markdown: overviewMarkdown
    },
    api: {
      title: "APIドキュメント",
      lead: "sDB API の認証、エンドポイント、リクエスト、レスポンス仕様です。",
      markdown: apiMarkdown
    },
    notices: {
      title: "注意事項",
      lead: "検索結果の出典、加工内容、利用時の注意事項です。",
      markdown: noticesMarkdown
    }
  },
  en: {
    overview: {
      title: "Overview",
      lead: "sDB is a page for searching Japanese educational institutions.",
      markdown: overviewMarkdownEn
    },
    api: {
      title: "API Guide",
      lead: "Authentication, endpoints, requests, and responses for using the sDB API.",
      markdown: apiMarkdownEn
    },
    notices: {
      title: "Notices",
      lead: "Source attribution, processing details, and important notes for search results.",
      markdown: noticesMarkdownEn
    }
  }
};

const UI_TEXT = {
  ja: {
    nav: { overview: "概要", api: "API", notices: "注意事項" },
    titles: {
      home: "sDB — 教育機関検索",
      overview: "概要と使用方法 | sDB",
      api: "APIドキュメント | sDB",
      notices: "注意事項 | sDB",
      notFound: "ページが見つかりません | sDB"
    },
    menu: "メニュー",
    openMenu: "メニューを開く",
    navigation: "ナビゲーション",
    language: "言語",
    copyCode: "コードをコピー",
    copiedCode: "コピーしました",
    copyFailed: "コピーに失敗しました",
    homeTitle: "教育機関検索",
    apiKeyLabel: "APIキー",
    apiKeyPlaceholder: "発行済み API キー",
    apiKeyMissing: "APIキーが未入力です。",
    apiKeyContact: "ポートフォリオのContactページ",
    apiKeySuffix: "から取得導線へ進んでください。",
    apiKeyInvalid: "APIキーの形式が正しくありません。tkp_ から始まる 68 文字のキーを入力してください。",
    allInstitutionTypes: "すべての学校種別",
    institutionTypeAria: "学校種別",
    prefectureLabel: "都道府県（任意）",
    prefecturePlaceholder: "例: とうきょう / 大阪 / osaka",
    schoolLabel: "学校名",
    schoolPlaceholder: "りつめいかん / ritsumeikan / 立命館",
    schoolNoOptions: "学校名を入力してください",
    schoolNoMatch: "該当する学校がありません",
    facultyAria: "学部・研究科",
    facultyLoading: "読み込み中...",
    facultyChoose: "学部・研究科を選択",
    facultyBeforeSchool: "先に学校を選択してください",
    departmentAria: "学科",
    departmentLoading: "読み込み中...",
    departmentChoose: "学科を選択",
    departmentBeforeFaculty: "先に学部・研究科を選択してください",
    summaryTitle: "選択中",
    summarySchool: "学校",
    summaryFaculty: "学部",
    summaryDepartment: "学科",
    notFoundTitle: "ページが見つかりません",
    notFoundBody: "指定されたページはsDBの公開ページには存在しません。",
    backHome: "検索ページへ戻る"
  },
  en: {
    nav: { overview: "Overview", api: "API", notices: "Notices" },
    titles: {
      home: "sDB — Institution Search",
      overview: "Overview | sDB",
      api: "API Guide | sDB",
      notices: "Notices | sDB",
      notFound: "Page Not Found | sDB"
    },
    menu: "Menu",
    openMenu: "Open menu",
    navigation: "Menu",
    language: "Language",
    copyCode: "Copy code",
    copiedCode: "Copied",
    copyFailed: "Copy failed",
    homeTitle: "Institution Search",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "Issued API key",
    apiKeyMissing: "API key is not entered.",
    apiKeyContact: "Portfolio Contact page",
    apiKeySuffix: "to continue to the acquisition flow.",
    apiKeyInvalid: "Enter a 68-character API key beginning with tkp_.",
    allInstitutionTypes: "All institution types",
    institutionTypeAria: "Institution type",
    prefectureLabel: "Prefecture (optional)",
    prefecturePlaceholder: "Example: tokyo / osaka",
    schoolLabel: "Institution name",
    schoolPlaceholder: "ritsumeikan / tokyo / waseda",
    schoolNoOptions: "Enter an institution name",
    schoolNoMatch: "No matching institutions",
    facultyAria: "Faculty or graduate school",
    facultyLoading: "Loading...",
    facultyChoose: "Select a faculty or graduate school",
    facultyBeforeSchool: "Select an institution first",
    departmentAria: "Department",
    departmentLoading: "Loading...",
    departmentChoose: "Select a department",
    departmentBeforeFaculty: "Select a faculty or graduate school first",
    summaryTitle: "Selected",
    summarySchool: "Institution",
    summaryFaculty: "Faculty",
    summaryDepartment: "Department",
    notFoundTitle: "Page Not Found",
    notFoundBody: "The requested page does not exist on sDB.",
    backHome: "Back to Search"
  }
} as const;

function normalizePath(pathname: string): string {
  const withoutIndex = pathname.replace(/\/index\.html$/, "/");
  if (withoutIndex === "") return "/";
  return withoutIndex.endsWith("/") ? withoutIndex : `${withoutIndex}/`;
}

function pageFromPath(pathname: string): PageKey {
  const path = normalizePath(pathname);
  if (path === "/") return "home";
  if (path === "/overview/") return "overview";
  if (path === "/api/") return "api";
  if (path === "/notices/" || path === "/sources/") return "notices";
  return "notFound";
}

function resolveApiBase() {
  return PRODUCTION_API_BASE_URL;
}

function typeLabel(value?: string, locale: Locale = "ja") {
  const labels = locale === "en" ? INSTITUTION_TYPE_LABELS_EN : INSTITUTION_TYPE_LABELS;
  return value ? labels[value] || value : "";
}

function fieldLabel(value?: string, locale: Locale = "ja") {
  const labels = locale === "en" ? ACADEMIC_FIELD_LABELS_EN : ACADEMIC_FIELD_LABELS;
  return value ? labels[value] || value : "";
}

function trackLabel(value?: string, locale: Locale = "ja") {
  const labels = locale === "en" ? ACADEMIC_TRACK_LABELS_EN : ACADEMIC_TRACK_LABELS;
  return value ? labels[value] || value : "";
}

function prefLabel(value?: string) {
  return value ? PREFECTURES.find((pref) => pref.code === value)?.name || value : "";
}

function selectPlaceholder(label: string) {
  return (
    <Typography component="span" color="text.secondary">
      {label}
    </Typography>
  );
}

function createHeaders(apiKey: string, extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...(extra || {}) };
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (isValidApiKey(normalizedApiKey)) headers["X-API-Key"] = normalizedApiKey;
  return headers;
}

function normalizeApiKey(value: string) {
  return value.trim();
}

function isValidApiKey(value: string) {
  return API_KEY_PATTERN.test(value);
}

async function apiGet<T>(
  apiBase: string,
  apiKey: string,
  path: string,
  params?: Record<string, string | number | undefined | null>,
  signal?: AbortSignal
): Promise<T> {
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (!isValidApiKey(normalizedApiKey)) throw new Error("APIキーの形式が正しくありません");

  const url = new URL(`${apiBase}${path}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== "" && value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { signal, headers: createHeaders(apiKey) });
  if (response.status === 401) throw new Error("APIキーが必要または無効です");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function recordSelection(apiBase: string, apiKey: string, type: "institution" | "faculty" | "department", publicId: string) {
  const normalizedApiKey = normalizeApiKey(apiKey);
  if (!isValidApiKey(normalizedApiKey)) return;

  try {
    fetch(`${apiBase}/v1/selections`, {
      method: "POST",
      headers: createHeaders(normalizedApiKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ type, publicId }),
      keepalive: true
    }).catch(() => {});
  } catch {
    // Selection telemetry must not block the search form.
  }
}

function clearLegacyApiKeyStorage() {
  try {
    window.sessionStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  try {
    window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "ja" || stored === "en") return stored;
  } catch {
    // Ignore localStorage failures.
  }
  return "ja";
}

function App() {
  const [path, setPath] = React.useState(() => normalizePath(window.location.pathname));
  const [locale, setLocaleState] = React.useState<Locale>(getStoredLocale);
  const page = pageFromPath(path);
  const apiBase = React.useMemo(() => resolveApiBase(), []);
  const text = UI_TEXT[locale];

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {
      // Ignore localStorage failures.
    }
  }, []);

  React.useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    clearLegacyApiKeyStorage();
  }, [path]);

  React.useEffect(() => {
    document.documentElement.lang = locale;
    document.title = text.titles[page];
  }, [locale, page, text]);

  const navigate = React.useCallback((href: string) => {
    window.history.pushState(null, "", href);
    setPath(normalizePath(href));
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline enableColorScheme />
      <GlobalStyles
        styles={{
          "html, body, #root": {
            minHeight: "100%"
          },
          body: {
            backgroundColor: "var(--mui-palette-background-default)"
          },
          "*, *::before, *::after": {
            boxSizing: "border-box"
          }
        }}
      />
      <Layout currentPage={page} locale={locale} navigate={navigate} setLocale={setLocale}>
        {page === "home" ? <HomePage apiBase={apiBase} locale={locale} /> : null}
        {page === "overview" || page === "api" || page === "notices" ? <DocPage page={page} locale={locale} /> : null}
        {page === "notFound" ? <NotFoundPage locale={locale} navigate={navigate} /> : null}
      </Layout>
    </ThemeProvider>
  );
}

function Layout({
  children,
  currentPage,
  locale,
  navigate,
  setLocale
}: {
  children: React.ReactNode;
  currentPage: PageKey;
  locale: Locale;
  navigate: (href: string) => void;
  setLocale: (locale: Locale) => void;
}) {
  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const appBarRef = React.useRef<HTMLElement | null>(null);
  const [appBarHeight, setAppBarHeight] = React.useState(0);
  const text = UI_TEXT[locale];

  React.useEffect(() => {
    const el = appBarRef.current;
    if (!el) return;

    const update = () => setAppBarHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setDrawerOpen(false);
    navigate(href);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        ref={appBarRef}
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: "divider",
          backdropFilter: "blur(16px)",
          backgroundColor: "background.default"
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
            <Tooltip title={text.menu}>
              <IconButton
                color="primary"
                aria-label={text.openMenu}
                aria-controls={isDrawerOpen ? "site-navigation" : undefined}
                aria-expanded={isDrawerOpen ? "true" : undefined}
                onClick={() => setDrawerOpen(true)}
                edge="start"
              >
                <MenuRoundedIcon />
              </IconButton>
            </Tooltip>
            <Link
              href="/"
              underline="none"
              color="text.primary"
              onClick={(event) => handleNavigate(event, "/")}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                mr: "auto",
                fontWeight: 800,
                fontSize: { xs: "1.22rem", md: "1.36rem" },
                lineHeight: 1
              }}
            >
              sDB
            </Link>
            <Stack
              component="nav"
              direction="row"
              spacing={0.5}
              aria-label="Primary navigation"
              sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}
            >
              {NAV_ITEMS.map((item) => {
                const active = currentPage === item.key;
                return (
                  <Button
                    key={item.key}
                    component="a"
                    href={item.href}
                    onClick={(event) => handleNavigate(event, item.href)}
                    color="primary"
                    variant="text"
                    startIcon={item.icon}
                    sx={{
                      minWidth: 0,
                      px: 1.4,
                      borderRadius: 1,
                      color: active ? "primary.main" : "text.secondary",
                      fontSize: "0.95rem",
                      fontWeight: active ? 800 : 700,
                      backgroundColor: active ? "action.selected" : "transparent",
                      "&:hover": {
                        backgroundColor: active ? "action.selected" : "action.hover"
                      }
                    }}
                  >
                    {text.nav[item.key]}
                  </Button>
                );
              })}
            </Stack>
            <Tooltip title={text.language}>
              <IconButton
                color="primary"
                aria-label={text.language}
                onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
              >
                <LanguageRoundedIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        id="site-navigation"
        anchor="left"
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 300,
            maxWidth: "84vw",
            top: appBarHeight,
            height: appBarHeight ? `calc(100% - ${appBarHeight}px)` : "100%",
            borderTopRightRadius: 1,
            borderBottomRightRadius: 1
          }
        }}
        sx={{ "& .MuiBackdrop-root": { top: appBarHeight } }}
      >
        <Box sx={{ pt: 2 }} role="presentation">
          <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
            {text.navigation}
          </Typography>
          <List>
            {NAV_ITEMS.map((item) => (
              <ListItemButton
                key={item.key}
                component="a"
                href={item.href}
                selected={currentPage === item.key}
                onClick={(event) => handleNavigate(event, item.href)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={text.nav[item.key]} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

    </Box>
  );
}

function HomePage({ apiBase, locale }: { apiBase: string; locale: Locale }) {
  const text = UI_TEXT[locale];
  const [apiKey, setApiKey] = React.useState("");
  const [institutionType, setInstitutionType] = React.useState("");
  const [prefecture, setPrefecture] = React.useState<PrefectureOption | null>(null);
  const [schoolQuery, setSchoolQuery] = React.useState("");
  const [schoolOptions, setSchoolOptions] = React.useState<Institution[]>([]);
  const [school, setSchool] = React.useState<Institution | null>(null);
  const [schoolLoading, setSchoolLoading] = React.useState(false);
  const [schoolError, setSchoolError] = React.useState("");
  const [faculties, setFaculties] = React.useState<Faculty[]>([]);
  const [faculty, setFaculty] = React.useState<Faculty | null>(null);
  const [facultyLoading, setFacultyLoading] = React.useState(false);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [department, setDepartment] = React.useState<Department | null>(null);
  const [departmentLoading, setDepartmentLoading] = React.useState(false);
  const [flowError, setFlowError] = React.useState("");
  const normalizedApiKey = React.useMemo(() => normalizeApiKey(apiKey), [apiKey]);
  const hasApiKey = normalizedApiKey.length > 0;
  const apiKeyValid = isValidApiKey(normalizedApiKey);
  const facultyPlaceholder = school ? (facultyLoading ? text.facultyLoading : text.facultyChoose) : text.facultyBeforeSchool;
  const departmentPlaceholder = faculty
    ? departmentLoading
      ? text.departmentLoading
      : text.departmentChoose
    : text.departmentBeforeFaculty;
  const apiKeyLabel = apiKeyValid ? (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
      <Box component="span">{text.apiKeyLabel}</Box>
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: 0.75,
          bgcolor: "success.main",
          color: "success.contrastText"
        }}
      >
        <CheckRoundedIcon sx={{ fontSize: 14 }} />
      </Box>
    </Box>
  ) : (
    text.apiKeyLabel
  );

  React.useEffect(() => {
    const query = schoolQuery.trim();
    if ([...query].length < MIN_QUERY_LEN) {
      setSchoolOptions([]);
      setSchoolError("");
      return;
    }
    if (!apiKeyValid) {
      setSchoolOptions([]);
      setSchoolError("");
      setSchoolLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSchoolLoading(true);
      setSchoolError("");
      try {
        const data = await apiGet<ListResponse<Institution>>(
          apiBase,
          normalizedApiKey,
          "/v1/institutions",
          {
            q: query,
            type: institutionType,
            prefectureCode: prefecture?.code,
            limit: MAX_ITEMS
          },
          controller.signal
        );
        setSchoolOptions(data.items || []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSchoolOptions([]);
        setSchoolError(error instanceof Error ? error.message : "学校候補の取得に失敗しました");
      } finally {
        setSchoolLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [apiBase, apiKeyValid, institutionType, normalizedApiKey, prefecture, schoolQuery]);

  const resetDownstream = React.useCallback(() => {
    setSchool(null);
    setFaculties([]);
    setFaculty(null);
    setDepartments([]);
    setDepartment(null);
    setFlowError("");
  }, []);

  const loadFaculties = React.useCallback(
    async (nextSchool: Institution) => {
      setSchool(nextSchool);
      setFaculty(null);
      setDepartments([]);
      setDepartment(null);
      setFlowError("");
      recordSelection(apiBase, normalizedApiKey, "institution", nextSchool.publicId);

      setFacultyLoading(true);
      try {
        const data = await apiGet<ListResponse<Faculty>>(
          apiBase,
          normalizedApiKey,
          `/v1/institutions/${encodeURIComponent(nextSchool.publicId)}/faculties`,
          { limit: MAX_ITEMS }
        );
        const nextFaculties = data.items || [];
        setFaculties(nextFaculties);
        if (nextFaculties.length === 1 && (data.total || nextFaculties.length) === 1) {
          await loadDepartments(nextFaculties[0], { auto: true });
        }
      } catch (error) {
        setFaculties([]);
        setFlowError(error instanceof Error ? error.message : "学部・研究科の取得に失敗しました");
      } finally {
        setFacultyLoading(false);
      }
    },
    [apiBase, normalizedApiKey]
  );

  const loadDepartments = React.useCallback(
    async (nextFaculty: Faculty, opts?: { auto?: boolean }) => {
      setFaculty(nextFaculty);
      setDepartment(null);
      setFlowError("");
      if (!opts?.auto) recordSelection(apiBase, normalizedApiKey, "faculty", nextFaculty.publicId);

      setDepartmentLoading(true);
      try {
        const data = await apiGet<ListResponse<Department>>(
          apiBase,
          normalizedApiKey,
          `/v1/faculties/${encodeURIComponent(nextFaculty.publicId)}/departments`,
          { limit: MAX_ITEMS }
        );
        const nextDepartments = data.items || [];
        setDepartments(nextDepartments);
        if (nextDepartments.length === 1 && (data.total || nextDepartments.length) === 1) {
          setDepartment(nextDepartments[0]);
        }
      } catch (error) {
        setDepartments([]);
        setFlowError(error instanceof Error ? error.message : "学科の取得に失敗しました");
      } finally {
        setDepartmentLoading(false);
      }
    },
    [apiBase, normalizedApiKey]
  );

  const handleSchoolChange = (_event: React.SyntheticEvent, nextSchool: Institution | null) => {
    if (!nextSchool) {
      resetDownstream();
      return;
    }
    setSchoolQuery(nextSchool.displayName);
    void loadFaculties(nextSchool);
  };

  const handleFilterChange = () => {
    resetDownstream();
    setSchoolQuery("");
    setSchoolOptions([]);
  };

  const handleFacultyChange = (event: SelectChangeEvent) => {
    const nextFaculty = faculties.find((item) => item.publicId === event.target.value);
    if (nextFaculty) void loadDepartments(nextFaculty);
  };

  const handleDepartmentChange = (event: SelectChangeEvent) => {
    const nextDepartment = departments.find((item) => item.publicId === event.target.value);
    if (!nextDepartment) return;
    setDepartment(nextDepartment);
    recordSelection(apiBase, normalizedApiKey, "department", nextDepartment.publicId);
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3} alignItems="center">
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h1">{text.homeTitle}</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, width: "100%" }}>
          <Stack spacing={2.5}>
            <TextField
              label={apiKeyLabel}
              value={apiKey}
              type="text"
              name="sdb-api-access-key"
              autoComplete="off"
              inputProps={{
                autoComplete: "off",
                autoCapitalize: "none",
                spellCheck: false,
                "data-1p-ignore": "true",
                "data-lpignore": "true"
              }}
              error={hasApiKey && !apiKeyValid}
              onChange={(event) => setApiKey(event.target.value.replace(/\s+/g, ""))}
              placeholder={text.apiKeyPlaceholder}
              fullWidth
            />

            {!hasApiKey ? (
              <Alert severity="warning" icon={<KeyRoundedIcon />} sx={{ alignItems: "center" }}>
                {text.apiKeyMissing}{" "}
                <Link href={API_KEY_REQUEST_URL} target="_blank" rel="noreferrer" fontWeight={700}>
                  {text.apiKeyContact}
                </Link>
                {locale === "ja" ? text.apiKeySuffix : ` ${text.apiKeySuffix}`}
              </Alert>
            ) : !apiKeyValid ? (
              <Alert severity="error">{text.apiKeyInvalid}</Alert>
            ) : null}

            <Divider />

            <FormControl fullWidth>
              <Select
                displayEmpty
                value={institutionType}
                onChange={(event) => {
                  setInstitutionType(event.target.value);
                  handleFilterChange();
                }}
                inputProps={{ "aria-label": text.institutionTypeAria }}
                sx={{ color: institutionType ? "text.primary" : "text.secondary" }}
                renderValue={(selected) => {
                  const value = String(selected);
                  return value ? typeLabel(value, locale) : selectPlaceholder(text.allInstitutionTypes);
                }}
              >
                <MenuItem value="">
                  <Typography color="text.secondary">{text.allInstitutionTypes}</Typography>
                </MenuItem>
                {Object.keys(INSTITUTION_TYPE_LABELS).map((value) => (
                  <MenuItem key={value} value={value}>
                    {typeLabel(value, locale)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              value={prefecture}
              options={PREFECTURES}
              getOptionLabel={(option) => option.name}
              filterOptions={(options, state) => {
                const query = state.inputValue.trim().toLowerCase();
                if (!query) return options;
                return options.filter(
                  (option) => option.name.includes(query) || option.reading.toLowerCase().includes(query)
                );
              }}
              onChange={(_event, nextPrefecture) => {
                setPrefecture(nextPrefecture);
                handleFilterChange();
              }}
              renderInput={(params) => (
                <TextField {...params} label={text.prefectureLabel} placeholder={text.prefecturePlaceholder} />
              )}
            />

            <Autocomplete
              value={school}
              inputValue={schoolQuery}
              options={schoolOptions}
              loading={schoolLoading}
              getOptionLabel={(option) => option.displayName}
              filterOptions={(options) => options}
              isOptionEqualToValue={(option, value) => option.publicId === value.publicId}
              noOptionsText={schoolQuery.trim() ? text.schoolNoMatch : text.schoolNoOptions}
              onInputChange={(_event, nextValue, reason) => {
                setSchoolQuery(nextValue);
                if (reason === "input") {
                  resetDownstream();
                }
              }}
              onChange={handleSchoolChange}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.publicId} sx={{ alignItems: "flex-start !important" }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={700}>
                      {option.displayName}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {option.institutionType ? <Chip size="small" label={typeLabel(option.institutionType, locale)} /> : null}
                      {option.prefectureCode ? <Chip size="small" label={prefLabel(option.prefectureCode)} /> : null}
                    </Stack>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={text.schoolLabel}
                  placeholder={text.schoolPlaceholder}
                  error={!!schoolError}
                  helperText={schoolError || undefined}
                />
              )}
            />

            <FormControl fullWidth disabled={!school || facultyLoading || faculties.length === 0}>
              <Select
                displayEmpty
                value={faculty?.publicId || ""}
                onChange={handleFacultyChange}
                inputProps={{ "aria-label": text.facultyAria }}
                sx={{ color: faculty ? "text.primary" : "text.secondary" }}
                renderValue={(selected) => {
                  const value = String(selected);
                  const item = faculties.find((candidate) => candidate.publicId === value);
                  return item ? item.displayName : selectPlaceholder(facultyPlaceholder);
                }}
              >
                <MenuItem value="">
                  <Typography color="text.secondary">{facultyPlaceholder}</Typography>
                </MenuItem>
                {faculties.map((item) => (
                  <MenuItem key={item.publicId} value={item.publicId}>
                    <Stack>
                      <Typography variant="body2">{item.displayName}</Typography>
                      {item.academicField ? (
                        <Typography variant="caption" color="text.secondary">
                          {fieldLabel(item.academicField, locale)}
                        </Typography>
                      ) : null}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth disabled={!faculty || departmentLoading || departments.length === 0}>
              <Select
                displayEmpty
                value={department?.publicId || ""}
                onChange={handleDepartmentChange}
                inputProps={{ "aria-label": text.departmentAria }}
                sx={{ color: department ? "text.primary" : "text.secondary" }}
                renderValue={(selected) => {
                  const value = String(selected);
                  const item = departments.find((candidate) => candidate.publicId === value);
                  return item ? item.displayName : selectPlaceholder(departmentPlaceholder);
                }}
              >
                <MenuItem value="">
                  <Typography color="text.secondary">{departmentPlaceholder}</Typography>
                </MenuItem>
                {departments.map((item) => {
                  const meta = [fieldLabel(item.academicField, locale), trackLabel(item.academicTrack, locale)].filter(Boolean).join(" / ");
                  return (
                    <MenuItem key={item.publicId} value={item.publicId}>
                      <Stack>
                        <Typography variant="body2">{item.displayName}</Typography>
                        {meta ? (
                          <Typography variant="caption" color="text.secondary">
                            {meta}
                          </Typography>
                        ) : null}
                      </Stack>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {flowError ? <Alert severity="error">{flowError}</Alert> : null}
            {school ? <SelectionSummary school={school} faculty={faculty} department={department} locale={locale} /> : null}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

function SelectionSummary({
  school,
  faculty,
  department,
  locale
}: {
  school: Institution;
  faculty: Faculty | null;
  department: Department | null;
  locale: Locale;
}) {
  const text = UI_TEXT[locale];
  const departmentMeta = department
    ? [fieldLabel(department.academicField, locale), trackLabel(department.academicTrack, locale)].filter(Boolean).join(" / ")
    : "";

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        {text.summaryTitle}
      </Typography>
      <Stack spacing={1}>
        <SummaryRow
          label={text.summarySchool}
          value={school.displayName}
          chips={[typeLabel(school.institutionType, locale), prefLabel(school.prefectureCode)].filter(Boolean)}
        />
        {faculty ? (
          <SummaryRow label={text.summaryFaculty} value={faculty.displayName} chips={[fieldLabel(faculty.academicField, locale)].filter(Boolean)} />
        ) : null}
        {department ? <SummaryRow label={text.summaryDepartment} value={department.displayName} chips={departmentMeta ? [departmentMeta] : []} /> : null}
      </Stack>
    </Paper>
  );
}

function SummaryRow({ label, value, chips }: { label: string; value: string; chips: string[] }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: { sm: 72 }, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
      {chips.map((chip) => (
        <Chip key={chip} size="small" label={chip} />
      ))}
    </Stack>
  );
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback for browsers that block the Clipboard API.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function DocPage({ page, locale }: { page: DocPageKey; locale: Locale }) {
  const doc = DOC_PAGES[locale][page];
  const html = React.useMemo(() => marked.parse(doc.markdown, { async: false, gfm: true }) as string, [doc.markdown]);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [codeBlocks, setCodeBlocks] = React.useState<CodeBlockTarget[]>([]);
  const [codeBlockFeedback, setCodeBlockFeedback] = React.useState<{ id: string; status: "copied" | "failed" } | null>(null);

  React.useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) {
      setCodeBlocks([]);
      return;
    }

    const blocks = Array.from(container.querySelectorAll<HTMLPreElement>("pre")).map((element, index) => ({
      id: `${page}-${locale}-${index}`,
      element
    }));
    setCodeBlocks(blocks);
    setCodeBlockFeedback(null);
  }, [html, locale, page]);

  const handleCopyCodeBlock = React.useCallback(async (block: CodeBlockTarget) => {
    const code = block.element.querySelector("code")?.textContent ?? "";
    if (!code) return;

    const copied = await copyTextToClipboard(code);
    setCodeBlockFeedback({ id: block.id, status: copied ? "copied" : "failed" });

    window.setTimeout(() => {
      setCodeBlockFeedback((current) => (current?.id === block.id ? null : current));
    }, 1600);
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h1">{doc.title}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {doc.lead}
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            fontSize: "1.06rem",
            lineHeight: 1.78,
            color: "text.primary",
            "& > *:first-of-type": { mt: 0 },
            "& h2": { mt: 5, mb: 1.5, fontSize: "1.8rem", lineHeight: 1.2 },
            "& h3": { mt: 3.5, mb: 1, fontSize: "1.25rem" },
            "& p": { color: "text.secondary" },
            "& p, & ul, & ol, & blockquote, & pre": { mb: 2 },
            "& ul, & ol": { pl: 3 },
            "& li": { mb: 0.7, color: "text.secondary" },
            "& a": { color: "primary.main", fontWeight: 700, overflowWrap: "anywhere" },
            "& code": {
              px: 0.6,
              py: 0.15,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "action.hover",
              overflowWrap: "anywhere"
            },
            "& pre": {
              position: "relative",
              overflowX: "auto",
              p: 1.5,
              pr: 6,
              borderRadius: 1,
              bgcolor: "grey.950",
              color: "common.white",
              whiteSpace: "pre-wrap"
            },
            "& pre code": {
              display: "block",
              p: 0,
              border: 0,
              bgcolor: "transparent",
              color: "inherit",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            },
            "& blockquote": {
              m: 0,
              p: 1.5,
              borderLeft: 4,
              borderColor: "primary.main",
              bgcolor: "action.hover"
            },
            "& blockquote p": { m: 0 }
          }}
        >
          <Box ref={contentRef} dangerouslySetInnerHTML={{ __html: html }} />
          {codeBlocks.map((block) => (
            <CodeCopyButton
              key={block.id}
              block={block}
              locale={locale}
              feedbackStatus={codeBlockFeedback?.id === block.id ? codeBlockFeedback.status : null}
              onCopy={handleCopyCodeBlock}
            />
          ))}
        </Paper>
      </Stack>
    </Container>
  );
}

function CodeCopyButton({
  block,
  feedbackStatus,
  locale,
  onCopy
}: {
  block: CodeBlockTarget;
  feedbackStatus: "copied" | "failed" | null;
  locale: Locale;
  onCopy: (block: CodeBlockTarget) => void;
}) {
  const text = UI_TEXT[locale];
  const isCopied = feedbackStatus === "copied";
  const isFailed = feedbackStatus === "failed";
  const label = isCopied ? text.copiedCode : isFailed ? text.copyFailed : text.copyCode;

  return createPortal(
    <Tooltip title={label}>
      <IconButton
        className="sdb-code-copy-button"
        size="small"
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onCopy(block);
        }}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
          color: isFailed ? "secondary.main" : "common.white",
          border: "1px solid",
          borderColor: isFailed ? "secondary.main" : "rgba(255, 255, 255, 0.24)",
          bgcolor: isCopied ? "rgba(100, 199, 189, 0.22)" : "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(8px)",
          "&:hover": {
            bgcolor: isCopied ? "rgba(100, 199, 189, 0.32)" : "rgba(255, 255, 255, 0.22)"
          }
        }}
      >
        {isCopied ? <CheckRoundedIcon fontSize="small" /> : <ContentCopyRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>,
    block.element
  );
}

function NotFoundPage({ locale, navigate }: { locale: Locale; navigate: (href: string) => void }) {
  const text = UI_TEXT[locale];
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="h1">{text.notFoundTitle}</Typography>
          <Typography color="text.secondary">{text.notFoundBody}</Typography>
          <Button component="a" href="/" startIcon={<SearchRoundedIcon />} onClick={(event) => {
            event.preventDefault();
            navigate("/");
          }}>
            {text.backHome}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

export default App;
