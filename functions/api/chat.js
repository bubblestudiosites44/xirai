const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

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

export async function onRequestPost(context) {
  const apiKey = context.env.GROQ_API_KEY;

  if (!apiKey) {
    return json({ error: "Missing GROQ_API_KEY Cloudflare secret." }, { status: 500 });
  }

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
    }),
  });

  const groqData = await groqResponse.json().catch(() => ({}));

  if (!groqResponse.ok) {
    return json(
      {
        error: groqData.error?.message || "Groq request failed.",
      },
      { status: groqResponse.status }
    );
  }

  return json({
    content: groqData.choices?.[0]?.message?.content || "",
    model,
  });
}

export function onRequest() {
  return json({ error: "Method not allowed." }, { status: 405 });
}
