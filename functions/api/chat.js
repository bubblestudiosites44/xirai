const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai/prompt/";
const SUPABASE_PROJECT_ID = "hbbtegiecallsiajrunj";
const DEFAULT_SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiYnRlZ2llY2FsbHNpYWpydW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NTEzOTAsImV4cCI6MjA2NzIyNzM5MH0.COj1AuZKSAtTjyghMYoPWfzvF2074tI6iAt2Usnj6JM";

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const asGroqContent = (message) => {
  const attachments = Array.isArray(message.attachments) ? message.attachments.slice(0, 5) : [];

  if (message.role !== "user" || attachments.length === 0) {
    return message.content || "";
  }

  return [
    {
      type: "text",
      text: message.content || "Please describe this image.",
    },
    ...attachments.map((attachment) => ({
      type: "image_url",
      image_url: {
        url: attachment.dataUrl,
      },
    })),
  ];
};

const getLatestUserMessage = (messages) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role !== "assistant") {
      return messages[index];
    }
  }

  return null;
};

const VISUAL_SUBJECT_PATTERN =
  /\b(dog|cat|puppy|kitten|animal|bird|horse|fish|dragon|monster|robot|car|truck|vehicle|house|building|room|landscape|mountain|forest|city|planet|space|ship|sword|flower|tree|product|poster|sticker|logo|icon|wallpaper|avatar|mascot|character)\b/i;

const isImageEditRequest = (text = "") =>
  /\b(make|edit|update|modify|change|transform|turn|add|give|put|remove|replace)\b.*\b(it|this|that|the\s+(image|picture|photo|one)|last\s+(image|picture|photo|one)|previous\s+(image|picture|photo|one))\b/i.test(
    text
  );

const isDirectImageCreationRequest = (text = "") =>
  [
    /\b(make|create|generate|draw|render|design|paint|illustrate)\b(?:\s+\w+){0,8}\s+\b(image|picture|photo|logo|wallpaper|avatar|icon|art|illustration)\b/i,
    /\b(image|picture|photo|logo|wallpaper|avatar|icon|art|illustration)\b(?:\s+\w+){0,8}\s+\b(of|for|showing)\b/i,
    /\b(make|create|generate|draw|render|design|paint|illustrate)\s+me\s+(a|an|some)?\s*(image|picture|photo|logo|wallpaper|avatar|icon|art|illustration)?\s*(of|for)?\b/i,
    /\b(draw|paint|illustrate|render)\s+(me\s+)?(a|an|the|some)?\s*\w+/i,
  ].some((pattern) => pattern.test(text)) ||
  (/\b(make|create|generate|design)\s+(me\s+)?(a|an|the|some)?\s*\w+/i.test(text) &&
    VISUAL_SUBJECT_PATTERN.test(text));

const isImageRequest = (text = "") => isDirectImageCreationRequest(text) || isImageEditRequest(text);

const isWebSearchRequest = (text = "") =>
  /\b(search|look up|google|web|internet|latest|current|today|recent|news|source|sources)\b/i.test(text);

const stripImageCommand = (text = "") => {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();

  const withoutCommand = cleaned
    .replace(
      /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+|will\s+you\s+)?(?:make|create|generate|draw|render|design|paint|illustrate)\s+(?:me\s+)?(?:a|an|some)?\s*(?:image|picture|photo|logo|wallpaper|avatar|icon|art|illustration)?\s*(?:of|for|showing|with)?\s*/i,
      ""
    )
    .replace(
      /^(?:please\s+)?(?:an?|some)?\s*(?:image|picture|photo|logo|wallpaper|avatar|icon|art|illustration)\s*(?:of|for|showing|with)?\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();

  return withoutCommand.length >= 3 ? withoutCommand : cleaned;
};

const explicitlyRequestsPeople = (text = "") =>
  /\b(person|people|human|humans|man|men|woman|women|boy|girl|child|kid|teen|adult|face|portrait|selfie|headshot|body|model|crowd|family|student|teacher|doctor|worker|character|mascot|avatar|superhero)\b/i.test(
    text
  );

const getImageStyleHint = (text = "") => {
  if (/\b(logo|icon|app icon|brand mark|symbol)\b/i.test(text)) {
    return "Use a clean centered vector-style composition, strong silhouette, crisp edges, and no extra background clutter.";
  }

  if (/\b(wallpaper|background|banner|header)\b/i.test(text)) {
    return "Use a cinematic wide composition with strong depth, polished lighting, and no text unless requested.";
  }

  if (/\b(photo|photorealistic|realistic)\b/i.test(text)) {
    return "Use realistic lighting, natural materials, sharp focus, and believable scale.";
  }

  if (/\b(pixel|sprite|game asset)\b/i.test(text)) {
    return "Use clean game-asset composition, readable shapes, and no unnecessary background details.";
  }

  return "Use a polished, detailed composition that clearly centers the requested subject.";
};

const buildImagePrompt = (message) => {
  const rawContent = message?.content || "";
  const subject = stripImageCommand(rawContent);
  const promptParts = [
    `Primary subject: ${subject}.`,
    "Follow the user's request literally and do not add unrelated subjects.",
    getImageStyleHint(rawContent),
  ];

  if (!explicitlyRequestsPeople(rawContent)) {
    promptParts.push(
      "Do not include people, humans, faces, bodies, portraits, models, or crowds unless the user explicitly asks for them."
    );
  }

  if (message?.attachments?.length) {
    promptParts.push("Use the uploaded image as the visual reference for the requested edit or update.");
  }

  promptParts.push("No watermark, no logo overlay, no random text.");

  return promptParts.join(" ");
};

const stripImageEditCommand = (text = "") => {
  const cleaned = text.replace(/\s+/g, " ").replace(/[.!?]+$/g, "").trim();
  const addMatch = cleaned.match(
    /^(?:please\s+)?(?:add|give|put)\s+(.+?)\s+(?:to|on)\s+(?:it|this|that|the\s+(?:image|picture|photo|one)|the\s+last\s+(?:image|picture|photo|one))$/i
  );

  if (addMatch?.[1]) {
    return addMatch[1].trim();
  }

  return cleaned
    .replace(
      /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+|will\s+you\s+)?(?:make|edit|update|modify|change|transform|turn|give|put|add|remove|replace)\s+(?:it|this|that|the\s+(?:image|picture|photo|one)|the\s+last\s+(?:image|picture|photo|one)|the\s+previous\s+(?:image|picture|photo|one))\s*(?:to|into|have|with|so\s+it\s+has|so\s+it\s+is)?\s*/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
};

const buildImageEditPrompt = (message, previousPrompt) => {
  const rawContent = message?.content || "";
  const requestedChange = stripImageEditCommand(rawContent);
  const promptParts = [
    `Start from this previous image concept: ${previousPrompt}`,
    `Apply this requested change: ${requestedChange}.`,
    "Keep the same main subject and overall composition. Only change what the user asked to change.",
    getImageStyleHint(previousPrompt),
  ];

  if (!explicitlyRequestsPeople(rawContent) && !explicitlyRequestsPeople(previousPrompt)) {
    promptParts.push(
      "Do not include people, humans, faces, bodies, portraits, models, or crowds unless the user explicitly asks for them."
    );
  }

  promptParts.push("No watermark, no logo overlay, no random text.");

  return promptParts.join(" ");
};

const encodeUrlComponentStrict = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

const buildPollinationsUrl = (prompt) => {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    nologo: "true",
    safe: "true",
    seed: String(Math.floor(Math.random() * 1_000_000)),
  });

  return `${POLLINATIONS_IMAGE_BASE}${encodeUrlComponentStrict(prompt)}?${params.toString()}`;
};

const getLastGeneratedImagePrompt = (messages) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const content = messages[index]?.content || "";
    const match = content.match(/https:\/\/image\.pollinations\.ai\/prompt\/[^\s)]+/);

    if (!match) {
      continue;
    }

    try {
      const url = new URL(match[0]);
      const encodedPrompt = url.pathname.replace(/^\/prompt\//, "");
      return decodeURIComponent(encodedPrompt);
    } catch {
      return null;
    }
  }

  return null;
};

const stripTags = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const decodeDuckUrl = (value = "") => {
  const cleaned = value.replace(/^\/\//, "https://");
  try {
    const url = new URL(cleaned);
    const uddg = url.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : cleaned;
  } catch {
    return cleaned;
  }
};

const performWebSearch = async (query) => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "XirAI/1.0",
    },
  });

  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const blocks = html.match(/<div class="result[\s\S]*?<\/div>\s*<\/div>/g) || [];

  return blocks
    .map((block) => {
      const titleMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>|class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);

      if (!titleMatch) {
        return null;
      }

      return {
        title: stripTags(titleMatch[2]),
        url: decodeDuckUrl(titleMatch[1]),
        snippet: stripTags(snippetMatch?.[1] || snippetMatch?.[2] || ""),
      };
    })
    .filter(Boolean)
    .slice(0, 5);
};

const verifySignedIn = async (request, env) => {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return false;
  }

  const supabaseUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  return response.ok;
};

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];
  if (incomingMessages.length === 0) {
    return json({ error: "No messages provided." }, { status: 400 });
  }

  const latestUserMessage = getLatestUserMessage(incomingMessages);
  const hasImages = incomingMessages.some((message) => message.attachments?.length);
  const previousImagePrompt = getLastGeneratedImagePrompt(incomingMessages);
  const latestText = latestUserMessage?.content || "";
  const isStartingNewImage = isDirectImageCreationRequest(latestText) && !isImageEditRequest(latestText);
  const isEditingPreviousImage =
    Boolean(previousImagePrompt) && isImageEditRequest(latestText) && !isStartingNewImage;
  const wantsImage = latestUserMessage && (isImageRequest(latestText) || isEditingPreviousImage);

  if ((wantsImage || hasImages) && !(await verifySignedIn(context.request, context.env))) {
    return json({ error: "Sign in with Xirako to use image features." }, { status: 401 });
  }

  if (latestUserMessage && wantsImage) {
    const prompt = isEditingPreviousImage
      ? buildImageEditPrompt(latestUserMessage, previousImagePrompt)
      : buildImagePrompt(latestUserMessage);
    const imageUrl = buildPollinationsUrl(prompt);

    return new Response(
      `Here's your image:\n\n![Generated image](${imageUrl})\n\n[Open full-size image](${imageUrl})`,
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      }
    );
  }

  const apiKey = context.env.GROQ_API_KEY;

  if (!apiKey) {
    return json({ error: "Missing GROQ_API_KEY Cloudflare secret." }, { status: 500 });
  }

  const model = hasImages
    ? context.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL
    : context.env.GROQ_TEXT_MODEL || DEFAULT_TEXT_MODEL;

  let searchResults = [];
  if (latestUserMessage && isWebSearchRequest(latestUserMessage.content)) {
    searchResults = await performWebSearch(latestUserMessage.content).catch(() => []);
  }

  const searchContext = searchResults.length
    ? `\n\nWeb search results from ${new Date().toISOString()}:\n${searchResults
        .map((result, index) => `${index + 1}. ${result.title}\n${result.url}\n${result.snippet}`)
        .join("\n\n")}\n\nUse these results when relevant and include source links.`
    : "";

  const messages = [
    {
      role: "system",
      content:
        "You are XirAI, an AI assistant created by Xirako. Answer like ChatGPT: natural, direct, and conversational. Do not begin answers with labels like 'Xirako:' and do not introduce Xirako unless the user asks. Use concise paragraphs by default, bullets only when they improve clarity, and markdown when it helps scanning." +
        searchContext,
    },
    ...incomingMessages.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: asGroqContent(message),
    })),
  ];

  const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_completion_tokens: 1024,
      stream: true,
    }),
  });

  if (!groqResponse.ok) {
    if (groqResponse.status === 429) {
      return json(
        {
          error: "XirAI is busy right now. Please try again in a moment.",
        },
        { status: 429 }
      );
    }

    const groqData = await groqResponse.json().catch(() => ({}));
    return json(
      {
        error: groqData.error?.message || "Groq request failed.",
      },
      { status: groqResponse.status }
    );
  }

  if (!groqResponse.body) {
    return new Response("", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = groqResponse.body.getReader();

  return new Response(
    new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) {
                continue;
              }

              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const chunk = parsed.choices?.[0]?.delta?.content || "";
                if (chunk) {
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch {
                // Ignore malformed stream fragments.
              }
            }
          }
        } catch (error) {
          controller.error(error);
          return;
        }

        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    }
  );
}

export function onRequest() {
  return json({ error: "Method not allowed." }, { status: 405 });
}
