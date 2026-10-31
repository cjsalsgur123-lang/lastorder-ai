/**
 * LAST ORDER V3 — VERIFIED MUSIC ANSWERS
 * Replacement for cjsalsgur123-lang/lastorder-ai/src/index.ts
 * Keeps /api/chat streaming SSE and ASSETS, no APK changes.
 *
 * Verification approach:
 *  - Work ID (series + ordinal) is matched in code, never guessed by AI.
 *  - Official Japanese record-label catalog is the controlled evidence store.
 *  - The official source can be checked live. A failed check must NOT be
 *    described as a successful live check.
 *  - Music credits are returned deterministically, never written by the LLM.
 *  - Unknown/unmatched works receive an explicit unverifiable message.
 *  - Follow-up references are resolved from USER messages, never invented AI replies.
 *
 * Source catalog: Nippon Columbia, COCX-41902-5 (1993–2022 film theme songs)
 * https://columbia.jp/prod-info/COCX-41902-5/
 * MIT-based Cloudflare chat template.
 */
import type { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/qwen/qwen3-30b-a3b-fp8";
const OFFICIAL_LABEL_URL = "https://columbia.jp/prod-info/COCX-41902-5/";
const OFFICIAL_4_ED_URL = "https://www.uta-net.com/user/search/anime_list_2.html?tno=1272";
const OFFICIAL_18_ED_URL = "https://animemusicranking.com/ja/series/9/";
const OFFICIAL_4_MOVIE = "https://www.shinchan-app.jp/anime/detail/movie-004/";
const OFFICIAL_18_MOVIE = "https://www.shinchan-app.jp/anime/detail/movie-018/";

// These pairs were checked against a record-label track listing. The label
// confirms a FILM THEME SONG, which is not necessarily proof of end-credit use.
interface VerifiedSong {
  ordinal: number;
  year: number;
  filmJa: string;
  song: string;
  artist: string;
  aliases?: string[];
  endingConfirmed?: boolean;
  endingSource?: string;
  movieSource?: string;
}
const SONGS: VerifiedSong[] = [
  {ordinal:1,year:1993,filmJa:"アクション仮面VSハイグレ魔王",song:"僕は永遠のお子様",artist:"Mew"},
  {ordinal:2,year:1994,filmJa:"ブリブリ王国の秘宝",song:"約束See You!",artist:"岸恭子"},
  {ordinal:3,year:1995,filmJa:"雲黒斎の野望",song:"たすけてケスタ",artist:"杉本幸子"},
  {ordinal:4,year:1996,filmJa:"ヘンダーランドの大冒険",song:"SIX COLORS BOY",artist:"雛形あきこ",aliases:["핸더랜드","헨더랜드","핸더랜드의 대모험"],endingConfirmed:true,endingSource:OFFICIAL_4_ED_URL,movieSource:OFFICIAL_4_MOVIE},
  {ordinal:5,year:1997,filmJa:"暗黒タマタマ大追跡",song:"ひまわりの家",artist:"財津和夫"},
  {ordinal:6,year:1998,filmJa:"電撃！ブタのヒヅメ大作戦",song:"PURENESS",artist:"SHAZNA"},
  {ordinal:7,year:1999,filmJa:"爆発！温泉わくわく大決戦",song:"いい湯だな",artist:"野原一家＆温泉わくわく'99"},
  {ordinal:8,year:2000,filmJa:"嵐を呼ぶジャングル",song:"さよならありがとう",artist:"こばやしさちこ"},
  {ordinal:9,year:2001,filmJa:"嵐を呼ぶモーレツ！オトナ帝国の逆襲",song:"元気でいてね",artist:"こばやしさちこ"},
  {ordinal:10,year:2002,filmJa:"嵐を呼ぶアッパレ！戦国大合戦",song:"二中のファンタジー〜体育を休む女の子編〜",artist:"DANCE☆MAN"},
  {ordinal:11,year:2003,filmJa:"嵐を呼ぶ栄光のヤキニクロード",song:"こんな時こそ焼肉がある",artist:"のはら家オールスターズ"},
  {ordinal:12,year:2004,filmJa:"嵐を呼ぶ！夕陽のカスカベボーイズ",song:"○(マル)あげよう",artist:"NO PLAN"},
  {ordinal:13,year:2005,filmJa:"伝説を呼ぶブリブリ ３分ポッキリ大進撃",song:"Crayon Beats",artist:"AI"},
  {ordinal:14,year:2006,filmJa:"伝説を呼ぶ 踊れ！アミーゴ！",song:"GO WAY!!",artist:"倖田來未"},
  {ordinal:15,year:2007,filmJa:"嵐を呼ぶ 歌うケツだけ爆弾！",song:"Cry Baby",artist:"SEAMO"},
  {ordinal:16,year:2008,filmJa:"ちょー嵐を呼ぶ 金予の勇者",song:"人気者で行こう！",artist:"DJ OZMA"},
  {ordinal:17,year:2009,filmJa:"オタケベ！カスカベ野生王国",song:"やんちゃ道",artist:"ジェロ"},
  {ordinal:18,year:2010,filmJa:"超時空！嵐を呼ぶオラの花嫁",song:"オメデトウ",artist:"mihimaru GT",aliases:["나의 신부","나의 신부 극장판","초시공 태풍을 부르는 나의 신부"],endingConfirmed:true,endingSource:OFFICIAL_18_ED_URL,movieSource:OFFICIAL_18_MOVIE},
  {ordinal:19,year:2011,filmJa:"嵐を呼ぶ黄金のスパイ大作戦",song:"イエローパンジーストリート",artist:"関ジャ二∞"},
  {ordinal:20,year:2012,filmJa:"嵐を呼ぶ！オラと宇宙のプリンセス",song:"少年よ　嘘をつけ！",artist:"渡り廊下走り隊７"},
  {ordinal:21,year:2013,filmJa:"バカうまっ！ B級グルメサバイバル!!",song:"RPG",artist:"SEKAI NO OWARI"},
  {ordinal:22,year:2014,filmJa:"ガチンコ！逆襲のロボと一ちゃん",song:"ファミリーパーティー",artist:"きゃりーぱみゅぱみゅ"},
  {ordinal:23,year:2015,filmJa:"オラの引越し物語〜サボテン大襲撃〜",song:"OLA!!",artist:"ゆず"},
  {ordinal:24,year:2016,filmJa:"爆睡！ユメミーワールド大突撃",song:"友よ 〜 この先もずっと・・・",artist:"ケツメイシ"},
  {ordinal:25,year:2017,filmJa:"襲来!!宇宙人シリリ",song:"ロードムービー",artist:"高橋優"},
  {ordinal:26,year:2018,filmJa:"爆盛！カンフーボーイズ〜拉麺大乱〜",song:"笑一笑 〜シャオイーシャオ！〜",artist:"ももいろクローバーZ"},
  {ordinal:27,year:2019,filmJa:"新婚旅行ハリケーン 〜失われたひろし〜",song:"ハルノヒ",artist:"あいみょん"},
  {ordinal:28,year:2020,filmJa:"激突！　ラクガキングダムとほぼ四人の勇者",song:"ギガアイシテル",artist:"レキシ"},
  {ordinal:29,year:2021,filmJa:"謎メキ！花の天カス学園",song:"はしりがき",artist:"マカロニえんぴつ"},
  {ordinal:30,year:2022,filmJa:"もののけニンジャ珍風伝",song:"陽はまた昇るから",artist:"緑黄色社会"},
];

const SYSTEM_PROMPT = `You are Last Order (라스트오더), a multilingual assistant. Answer in the language of the user's message. Keep facts and creative writing separate. Never claim to have searched or checked sources unless verified sources were provided. Do not invent real song lyrics, theme songs, artists or film credits. Previously generated assistant messages are not evidence; acknowledge uncertainty and mistakes instead of guessing. You may translate text supplied by the user. Reply naturally and concisely.`;

type Locale = "ko" | "ja" | "zh" | "en";
function locale(text: string): Locale {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[ぁ-ゟ゠-ヿ]/.test(text)) return "ja";
  if (/[一-龥]/.test(text)) return "zh";
  return "en";
}
function answer(text: string): Response {
  return new Response(`data: ${JSON.stringify({response:text})}\n\ndata: [DONE]\n\n`, {
    headers: {"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}
  });
}
const REPLIES: Record<Locale,{unknown:string; lyrics:string; mistake:string; composer:string; mismatch:string}> = {
  ko:{unknown:"신뢰할 수 있는 공식 자료에서 해당 곡을 확인하지 못했습니다. 다른 작품의 곡명이나 가수를 추측해서 답하지 않을게요. 정확한 작품명·연도 또는 공식 링크가 필요합니다.",lyrics:"정확한 원곡 가사를 확보하지 못했습니다. 실제 노래 가사를 만들어서 제시하지 않을게요. 가사 일부를 직접 보내주시면 그 부분을 해석하거나 번역할 수 있어요.",mistake:"이전 답변에 확인되지 않은 작품이나 곡이 섞인 것은 잘못입니다. 이전 AI 답변은 근거로 사용하지 않을게요.",composer:"작곡가·작사가 정보는 현재 확인된 공식 음반사 목록에 없어서 단정할 수 없습니다. 확인되지 않은 이름을 만들어내지 않을게요.",mismatch:"요청한 영화와 검색된 작품이 다르므로 답변을 보류했습니다."},
  ja:{unknown:"信頼できる公式資料でこの曲を確認できませんでした。別の作品の曲名を推測しません。正確な作品名・公開年か公式リンクを教えてください。",lyrics:"正確な原曲の歌詞を確認できません。創作した歌詞を本物として提示しません。歌詞の一部を送っていただければ解説できます。",mistake:"前の回答には未確認の情報が混ざっていた可能性があります。以前のAI回答は証拠として扱いません。",composer:"作詞・作曲の資料は確認できません。根拠のない名前は挙げません。",mismatch:"指定された作品と検索結果が異なるため、回答を保留しました。"},
  zh:{unknown:"无法通过可靠的官方资料核实这首歌曲。我不会猜测其他作品的歌曲。请提供准确的作品名、年份或官方链接。",lyrics:"我没有核实的原歌词，不会编造歌词。你可以提供一小段歌词让我解释或翻译。",mistake:"之前的回答可能混入了未经核实的信息。我不会把过去的AI回答当作证据。",composer:"目前的官方唱片目录没有提供作词或作曲资料，我不会猜测。",mismatch:"搜索到的作品与所问作品不一致，因此不作推测。"},
  en:{unknown:"I couldn't verify this song against a reliable official source. I won't guess the track for a different work. Please provide the exact film title, year or official link.",lyrics:"I don't have verified original lyrics and won't invent them. Paste an excerpt and I can translate or explain that text.",mistake:"My earlier answers may have included unsupported work or song details. I won't treat prior AI answers as evidence.",composer:"The verified record-label listing doesn't establish the songwriter or composer. I won't guess a name.",mismatch:"The retrieved work does not match the requested film, so I won't guess."},
};

const SERIES = /(짱구|신짱|크레용\s*신짱|crayon\s*shin[ -]?chan|shin[ -]?chan|クレヨンしんちゃん|蜡笔小新|蠟筆小新)/i;
const SONG_FACT = /(엔딩|오프닝|주제가|ost\b|곡명|곡 제목|노래 제목|노래 이름|그 노래|제목|가수|누가 부|작곡|작사|부른|영화.*노래|극장판|영화|노래|음악|soundtrack|ending|opening|theme song|song name|singer|composer|lyrics?|主題歌|曲名|歌手|作曲|作詞|歌|片尾曲|主题曲|歌曲|歌手|电影)/i;
const NAME_FOLLOWUP = /(이름이\s*뭐|제목이\s*뭐|뭐냐고|그\s*곡|그\s*노래|몇\s*기|뭘\s*부른|누가\s*불|그건\s*뭐|what (?:is|was) (?:its|the) (?:name|song|title)|曲名は|歌名是)/i;
const CHALLENGE = /(틀렸|아니잖|아닌데|없잖아|그런\s*거\s*없|왜\s*도라에몽|왜\s*다른|헛소리|지어내|거짓|wrong|not true|incorrect|違う|間違|不对|错了)/i;
const LYRICS_REQUEST = /(?:가사|lyrics?|歌詞|歌词)/i;
const LYRICS_ACTION = /(보여|알려|원문|전부|전체|적어|써줘|해석|번역|풀어|translate|explain|write|give|show|full|意味|教え|翻訳|解释|翻译|给我|全文)/i;
const COMPOSER_REQUEST = /(작곡|작사|composer|written by|lyricist|作曲|作詞|作词)/i;
const ENDING_REQUEST = /(엔딩|ending|エンディング|片尾)/i;
const OTHER_TOPIC = /(도라에몽|doraemon|ドラえもん|多啦A梦|센과\s*치히로|千と千尋|spirited away|지미\s*뉴트론|jimmy neutron|마녀\s*배달부)/i;

function normalize(s:string):string {return s.normalize("NFKC").toLowerCase().replace(/[\s\u3000「」『』–—~・！!.,'"()（）-]/g, "");}
function explicitMovieNo(text:string):number|undefined {
  // The ordinal alone is not enough: it must be tied to this specific series.
  if (!SERIES.test(text)) return undefined;
  const n = text.match(/(?:극장판|영화|movie|劇場版|映画)[^0-9]{0,18}(\d{1,2})\s*(?:기|편|탄|작|번째|作|st|nd|rd|th)?/i)
    || text.match(/(\d{1,2})\s*(?:기|편|탄|작|번째|作|st|nd|rd|th)\s*(?:극장판|영화|movie|劇場版|映画)?/i);
  const number = n ? Number(n[1]) : undefined;
  return number && number >= 1 && number <= 99 ? number : undefined;
}
function mentionedMovie(text:string):VerifiedSong|undefined {
  const ord=explicitMovieNo(text);
  if (ord !== undefined) return SONGS.find(s=>s.ordinal===ord);
  if (SERIES.test(text)) {
    const yr=text.match(/(?:19\d{2}|20\d{2})\s*년?/);
    if (yr) return SONGS.find(s=>s.year===Number(yr[0].match(/\d{4}/)?.[0]));
  }
  const normalized=normalize(text);
  return SONGS.find(s=>s.aliases?.some(a=>normalized.includes(normalize(a))) ||
    (s.filmJa.length>5 && normalized.includes(normalize(s.filmJa))) ||
    (SERIES.test(text) && s.song.length>=5 && normalized.includes(normalize(s.song))));
}
function topicFromUserHistory(userMessages:string[]):VerifiedSong|undefined {
  // Ignore the assistant's hallucinated text. Current explicit context wins.
  const current=userMessages[userMessages.length-1]||"";
  const own=mentionedMovie(current);
  if (own) return own;
  // Asking about a different named franchise means DO NOT carry old Shin-chan context.
  if (OTHER_TOPIC.test(current) && !SERIES.test(current) && !CHALLENGE.test(current)) return undefined;
  // Likewise a quoted standalone other song may be a new target, not a follow-up.
  if (/(언제나\s*몇\s*번이라도|always\s*with\s*me|いつも何度でも)/i.test(current)) return undefined;
  // Carry forward only for explicit conversational follow-ups.
  if (!NAME_FOLLOWUP.test(current) && !CHALLENGE.test(current) && !/^(그럼|그러면|그런데|그래서|왜\s*없|아니|그건)/.test(current)) return undefined;
  for (let i=userMessages.length-2;i>=0;i--) {
    const old=userMessages[i];
    if (OTHER_TOPIC.test(old) && !SERIES.test(old)) return undefined;
    const movie=mentionedMovie(old);
    if (movie) return movie;
  }
  return undefined;
}

// A local approved record is never called "live-checked" unless this actual request
// verifies the record label page. Cached checks are intentionally NOT used.
async function confirmOfficial(record:VerifiedSong):Promise<boolean> {
  try {
    const r=await fetch(OFFICIAL_LABEL_URL,{method:"GET",headers:{"accept":"text/html","user-agent":"LastOrderAI/3.0 (+https://github.com/cjsalsgur123-lang/lastorder-ai)"},signal:AbortSignal.timeout(4500)});
    if(!r.ok) return false;
    const html=await r.text();
    if(html.length>600000) return false;
    const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]*>/g," ")
      .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&")
      .replace(/&quot;/gi,'"');
    const p=normalize(plain), song=normalize(record.song), film=normalize(record.filmJa);
    const at=p.indexOf(song);
    // Nearby track, singer, film, and year must ALL agree; unrelated hits rejected.
    if(at<0) return false;
    const near=p.slice(at,at+400);
    return near.includes(normalize(record.artist)) && near.includes(film) && near.includes(String(record.year));
  } catch{return false;}
}

function knownAnswer(record:VerifiedSong, lang:Locale, wantsEnding:boolean, checkedNow:boolean):string {
  const sourceLine = lang === "ko" ? "공식 음반사 수록곡 목록" : lang === "ja" ? "公式レコード会社の収録曲一覧" : lang === "zh" ? "唱片公司官方曲目表" : "Official record-label track listing";
  const prefix = checkedNow ? (lang==="ko"?"지금 공식 페이지와 대조해 확인했습니다.":lang==="ja"?"公式ページと照合して確認しました。":lang==="zh"?"已与官方网页核对。":"Checked against the live official page.")
    : (lang==="ko"?"사전에 확인된 공식 음반사 목록을 기준으로 답합니다. 현재 실시간 재확인은 완료되지 않았습니다.":lang==="ja"?"確認済みの公式収録曲一覧に基づきます。現在のライブ再照合は未完了です。":lang==="zh"?"依据此前核对过的官方曲目表；目前未完成实时复核。":"Using a previously reviewed official track list; live re-check is unavailable.");
  const title=`${record.filmJa} (${record.year})`;
  const ending= wantsEnding ? (record.endingConfirmed ?
    (lang==="ko"?"엔딩곡으로 별도 자료에서도 확인됐습니다.":lang==="ja"?"エンディング曲としても別資料で確認されています。":lang==="zh"?"另有资料证明其为片尾曲。":"A separate reference also identifies this as the ending song.") :
    (lang==="ko"?"단, 현재 출처는 영화 주제가까지만 확인하며 엔딩 장면 사용 여부는 별도로 확인되지 않았습니다.":lang==="ja"?"ただし、エンディングでの使用までは現在の資料から確認できません。":lang==="zh"?"但现有资料只确认电影主题曲，未证实片尾使用。":"The sources confirm it as a film theme song, not necessarily the end-credits track.")) : "";
  if(lang==="ko") return `${prefix}\n\n짱구 극장판 ${record.ordinal}기: ${title}\n영화 주제가: ${record.song}\n가수: ${record.artist}\n${ending}\n\n출처 (${sourceLine}): ${OFFICIAL_LABEL_URL}${record.endingConfirmed && wantsEnding ? "\n엔딩곡 참고: "+record.endingSource : ""}${record.movieSource?"\n영화 공식 작품 정보: "+record.movieSource:""}`;
  if(lang==="ja") return `${prefix}\n\nクレヨンしんちゃん映画 第${record.ordinal}作: ${title}\n映画主題歌: ${record.song}\n歌手: ${record.artist}\n${ending}\n\n${sourceLine}: ${OFFICIAL_LABEL_URL}${record.endingConfirmed && wantsEnding?"\nエンディングの参考: "+record.endingSource:""}`;
  if(lang==="zh") return `${prefix}\n\n蜡笔小新剧场版第${record.ordinal}部: ${title}\n电影主题歌: ${record.song}\n演唱: ${record.artist}\n${ending}\n\n${sourceLine}: ${OFFICIAL_LABEL_URL}${record.endingConfirmed && wantsEnding?"\n片尾曲参考: "+record.endingSource:""}`;
  return `${prefix}\n\nCrayon Shin-chan movie #${record.ordinal}: ${title}\nFilm theme song: ${record.song}\nSinger: ${record.artist}\n${ending}\n\n${sourceLine}: ${OFFICIAL_LABEL_URL}${record.endingConfirmed && wantsEnding?"\nEnding reference: "+record.endingSource:""}`;
}

function userProvidedLyrics(text:string):boolean {
  // Only user-submitted lines (not an earlier assistant's fabricated lyrics).
  return /(?:가사|lyrics|歌詞|歌词)\s*[:：]\s*\n\s*\S{2,}/i.test(text) ||
    (text.includes("\n") && text.split("\n").filter(s=>s.trim().length>=8).length>=3 && text.length>=90);
}

export default {
  async fetch(request:Request,env:Env,_ctx:ExecutionContext):Promise<Response> {
    const url=new URL(request.url);
    if(url.pathname==="/api/health") return Response.json({status:"ready",service:"lastorder-ai",version:"verified-v3",catalogEntries:SONGS.length,model:MODEL_ID,sourcePolicy:"official-curated-with-live-check",fullWebSearch:false});
    if(url.pathname==="/" || !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if(url.pathname!=="/api/chat") return new Response("Not found",{status:404});
    if(request.method!=="POST") return new Response("Method not allowed",{status:405});
    return chat(request,env);
  }
} satisfies ExportedHandler<Env>;

async function chat(request:Request,env:Env):Promise<Response> {
  try {
    const payload=await request.json() as {messages?:ChatMessage[]};
    if(!Array.isArray(payload?.messages)) return Response.json({error:"messages must be an array"},{status:400});
    const history:ChatMessage[]=payload.messages
      .filter((m):m is ChatMessage=>!!m && (m.role==="user"||m.role==="assistant") && typeof m.content==="string")
      .slice(-20).map(m=>({role:m.role,content:m.content.slice(0,3500)}));
    const lastUser=[...history].reverse().find(m=>m.role==="user")?.content.trim()||"";
    if(!lastUser) return Response.json({error:"missing user message"},{status:400});
    const lang=locale(lastUser);
    const userMessages=history.filter(m=>m.role==="user").map(m=>m.content);
    const topic=topicFromUserHistory(userMessages);
    const lyricRequest=LYRICS_REQUEST.test(lastUser)&&LYRICS_ACTION.test(lastUser);
    const hasLyrics=userProvidedLyrics(lastUser);

    // Rule 3: no hallucinated lyrics. The user must supply text.
    if(lyricRequest&&!hasLyrics) return answer(REPLIES[lang].lyrics);

    // Rules 1+5: correct movie based on user's own messages, including follow-ups.
    // Rule 4: no newly guessed titles when a user points out a mistake.
    if(CHALLENGE.test(lastUser)) {
      return answer(REPLIES[lang].mistake + (topic ? "\n\n"+knownAnswer(topic,lang,ENDING_REQUEST.test(userMessages.join(" ")),await confirmOfficial(topic)):""));
    }

    // Rules 1, 2, 3: strict verified catalog for music facts. No model generated credits.
    if(topic && (SONG_FACT.test(lastUser)||NAME_FOLLOWUP.test(lastUser))) {
      if(COMPOSER_REQUEST.test(lastUser)) return answer(REPLIES[lang].composer);
      return answer(knownAnswer(topic,lang,ENDING_REQUEST.test(lastUser),await confirmOfficial(topic)));
    }
    const factQuestion=SONG_FACT.test(lastUser) &&
      (/(뭐|누구|알려|이름|제목|확인|몇|정보|who|what|which|name|title|identify|主題歌|歌|歌曲|名字|哪|谁|曲)/i.test(lastUser) || OTHER_TOPIC.test(lastUser));
    if(factQuestion) return answer(REPLIES[lang].unknown);

    // Non-factual general conversation may still use the multilingual model.
    // For general discussions, it is not a verified knowledge service.
    const messages:ChatMessage[]=[
      {role:"system",content:SYSTEM_PROMPT},
      ...history.slice(-12)
    ];
    const stream=await env.AI.run(MODEL_ID,{messages,max_tokens:1024,temperature:0.15,stream:true});
    return new Response(stream,{headers:{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store","connection":"keep-alive"}});
  } catch(e) {
    console.error("Last Order V3 request error",e);
    return Response.json({error:"AI request failed"},{status:500});
  }
}
