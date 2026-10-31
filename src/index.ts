/**
 * LastOrder V5: live public search + optional Brave web search.
 * Replaces src/index.ts; public chat and app /api/chat stay unchanged.
 */
import type { Env, ChatMessage } from "./types";
/**
 * LastOrder V5: evidence-grounded music search.
 * Free sources: AnimeThemes, Jikan (unofficial MAL), Wikipedia, iTunes Search.
 * Optional broad web search: Brave Search API secret BRAVE_SEARCH_API_KEY.
 * No scraped Google/Bing result pages. Never invent a source URL or lyrics.
 */

type Lang = "ko" | "ja" | "zh" | "en";
interface SearchEnv { BRAVE_SEARCH_API_KEY?: string }
interface Anime {
  name?: string; title?: string; title_english?: string; title_japanese?: string;
  slug?: string; year?: number; media_format?: string; type?: string;
  mal_id?: number; url?: string;
  animesynonyms?: Array<{ text?: string }>;
  animethemes?: Array<{
    type?: string; sequence?: number;
    song?: { title?: string; artists?: Array<{ name?: string }> };
  }>;
}
interface Track { title: string; artist: string; type: "OP" | "ED"; number: number; source: string; sourceType: "AnimeThemes" | "Jikan" }
interface SearchHit { title: string; url: string; description: string; source: string; official: boolean }
const ALIASES: Array<[RegExp, string]> = [
  [/이누야샤|犬夜叉|inuyasha/i, "InuYasha"],
  [/명탐정\s*코난|名探偵コナン|detective\s*conan/i, "Detective Conan"],
  [/짱구|크레용\s*신짱|蜡笔小新|クレヨンしんちゃん|crayon\s*shin/i, "Crayon Shin-chan"],
  [/도라에몽|ドラえもん|doraemon/i, "Doraemon"],
  [/원피스|ワンピース|one\s*piece/i, "One Piece"],
  [/나루토|ナルト|naruto/i, "Naruto"],
  [/블리치|ブリーチ|bleach/i, "Bleach"],
  [/진격의\s*거인|進撃の巨人|attack\s*on\s*titan/i, "Shingeki no Kyojin"],
  [/귀멸의\s*칼날|鬼滅の刃|demon\s*slayer/i, "Kimetsu no Yaiba"],
  [/하이큐|ハイキュー|haikyu/i, "Haikyuu"],
  [/주술회전|呪術廻戦|jujutsu\s*kaisen/i, "Jujutsu Kaisen"],
];
const MUSIC = /(노래|음악|가사|곡명|주제가|엔딩|오프닝|OST|영화\s*주제|사운드트랙|가수|작곡|작사|뮤직|song|lyrics?|music|opening|ending|theme|singer|soundtrack|曲|歌|主題歌|オープニング|エンディング|片头|片尾|歌曲|歌手)/i;
const ANIME_CUE = /(애니|만화|anime|animation|극장판|剧场版|劇場版|op\b|ed\b)/i;
const FOLLOWUP = /^(한글로|한국어로|한국말로|한국어로\s*알려줘|한글로\s*알려줘|그\s*노래|그\s*곡|그거|엔딩곡|오프닝곡|곡명|제목은|제목이|이름이|가수는|누가\s*불렀|작곡가는|원곡|다시\s*알려|영어로|일본어로|중국어로|그\s*작품|what is its name|what is the song)/i;
const LYRICS = /(가사|lyrics?|歌詞|歌词)/i;
const LYRICS_ACTION = /(전체|전부|원문|알려|써줘|보여|적어|번역|해석|full|write|show|give|translate|explain|全文|全部|翻訳|翻译|解释)/i;
const MOVIE = /(극장판|영화|劇場版|剧场版|movie|film|흑철의\s*어영|黒鉄の魚影)/i;
const OFFICIAL_DOMAINS = /(^|\.)(columbia\.jp|sonymusic\.co\.jp|avex\.jp|universal-music\.co\.jp|kingrecords\.co\.jp|victor\.jp|ytv\.co\.jp|toho\.co\.jp|beinggiza\.com|bzone\.co\.jp|inuyasha\.jp|viz\.com)$/i;
const cache = new Map<string, { expires: number; data: unknown }>();
const safe = (s: unknown, max = 200): string => typeof s === "string" ? s.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, max) : "";
const normalize = (s: string): string => s.normalize("NFKC").toLowerCase().replace(/[\s\u3000!！?？'"“”‘’()[\]{}<>.,:;・~～\-—_]/g, "");
function locale(s: string): Lang {
  if (/[가-힣]/.test(s)) return "ko";
  if (/[ぁ-ゟ゠-ヿ]/.test(s)) return "ja";
  if (/[\u4e00-\u9fff]/.test(s)) return "zh";
  return "en";
}
function titleWords(text: string): string {
  return text.replace(/(알려줘|알려달라고|좀|제발|뭐야|무엇|정보|목록|노래|음악|엔딩곡?|오프닝곡?|주제가|OST|가사|뜻|해석|번역|찾아줘|검색해줘|제목|영어로|한국어로|한글로|의\s*곡|가수|작곡|작사|opening|ending|song|music|theme|lyrics?|find|please|what|is|the)/gi, " ")
    .replace(/[!?.,]/g, " ").replace(/\s+/g, " ").trim().slice(0, 95);
}
function subjectOf(question: string): string {
  if (/흑철의\s*어영|黒鉄の魚影|black\s*iron\s*submarine/i.test(question)) return "Detective Conan Movie 26: Black Iron Submarine";
  if (/(이누야샤|犬夜叉|inuyasha)/i.test(question) && /(완결편|完結編|kanketsu|final\s*act)/i.test(question)) return "InuYasha: Kanketsu-hen";
  for (const [re, target] of ALIASES) if (re.test(question)) return target;
  return titleWords(question);
}
function isMusic(q: string): boolean {
  return MUSIC.test(q) || /빅뱅|BIGBANG|방탄소년단|BTS\b|아이유|IU\b|지드래곤|G-DRAGON/i.test(q) || (ALIASES.some(([re]) => re.test(q)) && ANIME_CUE.test(q));
}
function isFollowup(q: string): boolean { return FOLLOWUP.test(q.trim()); }
function pickQuestion(current: string, history: string[]): { query: string; language: Lang; isFollowup: boolean } {
  const language = /^(한글로|한국어로|한국말로)/.test(current.trim()) ? "ko" : locale(current);
  if (!isFollowup(current)) return { query: current, language, isFollowup: false };
  const previous = history.slice(0, -1).reverse().find(s => !isFollowup(s) && (isMusic(s) || ALIASES.some(([re]) => re.test(s))));
  if (!previous) return { query: current, language, isFollowup: true };
  const directive = /엔딩|ending|片尾|エンディング/.test(current) ? " 엔딩곡" : /오프닝|opening|片头|オープニング/.test(current) ? " 오프닝곡" : "";
  return { query: previous + directive, language, isFollowup: true };
}
async function getJson<T>(url: string, ms=6000): Promise<T | null> {
  const stored = cache.get(url);
  if (stored && stored.expires > Date.now()) return stored.data as T;
  try {
    const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "LastOrderAI/5.0 (https://github.com/cjsalsgur123-lang/lastorder-ai)" }, signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    const data = await r.json() as T;
    if (cache.size > 120) cache.clear();
    cache.set(url, { expires: Date.now() + 600000, data });
    return data;
  } catch { return null; }
}
function matchTitle(expected: string, item: Anime, movie: boolean): number {
  const names = [item.name, item.title, item.title_english, item.title_japanese, ...(item.animesynonyms || []).map(s => s.text)];
  const e = normalize(expected);
  const variants = names.map(x => normalize(x || "")).filter(Boolean);
  let score = variants.some(x => x === e) ? 100 : variants.some(x => x.startsWith(e) && x.length <= e.length+6) ? 80 :
    variants.some(x => x.includes(e) && e.length >= 7) ? 55 : 0;
  const format = (item.media_format || item.type || "").toLowerCase();
  if (movie && format && !/movie|film/.test(format)) score -= 65;
  if (!movie && /movie|film/.test(format)) score -= 65;
  if (!movie && /tv/.test(format)) score += 8;
  if (e.includes("movie") && variants.some(x => x.startsWith(e) && x.length > e.length)) score = Math.max(score, 88);
  return score;
}
function chooseAnime(items: Anime[], expected: string, movie: boolean): Anime | null {
  const ranked = items.map(item => ({ item, score: matchTitle(expected, item, movie) })).sort((a,b) => b.score - a.score);
  if (!ranked.length || ranked[0].score < 78) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].item.name !== ranked[1].item.name) return null;
  return ranked[0].item;
}
async function animeThemes(subject: string, movie: boolean): Promise<{ anime: Anime; songs: Track[] } | null> {
  const qs = new URLSearchParams({ q: subject.slice(0, 64), include: "animethemes.song.artists" });
  qs.set("page[size]", "12");
  const obj = await getJson<{ anime?: Anime[] }>("https://api.animethemes.moe/anime?" + qs.toString());
  const selected = chooseAnime(obj?.anime || [], subject, movie);
  if (!selected) return null;
  const songs: Track[] = (selected.animethemes || []).flatMap(t => {
    const type = String(t.type || "").toUpperCase();
    if ((type !== "OP" && type !== "ED") || !t.song?.title) return [];
    return [{ type: type as "OP" | "ED", number: Number(t.sequence || 1), title: safe(t.song.title),
      artist: safe((t.song.artists || []).map(a => a.name).filter(Boolean).join(", "), 120) || "가수 정보 없음",
      source: "https://animethemes.moe/anime/" + encodeURIComponent(selected.slug || ""), sourceType: "AnimeThemes" as const }];
  });
  return { anime: selected, songs };
}
async function jikanThemes(subject: string, movie: boolean): Promise<{ anime: Anime; songs: Track[] } | null> {
  const qs = new URLSearchParams({ q: subject.slice(0, 64), limit: "10" });
  if (movie) qs.set("type", "movie");
  const list = await getJson<{ data?: Anime[] }>("https://api.jikan.moe/v4/anime?" + qs);
  const selected = chooseAnime(list?.data || [], subject, movie);
  if (!selected?.mal_id) return null;
  const data = await getJson<{ data?: { openings?: string[]; endings?: string[] } }>("https://api.jikan.moe/v4/anime/" + selected.mal_id + "/themes");
  const page = "https://myanimelist.net/anime/" + selected.mal_id;
  const parse = (rows: string[] | undefined, type: "OP" | "ED"): Track[] => (rows || []).slice(0, 16).map((raw, i) => {
    const str = safe(raw, 350);
    const number = Number(str.match(/^#?(\d+)\s*:/)?.[1] || i+1);
    const m = str.match(/["“](.*?)["”]\s*(?:by\s+([^()]+))?/i);
    return { type, number, title: safe(m?.[1] || str, 130), artist: safe(m?.[2] || "가수 정보 없음", 110), source: page, sourceType: "Jikan" };
  });
  return { anime: selected, songs: [...parse(data?.data?.openings, "OP"), ...parse(data?.data?.endings, "ED")] };
}
function withVerified(songs: Track[]): Array<Track & { count: number }> {
  const dedup = new Map<string, Track & { count: number; origins: Set<string> }>();
  for (const s of songs) {
    const key = `${s.type}|${normalize(s.title)}`;
    if (!normalize(s.title)) continue;
    const prev = dedup.get(key);
    if (prev) {
      prev.origins.add(s.sourceType);
      // Prefer artist metadata over empty artist info
      if (/정보 없음/.test(prev.artist) && !/정보 없음/.test(s.artist)) prev.artist = s.artist;
    } else dedup.set(key, { ...s, count: 1, origins: new Set([s.sourceType]) });
  }
  return [...dedup.values()].map(({ origins, ...s }) => ({ ...s, count: origins.size }));
}
const stripHtml = (s: string): string => s.replace(/<[^>]+>/g, " ").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/\s+/g," ");
async function wikipedia(query: string, language: Lang): Promise<SearchHit[]> {
  const langs = language === "ja" ? ["ja", "en"] : language === "zh" ? ["zh", "en"] : language === "ko" ? ["ko", "ja"] : ["en", "ja"];
  const sources = await Promise.all(langs.map(async lang => {
    const qs = new URLSearchParams({ q: query.slice(0, 100), limit: "4" });
    const obj = await getJson<{ pages?: Array<{ key?: string; title?: string; excerpt?: string; description?: string }> }>(`https://${lang}.wikipedia.org/w/rest.php/v1/search/page?${qs}`);
    return (obj?.pages || []).map(p => ({ title: safe(p.title), description: safe(stripHtml(p.excerpt || p.description || ""), 260),
      source: `${lang}.wikipedia.org`, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.key || p.title || "")}`,
      official: false }));
  }));
  return sources.flat().slice(0, 6);
}
async function appleMusic(query: string): Promise<SearchHit[]> {
  const p = new URLSearchParams({ term: query.slice(0, 90), media: "music", entity: "song", country: "KR", limit: "10" });
  const obj = await getJson<{ results?: Array<{ trackName?: string; artistName?: string; collectionName?: string; trackViewUrl?: string }> }>("https://itunes.apple.com/search?" + p);
  return (obj?.results || []).filter(x => x.trackName && x.artistName && /^https:\/\/music\.apple\.com\//.test(x.trackViewUrl || ""))
    .slice(0, 5).map(x => ({ title: safe(x.trackName), description: `가수: ${safe(x.artistName)} · 앨범: ${safe(x.collectionName)}`, url: x.trackViewUrl!, source: "Apple Music 카탈로그", official: false }));
}
async function braveSearch(query: string, apiKey: string, language: Lang): Promise<SearchHit[]> {
  if (!apiKey) return [];
  const p = new URLSearchParams({ q: query.slice(0, 180), count: "8", safesearch: "moderate", search_lang: language });
  try {
    const response = await fetch("https://api.search.brave.com/res/v1/web/search?" + p, {
      headers: { accept: "application/json", "X-Subscription-Token": apiKey }, signal: AbortSignal.timeout(6500)
    });
    if (!response.ok) return [];
    const obj = await response.json() as { web?: { results?: Array<{ title?: string; description?: string; url?: string }> } };
    return (obj.web?.results || []).flatMap(x => {
      let u: URL;
      try { u = new URL(x.url || ""); } catch { return []; }
      if (u.protocol !== "https:") return [];
      return [{ title: safe(stripHtml(x.title || "")), description: safe(stripHtml(x.description || ""), 280), url: u.toString(),
        official: OFFICIAL_DOMAINS.test(u.hostname), source: u.hostname }];
    });
  } catch { return []; }
}
function relevant(h: SearchHit, subject: string): boolean {
  const target = normalize(subject);
  if (!target || target.length < 3) return false;
  const sample = normalize(h.title + " " + h.description);
  return sample.includes(target) || ALIASES.some(([re, val]) => val === subject && re.test(h.title + " " + h.description)) ||
    (target === "detectiveconan" && /conan|コナン|코난/i.test(h.title + " " + h.description));
}
function formatHits(hits: SearchHit[], limit = 4): string {
  return hits.slice(0, limit).map((x,i)=>`${i+1}. ${x.title}${x.official ? " [공식 사이트의 검색 결과]" : " [검색 결과]"}\n   ${x.description}\n   ${x.url}`).join("\n\n");
}
function intro(lang: Lang, name: string): string {
  if (lang === "ja") return `${name} の公開音楽データを検索しました。`;
  if (lang === "zh") return `已搜索与 ${name} 相关的公开音乐资料。`;
  if (lang === "en") return `I searched public music catalogs for ${name}.`;
  return `**${name}** 관련 온라인 음악 자료를 검색했어.`;
}
function unknown(lang: Lang, searched: string, broad: boolean): string {
  if (lang === "ja") return `${searched}について確認できる曲名を見つけられませんでした。推測はしません。${broad ? "別の検索語を試してください。" : "広範囲のウェブ検索はまだ接続されていません。"}`;
  if (lang === "zh") return `未找到能够核实的 ${searched} 曲目信息，因此不会猜测。${broad ? "可以尝试更具体的作品名称。" : "全面网页搜索尚未连接。"}`;
  if (lang === "en") return `I couldn't verify the song details for ${searched}, so I won't guess. ${broad ? "Try a more specific title." : "Broad web search is not configured yet."}`;
  return `**${searched}**에 대해 일치하는 노래 정보를 확인하지 못했어. 다른 작품의 곡을 지어내지 않을게. ${broad ? "작품명이나 회차를 더 정확하게 적어줘." : "지금은 공개 음악 DB·위키백과 검색만 이용했고, 전체 웹 검색(Brave API)은 아직 연결되지 않았어."}`;
}
/** Returns null for ordinary conversation and the pre-existing Shin-chan movie catalog. */
async function researchMusic(current: string, userHistory: string[], env: SearchEnv): Promise<string | null> {
  const { query, language } = pickQuestion(current, userHistory);
  const subject = subjectOf(query);
  const isAnime = ALIASES.some(([re]) => re.test(query)) || ANIME_CUE.test(query);
  if (!isMusic(query) && !isAnime) return null;
  // The existing 30-item vetted film catalog remains the sole handler for Shin-chan numbered movie questions.
  if (/짱구|크레용\s*신짱|クレヨンしんちゃん|crayon\s*shin|蜡笔小新/i.test(query) && /(극장판|영화|movie|劇場版|剧场版|\d{1,2}\s*(기|편))/.test(query)) return null;
  if (!subject) return unknown(language, "질문한 작품", !!env.BRAVE_SEARCH_API_KEY);
  const asksLyrics = LYRICS.test(current) && LYRICS_ACTION.test(current);
  if (asksLyrics && current.includes("\n") && current.length >= 90) return null; // Translate only user-supplied lyrics using Qwen.
  if (asksLyrics && current.length < 180 && !current.includes("\n")) {
    return language === "ko" ? "없는 원곡 가사를 만들어 번역하지 않을게. 실제 가사 일부를 보내주면 그 부분의 의미를 설명하거나 번역해 줄게." :
      "Please provide the actual lyrics you want interpreted; I will not invent original lyrics.";
  }
  const movie = MOVIE.test(query);
  const wantsOpening = /(오프닝|opening|オープニング|片头)/i.test(query);
  const wantsEnding = /(엔딩|ending|エンディング|片尾)/i.test(query);
  const broad = !!env.BRAVE_SEARCH_API_KEY;
  if (isAnime) {
    // Search independent public anime-song catalogs; NEVER select an unrelated title just because it is first.
    const [animeA, animeB] = await Promise.all([animeThemes(subject, movie), jikanThemes(subject, movie)]);
    const a = animeA?.songs || [];
    const b = animeB?.songs || [];
    let songs = withVerified([...a, ...b]).filter(x => !wantsOpening && !wantsEnding || (wantsOpening && x.type === "OP") || (wantsEnding && x.type === "ED"));
    songs.sort((x,y) => (x.type === y.type ? x.number - y.number : x.type === "OP" ? -1 : 1));
    if (songs.length) {
      const title = safe(animeA?.anime.name || animeB?.anime.title || subject);
      const words = {
        ko: { op: "오프닝", ed: "엔딩", both: "두 음악 DB에서 일치", one: "음악 DB 1곳 기록", refs: "자료 출처", note: "※ 공개 음악 DB의 등록 정보야. 방송판·극장판·지역별 사용곡이 다를 수 있으며 공식 음반사 확인과는 달라." },
        en: { op: "Opening", ed: "Ending", both: "Matched in 2 databases", one: "Listed in 1 database", refs: "Sources", note: "※ These are entries in public music databases, not definitive official credits. TV/movie/regional versions may differ." },
        ja: { op: "オープニング", ed: "エンディング", both: "2つのDBで一致", one: "1つのDBに記載", refs: "参照元", note: "※ 公開音楽DBの記録です。放送版・映画版や地域によって使用曲が異なることがあります。公式クレジットとの照合は別途必要です。" },
        zh: { op: "片头曲", ed: "片尾曲", both: "两个数据库一致", one: "仅一个数据库记录", refs: "资料来源", note: "※ 这些是公开音乐数据库的记录，并非官方最终核实结果。电视版、电影版和地区版本可能不同。" }
      }[language];
      const list = songs.slice(0, 12).map((x, i) => `${i+1}. ${x.type === "OP" ? words.op : words.ed} ${x.number}: ${x.title} — ${x.artist} [${x.count >= 2 ? words.both : words.one}]`).join("\n");
      const sourceLinks = [...new Set([...a, ...b].map(x => x.source))];
      return `${intro(language, title)}\n\n${list}${songs.length > 12 ? `\n(${songs.length} entries; showing 12)` : ""}\n\n${words.refs}:\n${sourceLinks.join("\n")}\n\n${words.note}`;
    }
  }
  // Independent web sources: Wikipedia for free, and Brave for broader web coverage if configured.
  const q = (subject + (movie ? " movie film" : "") + (wantsOpening ? " opening song" : wantsEnding ? " ending song" : " theme song")).trim();
  const [wiki, brave] = await Promise.all([wikipedia(subject, language), braveSearch(q, env.BRAVE_SEARCH_API_KEY || "", language)]);
  const relevantBrave = brave.filter(x => relevant(x, subject));
  if (relevantBrave.length) return `${intro(language, subject)}\n\n검색 결과에서 관련 자료를 찾았어. **아래는 검색된 제목과 설명이지, 곡명이 공식 확인되었다는 뜻은 아니야.**\n\n${formatHits(relevantBrave)}\n\n※ 곡명·가수는 근거가 일치할 때만 확정할 수 있어. 위 링크에서 확인해 줘.`;
  // iTunes is a useful catalog for songs, but does not establish what episode/movie used them.
  const apple = !isAnime ? await appleMusic(subject) : [];
  if (apple.length) return `${intro(language, subject)}\n\nApple Music에 등록된 관련 곡 후보야. 실제 찾는 곡과 일치하는지 확인해야 해.\n\n${formatHits(apple, 5)}`;
  if (wiki.length) return `${unknown(language, subject, broad)}\n\n관련 문서(곡명 확정 근거 아님):\n${formatHits(wiki.slice(0, 3), 3)}`;
  return unknown(language, subject, broad);
}



// Film themes from the previous V4 catalog: preserved, not presented as live-verified ending credits.
const SHINCHAN_ARCHIVE: Array<[number, number, string, string, string]> = [
 [1,1993,"僕は永遠のお子様","Mew","アクション仮面VSハイグレ魔王"],
 [2,1994,"約束See You!","岸恭子","ブリブリ王国の秘宝"],
 [3,1995,"たすけてケスタ","杉本幸子","雲黒斎の野望"],
 [4,1996,"SIX COLORS BOY","雛形あきこ","ヘンダーランドの大冒険"],
 [5,1997,"ひまわりの家","財津和夫","暗黒タマタマ大追跡"],
 [6,1998,"PURENESS","SHAZNA","電撃！ブタのヒヅメ大作戦"],
 [7,1999,"いい湯だな","野原一家＆温泉わくわく'99","爆発！温泉わくわく大決戦"],
 [8,2000,"さよならありがとう","こばやしさちこ","嵐を呼ぶジャングル"],
 [9,2001,"元気でいてね","こばやしさちこ","嵐を呼ぶモーレツ！オトナ帝国の逆襲"],
 [10,2002,"二中のファンタジー〜体育を休む女の子編〜","DANCE☆MAN","嵐を呼ぶアッパレ！戦国大合戦"],
 [11,2003,"こんな時こそ焼肉がある","のはら家オールスターズ","嵐を呼ぶ栄光のヤキニクロード"],
 [12,2004,"○(マル)あげよう","NO PLAN","嵐を呼ぶ！夕陽のカスカベボーイズ"],
 [13,2005,"Crayon Beats","AI","伝説を呼ぶブリブリ ３分ポッキリ大進撃"],
 [14,2006,"GO WAY!!","倖田來未","伝説を呼ぶ 踊れ！アミーゴ！"],
 [15,2007,"Cry Baby","SEAMO","嵐を呼ぶ 歌うケツだけ爆弾！"],
 [16,2008,"人気者で行こう！","DJ OZMA","ちょー嵐を呼ぶ 金矛の勇者"],
 [17,2009,"やんちゃ道","ジェロ","オタケベ！カスカベ野生王国"],
 [18,2010,"オメデトウ","mihimaru GT","超時空！嵐を呼ぶオラの花嫁"],
 [19,2011,"イエローパンジーストリート","関ジャニ∞","嵐を呼ぶ黄金のスパイ大作戦"],
 [20,2012,"少年よ 嘘をつけ！","渡り廊下走り隊7","嵐を呼ぶ！オラと宇宙のプリンセス"],
 [21,2013,"RPG","SEKAI NO OWARI","バカうまっ！B級グルメサバイバル!!"],
 [22,2014,"ファミリーパーティー","きゃりーぱみゅぱみゅ","ガチンコ！逆襲のロボとーちゃん"],
 [23,2015,"OLA!!","ゆず","オラの引越し物語〜サボテン大襲撃〜"],
 [24,2016,"友よ 〜 この先もずっと・・・","ケツメイシ","爆睡！ユメミーワールド大突撃"],
 [25,2017,"ロードムービー","高橋優","襲来!!宇宙人シリリ"],
 [26,2018,"笑一笑 〜シャオイーシャオ！〜","ももいろクローバーZ","爆盛！カンフーボーイズ〜拉麺大乱〜"],
 [27,2019,"ハルノヒ","あいみょん","新婚旅行ハリケーン 〜失われたひろし〜"],
 [28,2020,"ギガアイシテル","レキシ","激突！ラクガキングダムとほぼ四人の勇者"],
 [29,2021,"はしりがき","マカロニえんぴつ","謎メキ！花の天カス学園"],
 [30,2022,"陽はまた昇るから","緑黄色社会","もののけニンジャ珍風伝"]
];
function shinchanArchive(question:string, history:string[]): string | null {
  let current = question;
  if (/^(한글로|한국어로|그 노래|그 곡|엔딩곡|오프닝곡|곡명|이름이)/.test(current.trim())) {
    current = history.slice(0,-1).reverse().find(q => /짱구|크레용|shin.chan|しんちゃん|蜡笔小新/i.test(q)) || current;
  }
  if (!/짱구|크레용|shin.chan|しんちゃん|蜡笔小新/i.test(current)) return null;
  const n = current.match(/(?:극장판|영화|movie|劇場版)\s*(\d{1,2})\s*(?:기|편|작)?/) || current.match(/(\d{1,2})\s*(?:기|편)/);
  if (/1\s*(기|편)?\s*[-~～부터]\s*25/.test(current)) {
    return "짱구 극장판 1~25기 영화 주제가 참고 목록(엔딩 장면 사용곡 전체를 보장하지 않음):\n\n" + SHINCHAN_ARCHIVE.slice(0,25).map(([ord,year,song,artist])=>`${ord}기 (${year}): ${song} — ${artist}`).join("\n") + "\n\n목록 출처: https://columbia.jp/prod-info/COCX-41902-5/";
  }
  if (!n) return null;
  const hit = SHINCHAN_ARCHIVE.find(x => x[0]===Number(n[1]));
  if (!hit) return null;
  const [ord,year,song,artist,title] = hit;
  return `짱구 극장판 ${ord}기 (${year})\n작품: ${title}\n영화 주제가: ${song}\n가수: ${artist}\n\n이 자료는 이전에 등록한 영화 주제가 목록 기준이며, 실제 엔딩 장면에 사용된 곡과 동일한지는 별도 확인이 필요해.\n자료: https://columbia.jp/prod-info/COCX-41902-5/`;
}

const SYSTEM_PROMPT = [
 "You are Last Order, a friendly multilingual AI assistant.",
 "Answer naturally in the user's language.",
 "Never make up real song lyrics, film credits, artist names, or citations.",
 "Previous assistant messages are not verified facts.",
 "If evidence is unavailable, state uncertainty. Never claim a web search was done unless researchMusic did it.",
 "Do not impersonate a search engine or invent a URL."
].join(" ");
const MODEL_ID = "@cf/qwen/qwen3-30b-a3b-fp8";
function sse(text:string):Response {
 return new Response(`data: ${JSON.stringify({response:text})}\n\ndata: [DONE]\n\n`, {
  headers:{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}
 });
}
export default {
 async fetch(request:Request, env:Env, _ctx:ExecutionContext):Promise<Response> {
  const url = new URL(request.url);
  if(url.pathname==="/api/health") return Response.json({
   status:"ready", service:"lastorder-ai", version:"websearch-v5",
   model: MODEL_ID, publicSearch:true,
   broadWebSearchConfigured: Boolean((env as Env & SearchEnv).BRAVE_SEARCH_API_KEY),
   searchSources:["AnimeThemes","Jikan","Wikipedia","Apple Music"]
  });
  if(url.pathname==="/" || !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
  if(url.pathname!=="/api/chat") return new Response("Not found",{status:404});
  if(request.method!=="POST") return new Response("Method not allowed",{status:405});
  try {
   const body = await request.json() as {messages?:ChatMessage[]};
   if(!Array.isArray(body.messages)) return Response.json({error:"Invalid messages"},{status:400});
   const history = body.messages.filter((m):m is ChatMessage => !!m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string").slice(-20).map(m=>({role:m.role,content:m.content.slice(0,3500)}));
   const users = history.filter(m=>m.role==="user").map(m=>m.content);
   const lastUser = users.at(-1)?.trim() || "";
   if(!lastUser) return Response.json({error:"Empty message"},{status:400});
   const answer = await researchMusic(lastUser,users,env as Env & SearchEnv);
   if(answer !== null) return sse(answer);
   const archive = shinchanArchive(lastUser,users);
   if(archive !== null) return sse(archive);
   // Ordinary free-form chat: retain existing streaming protocol.
   const aiMessages:ChatMessage[] = [{role:"system",content:SYSTEM_PROMPT},...history.slice(-12)];
   const stream = await env.AI.run(MODEL_ID,{messages:aiMessages,max_tokens:1024,temperature:0.15,stream:true});
   return new Response(stream,{headers:{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}});
  } catch(e) {
   console.error("Last Order V5", e);
   return Response.json({error:"AI or search request failed"},{status:500});
  }
 }
} satisfies ExportedHandler<Env>;
