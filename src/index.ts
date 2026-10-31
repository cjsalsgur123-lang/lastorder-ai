/**
 * Last Order multilingual chat - factual safety patch.
 * Keeps the existing /api/chat SSE protocol and Cloudflare ASSETS route.
 * Based on the original Cloudflare chat template (@license MIT).
 */
import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/qwen/qwen3-30b-a3b-fp8";

const SYSTEM_PROMPT = `
You are Last Order (라스트오더), a helpful, multilingual assistant.
Respond naturally in the user's current language (Korean, English, Chinese, Japanese, etc.).

CRITICAL FACTUAL RELIABILITY RULES:
- You have no built-in live internet search. Do not say you verified or looked up a claim unless source notes are supplied in the current request.
- Prior assistant messages may contain mistakes. Never treat them as proof, even when they are repeated confidently. If the user challenges an earlier answer, acknowledge the possible error; do not produce another unverified name.
- Never fabricate song lyrics, song credits, ending themes, openings, movie facts, artist names, composers, titles, or source links. Invented examples are allowed ONLY when explicitly labeled fictional and requested.
- If asked for the real lyrics of a named song, never compose plausible lyrics and present them as real. If lyrics are not supplied by the user, explain that you cannot reliably retrieve the real lyrics. For translation or interpretation, ask the user to provide the text.
- If you receive Wikipedia source notes, use them only for facts EXPLICITLY supported by the notes. Check whether the source is actually about the requested song/movie; an unrelated search hit is not evidence. Provide its real URL for specific factual claims. If no relevant evidence is available, clearly say that you cannot verify the facts.
- Do not fabricate quotes or references. Never present an invented verse or interpretation as an original song lyric.
- Keep answers clear and direct; do not become defensive when corrected. Avoid excessive assurances and repetition.
- Don't claim any app functionality or internet connection you haven't actually used.
`;

function sseText(message: string): Response {
  return new Response(
    `data: ${JSON.stringify({ response: message })}\n\ndata: [DONE]\n\n`,
    { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" } },
  );
}

function localeFor(text: string): "ko" | "ja" | "zh" | "en" {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[ぁ-ゟ゠-ヿ]/.test(text)) return "ja";
  if (/[一-龥]/.test(text)) return "zh";
  return "en";
}

function messageFor(lang: ReturnType<typeof localeFor>, kind: "lyrics" | "verify" | "correction"): string {
  const notices = {
    ko: {
      lyrics: "실제 노래 가사를 확인할 수 없는 상태라서 가사를 지어내서 알려드리지 않겠습니다. 가사 원문 일부를 보내주시면 그 내용을 한국어로 해석하거나 번역해 드릴게요.",
      verify: "이 노래의 공식 정보를 확인할 만한 출처를 찾지 못했습니다. 제목이나 가수, 작곡가를 추측해서 말씀드리지 않을게요. 정확한 곡명이나 공식 링크를 보내주시면 그 자료를 바탕으로 설명할 수 있어요.",
      correction: "제가 앞서 확인하지 않은 정보를 사실처럼 말씀드렸을 수 있어요. 그 답변은 신뢰하지 말아 주세요. 증거 없이 다른 제목이나 가사를 다시 지어내지 않겠습니다.",
    },
    en: {
      lyrics: "I don't have verified lyrics for that song, so I won't make them up. If you paste an excerpt, I can explain or translate that text.",
      verify: "I couldn't verify that song's official details with a reliable source. I won't guess the title, singer, or composer. Please share an official link or more details.",
      correction: "My earlier answer may have stated unverified information as fact. Please don't rely on it. I won't invent a different title or lyrics to replace it.",
    },
    ja: {
      lyrics: "その曲の正確な歌詞を確認できないため、歌詞を創作して本物として提示しません。歌詞の一部を送っていただければ、その文章を解説・翻訳できます。",
      verify: "その曲の公式情報を信頼できる資料で確認できませんでした。曲名や歌手、作曲者を推測して断定しません。公式リンクなどがあれば確認の助けになります。",
      correction: "以前の回答に未確認の情報が含まれていた可能性があります。根拠のない別の曲名や歌詞を作りません。",
    },
    zh: {
      lyrics: "我目前无法核实这首歌的真实歌词，因此不会编造歌词并当作原文。如果你提供一小段歌词，我可以解释或翻译。",
      verify: "我未能从可靠来源核实这首歌的官方资料，不会猜测歌名、歌手或作曲者。你可以提供官方链接以便进一步确认。",
      correction: "我之前可能把未经核实的信息当成事实。请不要依赖那条回答，我不会再编造其他歌名或歌词。",
    },
  } as const;
  return notices[lang][kind];
}

// Avoid inventing real, unsupplied song lyrics as a server-level guardrail.
function requestsUnsuppliedLyrics(text: string): boolean {
  const mention = /(가사|lyrics?\b|歌詞|歌词)/i.test(text);
  const request = /(알려|보여|적어|써줘|작성|원문|해석|번역|전부|전체|full|give|show|write|translate|interpret|意味|翻訳|教え|見せ|全文|全部|翻译|解释|给我|写出)/i.test(text);
  return mention && request;
}

function isMusicFactQuestion(text: string): boolean {
  return /(엔딩곡|오프닝곡|주제가|작곡|작사|가수|부른 곡|원곡|곡명|노래 제목|사운드트랙|OST\b|ending theme|opening theme|soundtrack|composer|lyricist|artist|singer|主題歌|片尾曲|片头曲|歌手|作曲|作词|歌名)/i.test(text);
}

interface WikiPage { pageid?: number; title?: string; extract?: string; }
interface WikiResponse { query?: { pages?: WikiPage[] }; }

/** Searches free Wikipedia article summaries. This is limited-source verification,
 * NOT a general web search. Missing/unrelated results must never be invented. */
async function wikipediaEvidence(query: string, language: ReturnType<typeof localeFor>): Promise<string[]> {
  const lang = language === "zh" ? "zh" : language;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query.slice(0, 140),
    gsrlimit: "3",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    exchars: "700",
    redirects: "1",
    format: "json",
    formatversion: "2",
  });
  try {
    const response = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params.toString()}`, {
      headers: {
        "accept": "application/json",
        "user-agent": "LastOrderAI/1.0 (https://github.com/cjsalsgur123-lang/lastorder-ai)",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];
    const result = (await response.json()) as WikiResponse;
    return (result.query?.pages || [])
      .filter((p) => p.pageid && p.title && p.extract)
      .map((p) => `제목: ${p.title}\n내용: ${p.extract!.slice(0, 700)}\n출처: https://${lang}.wikipedia.org/?curid=${p.pageid}`);
  } catch {
    return [];
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    if (url.pathname !== "/api/chat") return new Response("Not found", { status: 404 });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    return handleChatRequest(request, env);
  },
} satisfies ExportedHandler<Env>;

async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  try {
    const parsed = (await request.json()) as { messages?: ChatMessage[] };
    if (!Array.isArray(parsed.messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400, headers: { "content-type": "application/json" } });
    }

    // Never allow a client-supplied system message to replace the server's rules.
    const chatHistory: ChatMessage[] = parsed.messages
      .filter((m): m is ChatMessage => !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-16)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2500) }));
    const lastUser = [...chatHistory].reverse().find((m) => m.role === "user")?.content?.trim() || "";
    if (!lastUser) return new Response(JSON.stringify({ error: "Empty message" }), { status: 400, headers: { "content-type": "application/json" } });
    const language = localeFor(lastUser);

    // A user-provided excerpt is okay to analyze; model-generated prior lyrics are NOT evidence.
    const userSuppliedExcerpt = chatHistory.some((m) => m.role === "user" && m.content.length > 90 && m.content.includes("\n"));
    if (requestsUnsuppliedLyrics(lastUser) && !userSuppliedExcerpt) {
      return sseText(messageFor(language, "lyrics"));
    }

    // An explicit correction of previous answers must not trigger new guesses.
    if (/^(그런\s*거\s*없|없잖아|틀렸|거짓|뻥|지어내|그거\s*아니|아닌데|wrong\b|that's not true|違う|間違|不对|错了)/i.test(lastUser)) {
      return sseText(messageFor(language, "correction"));
    }

    const factualMusic = isMusicFactQuestion(lastUser);
    const sourceNotes = factualMusic ? await wikipediaEvidence(lastUser, language) : [];
    if (factualMusic && sourceNotes.length === 0) {
      return sseText(messageFor(language, "verify"));
    }

    const sourceInstruction = sourceNotes.length > 0
      ? `\nLIMITED LIVE SOURCES: Wikipedia article summaries below. These are search results, NOT guaranteed to be relevant. Treat unrelated results as no evidence. Cite a source URL only if it directly supports your claim. Never reconstruct lyrics.\n${sourceNotes.join("\n\n")}`
      : "";
    // For music facts, prior AI hallucinations are excluded from context.
    const safeHistory = factualMusic ? chatHistory.filter((m) => m.role === "user") : chatHistory;
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT + sourceInstruction },
      ...safeHistory,
    ];
    const stream = await env.AI.run(MODEL_ID, { messages, max_tokens: 1200, temperature: 0.1, stream: true });
    return new Response(stream, {
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" },
    });
  } catch (error) {
    console.error("Last Order AI error:", error);
    return new Response(JSON.stringify({ error: "Failed to process request" }), { status: 500, headers: { "content-type": "application/json" } });
  }
}

