const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai/prompt/";

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

const isImageRequest = (text = "") =>
  /\b(generate|create|make|draw|edit|update|modify|change|turn|render)\b.*\b(image|picture|photo|logo|wallpaper|avatar|icon|art)\b/i.test(
    text
  ) ||
  /\b(image|picture|photo|logo|wallpaper|avatar|icon|art)\b.*\b(generate|create|make|draw|edit|update|modify|change|turn|render)\b/i.test(
    text
  );

const buildPollinationsUrl = (prompt) => {
  const params = new URLSearchParams({
    width: "1024",
    height: "1024",
    model: "flux",
    nologo: "true",
    enhance: "true",
    seed: String(Math.floor(Math.random() * 1_000_000)),
  });

  return `${POLLINATIONS_IMAGE_BASE}${encodeURIComponent(prompt)}?${params.toString()}`;
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
  if (latestUserMessage && isImageRequest(latestUserMessage.content)) {
    const attachmentNote = latestUserMessage.attachments?.length
      ? "Use the uploaded image as visual reference for the requested edit/update. "
      : "";
    const prompt = `${attachmentNote}${latestUserMessage.content}`.trim();
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

  const hasImages = incomingMessages.some((message) => message.attachments?.length);
  const model = hasImages
    ? context.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL
    : context.env.GROQ_TEXT_MODEL || DEFAULT_TEXT_MODEL;

  const messages = [
    {
      role: "system",
      content:
        "You are XirAI, an intelligent AI assistant created by Xirako. Be helpful, concise, creative, and precise. Use markdown when it makes the answer easier to scan.",
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
