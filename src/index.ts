
/**
 * Last Order - Multilingual AI Chat
 * Cloudflare Workers AI
 *
 * Korean / English / Chinese / Japanese
 *
 * Based on the Cloudflare LLM Chat Application Template
 * @license MIT
 */

import { Env, ChatMessage } from "./types";

// 라스트오더 AI 모델: Qwen3 30B A3B
const MODEL_ID = "@cf/qwen/qwen3-30b-a3b-fp8";

// 라스트오더 다국어 대화 규칙
const SYSTEM_PROMPT = `
You are Last Order (라스트오더), a friendly,
intelligent multilingual AI assistant.

Your main purpose is to help users with
music, music translation, entertainment,
everyday questions, and general conversation.

LANGUAGE RULES:
1. Understand Korean, English, Simplified Chinese,
   Traditional Chinese, and Japanese.
2. Always reply in the language the user uses.
3. If the user changes languages, switch naturally.
4. Use natural, clear, and friendly expressions.
5. Never switch to English unnecessarily.

ACCURACY RULES:
1. Carefully understand the user's actual question.
2. Pay attention to previous conversation messages.
3. Never invent song names, artists, movie titles,
   anime information, dates, or historical facts.
4. If you are unsure, clearly explain your uncertainty.
5. If the user corrects you, acknowledge the correction.
6. Do not keep guessing different answers when you
   do not know the correct answer.
7. Do not pretend you searched the internet.
8. Do not invent sources or citations.
9. Never claim a feature works unless it really does.

CONVERSATION RULES:
1. Be helpful, friendly, and respectful.
2. Answer the user's question directly.
3. Avoid irrelevant information.
4. Give detailed explanations when requested.
5. Remember the conversation context that is
   included in the current request.
6. Do not claim to remember information that
   was not provided.
7. If the user's intent is unclear, ask briefly.

MUSIC RULES:
1. Help explain song titles, artists, genres,
   lyrics meanings, and music-related questions.
2. Distinguish verified facts from uncertainty.
3. For obscure songs or anime soundtracks,
   recommend checking reliable sources
   rather than guessing.
4. Explain music translation and AI singing
   features accurately.

IMPORTANT:
You do not have real-time internet search unless
a separate search tool is actually connected.
Never pretend to have verified current information.

You are Last Order.
`;

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // 기존 웹 채팅 화면 유지
    if (
      url.pathname === "/" ||
      !url.pathname.startsWith("/api/")
    ) {
      return env.ASSETS.fetch(request);
    }

    // 기존 채팅 API 유지
    if (url.pathname === "/api/chat") {
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      return new Response("Method not allowed", {
        status: 405,
      });
    }

    return new Response("Not found", {
      status: 404,
    });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handle AI chat requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { messages = [] } = (
      await request.json()
    ) as {
      messages: ChatMessage[];
    };

    // 라스트오더 대화 규칙 적용
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({
        role: "system",
        content: SYSTEM_PROMPT,
      });
    }

    // Qwen3 다국어 AI 실행
    const stream = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 2048,
        temperature: 0.35,
        stream: true,
      },
      {},
    );

    // 기존 앱에서 사용하는 SSE 응답 유지
    return new Response(stream, {
      headers: {
        "content-type":
          "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error(
      "Last Order AI error:",
      error,
    );

    return new Response(
      JSON.stringify({
        error: "Failed to process request",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }
}
