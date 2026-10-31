
/**
 * LAST ORDER V4
 * 다국어 AI 채팅 + 음악 정보 오류 방지
 * 기존 /api/chat 및 실시간 채팅 기능 유지
 */

import type { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/qwen/qwen3-30b-a3b-fp8";

const OFFICIAL_LABEL_URL =
  "https://columbia.jp/prod-info/COCX-41902-5/";

interface VerifiedSong {
  ordinal: number;
  year: number;
  filmJa: string;
  song: string;
  artist: string;
  aliases?: string[];
  endingConfirmed?: boolean;
  endingSource?: string;
}

const SONGS: VerifiedSong[] = [
  { ordinal: 1, year: 1993, filmJa: "アクション仮面VSハイグレ魔王", song: "僕は永遠のお子様", artist: "Mew" },
  { ordinal: 2, year: 1994, filmJa: "ブリブリ王国の秘宝", song: "約束See You!", artist: "岸恭子" },
  { ordinal: 3, year: 1995, filmJa: "雲黒斎の野望", song: "たすけてケスタ", artist: "杉本幸子" },
  {
    ordinal: 4,
    year: 1996,
    filmJa: "ヘンダーランドの大冒険",
    song: "SIX COLORS BOY",
    artist: "雛形あきこ",
    aliases: ["핸더랜드", "헨더랜드"],
    endingConfirmed: true,
    endingSource:
      "https://www.uta-net.com/user/search/anime_list_2.html?tno=1272"
  },
  { ordinal: 5, year: 1997, filmJa: "暗黒タマタマ大追跡", song: "ひまわりの家", artist: "財津和夫" },
  { ordinal: 6, year: 1998, filmJa: "電撃！ブタのヒヅメ大作戦", song: "PURENESS", artist: "SHAZNA" },
  { ordinal: 7, year: 1999, filmJa: "爆発！温泉わくわく大決戦", song: "いい湯だな", artist: "野原一家＆温泉わくわく'99" },
  { ordinal: 8, year: 2000, filmJa: "嵐を呼ぶジャングル", song: "さよならありがとう", artist: "こばやしさちこ" },
  { ordinal: 9, year: 2001, filmJa: "嵐を呼ぶモーレツ！オトナ帝国の逆襲", song: "元気でいてね", artist: "こばやしさちこ" },
  { ordinal: 10, year: 2002, filmJa: "嵐を呼ぶアッパレ！戦国大合戦", song: "二中のファンタジー〜体育を休む女の子編〜", artist: "DANCE☆MAN" },
  { ordinal: 11, year: 2003, filmJa: "嵐を呼ぶ栄光のヤキニクロード", song: "こんな時こそ焼肉がある", artist: "のはら家オールスターズ" },
  { ordinal: 12, year: 2004, filmJa: "嵐を呼ぶ！夕陽のカスカベボーイズ", song: "○(マル)あげよう", artist: "NO PLAN" },
  { ordinal: 13, year: 2005, filmJa: "伝説を呼ぶブリブリ ３分ポッキリ大進撃", song: "Crayon Beats", artist: "AI" },
  { ordinal: 14, year: 2006, filmJa: "伝説を呼ぶ 踊れ！アミーゴ！", song: "GO WAY!!", artist: "倖田來未" },
  { ordinal: 15, year: 2007, filmJa: "嵐を呼ぶ 歌うケツだけ爆弾！", song: "Cry Baby", artist: "SEAMO" },
  { ordinal: 16, year: 2008, filmJa: "ちょー嵐を呼ぶ 金矛の勇者", song: "人気者で行こう！", artist: "DJ OZMA" },
  { ordinal: 17, year: 2009, filmJa: "オタケベ！カスカベ野生王国", song: "やんちゃ道", artist: "ジェロ" },
  {
    ordinal: 18,
    year: 2010,
    filmJa: "超時空！嵐を呼ぶオラの花嫁",
    song: "オメデトウ",
    artist: "mihimaru GT",
    aliases: ["나의 신부", "초시공 태풍을 부르는 나의 신부"],
    endingConfirmed: true,
    endingSource:
      "https://animemusicranking.com/ja/series/9/"
  },
  { ordinal: 19, year: 2011, filmJa: "嵐を呼ぶ黄金のスパイ大作戦", song: "イエローパンジーストリート", artist: "関ジャニ∞" },
  { ordinal: 20, year: 2012, filmJa: "嵐を呼ぶ！オラと宇宙のプリンセス", song: "少年よ 嘘をつけ！", artist: "渡り廊下走り隊7" },
  { ordinal: 21, year: 2013, filmJa: "バカうまっ！B級グルメサバイバル!!", song: "RPG", artist: "SEKAI NO OWARI" },
  { ordinal: 22, year: 2014, filmJa: "ガチンコ！逆襲のロボとーちゃん", song: "ファミリーパーティー", artist: "きゃりーぱみゅぱみゅ" },
  { ordinal: 23, year: 2015, filmJa: "オラの引越し物語〜サボテン大襲撃〜", song: "OLA!!", artist: "ゆず" },
  { ordinal: 24, year: 2016, filmJa: "爆睡！ユメミーワールド大突撃", song: "友よ 〜 この先もずっと・・・", artist: "ケツメイシ" },
  { ordinal: 25, year: 2017, filmJa: "襲来!!宇宙人シリリ", song: "ロードムービー", artist: "高橋優" },
  { ordinal: 26, year: 2018, filmJa: "爆盛！カンフーボーイズ〜拉麺大乱〜", song: "笑一笑 〜シャオイーシャオ！〜", artist: "ももいろクローバーZ" },
  { ordinal: 27, year: 2019, filmJa: "新婚旅行ハリケーン 〜失われたひろし〜", song: "ハルノヒ", artist: "あいみょん" },
  { ordinal: 28, year: 2020, filmJa: "激突！ラクガキングダムとほぼ四人の勇者", song: "ギガアイシテル", artist: "レキシ" },
  { ordinal: 29, year: 2021, filmJa: "謎メキ！花の天カス学園", song: "はしりがき", artist: "マカロニえんぴつ" },
  { ordinal: 30, year: 2022, filmJa: "もののけニンジャ珍風伝", song: "陽はまた昇るから", artist: "緑黄色社会" }
];

const SYSTEM_PROMPT = `
You are Last Order (라스트오더).

You are a friendly multilingual AI assistant.

LANGUAGE:
- Reply naturally in the user's language.
- Support Korean, English, Japanese, and Chinese.
- If the user says "한글로" or "한국어로",
  respond in Korean about the previous topic.
- Never interpret a language instruction
  as the title of a song.

ACCURACY:
- Understand the user's question and context.
- Do not invent movie titles, song titles,
  singers, composers, original lyrics, or sources.
- Never treat an earlier AI answer as verified evidence.
- If uncertain, acknowledge it instead of guessing.
- If corrected, admit the mistake.
- Never claim to have searched the internet
  unless you actually used a search tool.

MUSIC:
- Distinguish opening themes, ending themes,
  and general film theme songs.
- Never confuse works from different series.
- Interpret lyrics only when actual text is provided.
- Never create fake original lyrics.

CONVERSATION:
- Answer the user's actual question.
- Keep your responses clear and natural.
- Use the recent conversation context.
- Do not repeatedly ask irrelevant questions.
`;

type Locale = "ko" | "ja" | "zh" | "en";

function getLocale(text: string): Locale {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[ぁ-ゟ゠-ヿ]/.test(text)) return "ja";
  if (/[一-龥]/.test(text)) return "zh";
  return "en";
}

function sseAnswer(text: string): Response {
  return new Response(
    `data: ${JSON.stringify({ response: text })}\n\ndata: [DONE]\n\n`,
    {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "connection": "keep-alive"
      }
    }
  );
}

const MESSAGES = {
  ko: {
    unknown:
      "현재 신뢰할 수 있는 자료에서 해당 음악 정보를 확인하지 못했어요. 다른 작품의 곡명이나 가수를 추측해서 답하지 않을게요.",
    lyrics:
      "실제 원곡 가사를 확인하지 못했어요. 없는 가사를 만들어 보여드리지는 않을게요. 원문 가사를 직접 보내주시면 그 내용을 번역하거나 해석할 수 있어요.",
    mistake:
      "이전에 잘못된 음악 정보를 말씀드렸다면 죄송해요. 확인되지 않은 내용을 다시 만들어 답하지 않을게요.",
    composer:
      "현재 확인된 자료에는 작곡가나 작사가 정보가 없어 정확하게 말씀드릴 수 없어요."
  },
  en: {
    unknown:
      "I cannot verify the official music information from a reliable source. I won't guess another song or artist.",
    lyrics:
      "I don't have verified original lyrics and won't invent them. Please provide the lyrics you want explained.",
    mistake:
      "My earlier music information may have been incorrect. I won't invent another answer.",
    composer:
      "I cannot verify the composer or lyricist from the available source."
  },
  ja: {
    unknown:
      "信頼できる資料でその曲を確認できませんでした。曲名や歌手を推測しません。",
    lyrics:
      "原曲の歌詞を確認できないため、創作して本物として提示しません。歌詞を送っていただければ説明できます。",
    mistake:
      "以前の音楽情報に誤りがあった可能性があります。別の回答を作りません。",
    composer:
      "作詞・作曲の情報を確認できませんでした。"
  },
  zh: {
    unknown:
      "我无法从可靠来源核实这首歌的信息，不会猜测歌曲名称或歌手。",
    lyrics:
      "我没有核实的原歌词，不会编造歌词。你可以提供歌词让我解释。",
    mistake:
      "之前的音乐信息可能有误，我不会再编造答案。",
    composer:
      "目前无法核实作词或作曲信息。"
  }
};

const SHINCHAN =
  /(짱구|신짱|크레용\s*신짱|crayon\s*shin[ -]?chan|shin[ -]?chan|クレヨンしんちゃん|蜡笔小新)/i;

const MUSIC =
  /(노래|음악|가사|곡명|제목|주제가|엔딩|오프닝|극장판|영화|가수|작곡|작사|OST|song|music|lyrics|opening|ending|theme|singer|composer|歌|曲|主題歌|片尾曲|歌曲)/i;

const OTHER_WORK =
  /(이누야샤|inuyasha|犬夜叉|도라에몽|doraemon|ドラえもん|센과\s*치히로|千と千尋|지미\s*뉴트론|jimmy neutron)/i;

const KOREAN_ONLY =
  /^(한글로|한국어로|한국말로)(\s*(알려줘|알려달라고|말해줘|설명해줘|말해달라고|해줘|좀|제발|병신아|바보야))*[\s!?.,~]*$/i;

const FOLLOWUP =
  /(그\s*노래|그\s*곡|이름이\s*뭐|제목이\s*뭐|뭐냐고|누가\s*불렀|그건\s*뭐|what.*name|what.*title)/i;

const CORRECTION =
  /(틀렸|아니잖아|아닌데|없잖아|그런\s*거\s*없|지어내|거짓말|헛소리|왜\s*도라에몽|wrong|incorrect|間違|違う|不对|错了)/i;

const LYRICS_REQUEST =
  /(가사|lyrics?|歌詞|歌词)/i;

const LYRICS_ACTION =
  /(알려|보여|적어|써줘|전부|전체|번역|해석|write|show|give|full|translate|翻訳|全文|翻译|解释)/i;

const COMPOSER_REQUEST =
  /(작곡|작사|composer|lyricist|作曲|作詞|作词)/i;

const ENDING_REQUEST =
  /(엔딩|ending|エンディング|片尾)/i;

const RANGE_REQUEST =
  /1\s*(기|편|작)?\s*[-~～부터]\s*25\s*(기|편|작)?/i;

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000「」『』–—~・！!.,'"()（）-]/g, "");
}

function findMovie(text: string): VerifiedSong | undefined {
  if (RANGE_REQUEST.test(text)) return undefined;

  if (SHINCHAN.test(text)) {
    const numberMatch =
      text.match(
        /(?:극장판|영화|movie|劇場版)[^0-9]{0,18}(\d{1,2})\s*(?:기|편|탄|작)?/i
      ) ||
      text.match(
        /(\d{1,2})\s*(?:기|편|탄|작)\s*(?:극장판|영화)?/i
      );

    if (numberMatch) {
      const number = Number(numberMatch[1]);
      return SONGS.find(song => song.ordinal === number);
    }

    const yearMatch = text.match(/(?:19\d{2}|20\d{2})/);

    if (yearMatch) {
      const year = Number(yearMatch[0]);
      return SONGS.find(song => song.year === year);
    }
  }

  const value = normalize(text);

  return SONGS.find(song =>
    song.aliases?.some(alias =>
      value.includes(normalize(alias))
    ) ||
    value.includes(normalize(song.filmJa))
  );
}

function findPreviousMovie(
  userMessages: string[]
): VerifiedSong | undefined {
  const current = userMessages[userMessages.length - 1] || "";

  const direct = findMovie(current);
  if (direct) return direct;

  if (OTHER_WORK.test(current) && !SHINCHAN.test(current)) {
    return undefined;
  }

  if (!FOLLOWUP.test(current) && !CORRECTION.test(current)) {
    return undefined;
  }

  for (let i = userMessages.length - 2; i >= 0; i--) {
    const old = userMessages[i];

    if (OTHER_WORK.test(old) && !SHINCHAN.test(old)) {
      return undefined;
    }

    const movie = findMovie(old);
    if (movie) return movie;
  }

  return undefined;
}

async function checkOfficialPage(
  song: VerifiedSong
): Promise<boolean> {
  try {
    const response = await fetch(OFFICIAL_LABEL_URL, {
      method: "GET",
      headers: {
        accept: "text/html",
        "user-agent": "LastOrderAI/4.0"
      },
      signal: AbortSignal.timeout(4500)
    });

    if (!response.ok) return false;

    const html = await response.text();

    const plain = html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&");

    const normalized = normalize(plain);
    const songName = normalize(song.song);
    const index = normalized.indexOf(songName);

    if (index < 0) return false;

    const nearby = normalized.slice(index, index + 400);

    return (
      nearby.includes(normalize(song.artist)) &&
      nearby.includes(normalize(song.filmJa)) &&
      nearby.includes(String(song.year))
    );
  } catch {
    return false;
  }
}

function getSongAnswer(
  song: VerifiedSong,
  language: Locale,
  isEnding: boolean,
  checked: boolean
): string {
  const checkStatus = checked
    ? "공식 음반사 페이지와 대조했습니다."
    : "등록된 음반사 자료를 기준으로 답하며, 이번 요청에서 실시간 재확인은 완료되지 않았습니다.";

  const endingText = isEnding
    ? song.endingConfirmed
      ? "별도의 자료에서 엔딩곡으로도 확인된 항목입니다."
      : "현재 자료는 영화 주제가를 확인하며, 엔딩 장면에서 실제 사용되었는지는 확인되지 않았습니다."
    : "";

  if (language === "ko") {
    return (
      `${checkStatus}\n\n` +
      `짱구 극장판 ${song.ordinal}기 (${song.year})\n` +
      `작품: ${song.filmJa}\n` +
      `영화 주제가: ${song.song}\n` +
      `가수: ${song.artist}\n` +
      `${endingText}\n\n` +
      `출처: ${OFFICIAL_LABEL_URL}` +
      (isEnding && song.endingSource
        ? `\n엔딩곡 참고: ${song.endingSource}`
        : "")
    );
  }

  if (language === "ja") {
    return (
      `クレヨンしんちゃん映画 第${song.ordinal}作\n` +
      `作品: ${song.filmJa}\n` +
      `主題歌: ${song.song}\n` +
      `歌手: ${song.artist}\n` +
      `資料: ${OFFICIAL_LABEL_URL}`
    );
  }

  if (language === "zh") {
    return (
      `蜡笔小新剧场版第${song.ordinal}部\n` +
      `作品: ${song.filmJa}\n` +
      `主题歌: ${song.song}\n` +
      `歌手: ${song.artist}\n` +
      `来源: ${OFFICIAL_LABEL_URL}`
    );
  }

  return (
    `Crayon Shin-chan Movie #${song.ordinal}\n` +
    `Film: ${song.filmJa}\n` +
    `Theme song: ${song.song}\n` +
    `Artist: ${song.artist}\n` +
    `Source: ${OFFICIAL_LABEL_URL}`
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ready",
        service: "lastorder-ai",
        version: "verified-v4",
        model: MODEL_ID,
        catalogEntries: SONGS.length,
        fullWebSearch: false
      });
    }

    if (
      url.pathname === "/" ||
      !url.pathname.startsWith("/api/")
    ) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname !== "/api/chat") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405
      });
    }

    return handleChat(request, env);
  }
} satisfies ExportedHandler<Env>;

async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as {
      messages?: ChatMessage[];
    };

    if (!Array.isArray(body.messages)) {
      return Response.json(
        { error: "Invalid messages" },
        { status: 400 }
      );
    }

    const history: ChatMessage[] = body.messages
      .filter(
        (message): message is ChatMessage =>
          !!message &&
          (message.role === "user" ||
           message.role === "assistant") &&
          typeof message.content === "string"
      )
      .slice(-20)
      .map(message => ({
        role: message.role,
        content: message.content.slice(0, 3500)
      }));

    const lastUser = [...history]
      .reverse()
      .find(message => message.role === "user")
      ?.content.trim() || "";

    if (!lastUser) {
      return Response.json(
        { error: "Empty message" },
        { status: 400 }
      );
    }

    const language = getLocale(lastUser);

    const users = history
      .filter(message => message.role === "user")
      .map(message => message.content);

    // 1. "한글로" 같은 후속 요청 처리
    if (KOREAN_ONLY.test(lastUser)) {
      const previousUsers = users.slice(0, -1);

      const previousQuestion =
        previousUsers[previousUsers.length - 1] || "";

      const previousMovie = findPreviousMovie([
        ...previousUsers,
        "그 노래 이름이 뭐냐고"
      ]);

      if (
        previousMovie &&
        !RANGE_REQUEST.test(previousQuestion)
      ) {
        const checked = await checkOfficialPage(
          previousMovie
        );

        return sseAnswer(
          getSongAnswer(
            previousMovie,
            "ko",
            ENDING_REQUEST.test(previousQuestion),
            checked
          )
        );
      }

      if (
        previousUsers.some(text =>
          /(이누야샤|inuyasha|犬夜叉)/i.test(text)
        )
      ) {
        return sseAnswer(
          "한국어로 설명할게요. 이누야샤에는 여러 오프닝곡이 있습니다. 현재 검증된 공식 목록이 없어 곡명이나 가수를 추측하지 않겠습니다."
        );
      }

      if (previousUsers.some(text => MUSIC.test(text))) {
        return sseAnswer(
          "한국어로 다시 설명할게요. 앞에서 확인되지 않은 음악 정보는 사실로 취급하지 않겠습니다. 정확한 작품이나 노래를 알려주시면 확인된 자료를 기준으로 답하겠습니다."
        );
      }

      return sseAnswer(
        "네, 앞으로 한국어로 답하겠습니다."
      );
    }

    // 2. 1기~25기 전체 목록
    if (
      SHINCHAN.test(lastUser) &&
      RANGE_REQUEST.test(lastUser)
    ) {
      const lines = SONGS
        .filter(song => song.ordinal <= 25)
        .map(
          song =>
            `${song.ordinal}기 (${song.year}) - ` +
            `${song.song} / ${song.artist}`
        );

      return sseAnswer(
        "짱구 극장판 1기부터 25기까지의 영화 주제가 목록입니다. 모든 곡의 엔딩 장면 사용 여부까지 확인된 것은 아닙니다.\n\n" +
        lines.join("\n") +
        "\n\n출처: " + OFFICIAL_LABEL_URL
      );
    }

    // 3. 원문 없는 가사 생성 차단
    const wantsLyrics =
      LYRICS_REQUEST.test(lastUser) &&
      LYRICS_ACTION.test(lastUser);

    const userSuppliedLyrics =
      lastUser.includes("\n") &&
      lastUser.length >= 90;

    if (wantsLyrics && !userSuppliedLyrics) {
      return sseAnswer(MESSAGES[language].lyrics);
    }

    const movie = findPreviousMovie(users);

    // 4. 잘못된 답변을 지적한 경우
    if (CORRECTION.test(lastUser)) {
      return sseAnswer(
        MESSAGES[language].mistake
      );
    }

    // 5. 확인된 짱구 극장판 정보
    if (
      movie &&
      (MUSIC.test(lastUser) ||
       FOLLOWUP.test(lastUser))
    ) {
      if (COMPOSER_REQUEST.test(lastUser)) {
        return sseAnswer(
          MESSAGES[language].composer
        );
      }

      const checked = await checkOfficialPage(movie);

      return sseAnswer(
        getSongAnswer(
          movie,
          language,
          ENDING_REQUEST.test(lastUser),
          checked
        )
      );
    }

    // 6. 검증되지 않은 애니메이션 음악
    if (
      OTHER_WORK.test(lastUser) &&
      MUSIC.test(lastUser)
    ) {
      return sseAnswer(MESSAGES[language].unknown);
    }

    // 7. 기타 음악 정보는 추측 방지
    if (MUSIC.test(lastUser)) {
      return sseAnswer(MESSAGES[language].unknown);
    }

    // 8. 일반적인 질문은 Qwen3 AI가 응답
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      ...history.slice(-12)
    ];

    const stream = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
        temperature: 0.15,
        stream: true
      }
    );

    return new Response(stream, {
      headers: {
        "content-type":
          "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "connection": "keep-alive"
      }
    });
  } catch (error) {
    console.error("Last Order V4 error:", error);

    return Response.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}
