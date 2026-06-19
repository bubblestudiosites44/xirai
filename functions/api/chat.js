const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_BASIC_FALLBACK_MODELS = ["llama-3.1-8b-instant", "openai/gpt-oss-20b", "qwen/qwen3-32b"];
const DEFAULT_COMPOUND_FALLBACK_MODEL = "groq/compound";
const DEFAULT_STABLE_DIFFUSION_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
const POLLINATIONS_IMAGE_BASE = "https://image.pollinations.ai/prompt/";
const SUPABASE_PROJECT_ID = "hbbtegiecallsiajrunj";
const MAX_REQUEST_BYTES = 7 * 1024 * 1024;
const MAX_VISION_ATTACHMENTS = 3;
const MAX_ATTACHMENT_DATA_URL_LENGTH = 1_400_000;
const MAX_TOTAL_ATTACHMENT_DATA_URL_LENGTH = 3_200_000;
const MAX_GENERATED_IMAGE_DATA_URL_LENGTH = 2_400_000;
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

const isValidImageDataUrl = (value = "") =>
  /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(value);

const getUsableAttachments = (message) => {
  if (!Array.isArray(message.attachments)) {
    return [];
  }

  let totalLength = 0;

  return message.attachments
    .filter((attachment) => {
      if (!isValidImageDataUrl(attachment?.dataUrl)) {
        return false;
      }

      totalLength += attachment.dataUrl.length;
      return (
        attachment.dataUrl.length <= MAX_ATTACHMENT_DATA_URL_LENGTH &&
        totalLength <= MAX_TOTAL_ATTACHMENT_DATA_URL_LENGTH
      );
    })
    .slice(0, MAX_VISION_ATTACHMENTS);
};

const hasUsableAttachments = (message) => getUsableAttachments(message).length > 0;

const asGroqContent = (message) => {
  const attachments = getUsableAttachments(message);

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

const IMAGE_NOUN_PATTERN =
  /\b(image|picture|photo|logo|wallpaper|avatar|icon|art|artwork|illustration|drawing|painting|render|poster|sticker|banner|background|thumbnail|cover|channel\s+art|profile\s+picture|pfp|mascot|emblem|badge|brand\s+mark)\b/i;
const CREATIVE_IMAGE_NOUN_PATTERN =
  /\b(picture|photo|logo|wallpaper|avatar|icon|art|artwork|illustration|drawing|painting|poster|sticker|banner|thumbnail|cover|channel\s+art|profile\s+picture|pfp|mascot|emblem|badge|brand\s+mark)\b/i;
const TECH_BUILD_PATTERN = /\b(code|component|function|script|button|input|upload|feature|bug|fix|api|endpoint|layout)\b/i;

const isImageEditRequest = (text = "") =>
  [
    /\b(edit|update|modify|change|transform|turn)\b.*\b(the\s+)?(image|picture|photo|last\s+one|previous\s+one)\b/i,
    /\b(add|give|put|remove|replace)\b.*\b(it|this|that|the\s+(image|picture|photo|one)|last\s+(image|picture|photo|one)|previous\s+(image|picture|photo|one))\b/i,
    /\bmake\s+(it|this|that)\s+(have|wear|with|look|more|less|bigger|smaller|brighter|darker|into|a|an)\b/i,
    /\b(change|turn|transform)\s+(it|this|that)\s+(to|into|with)\b/i,
  ].some((pattern) => pattern.test(text));

const isDirectImageCreationRequest = (text = "") => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const technicalBuildOnly = TECH_BUILD_PATTERN.test(cleaned) && !CREATIVE_IMAGE_NOUN_PATTERN.test(cleaned);

  if (technicalBuildOnly) {
    return false;
  }

  return (
    [
      /\b(make|create|generate|draw|render|design|paint|illustrate)\b(?:\s+[\w-]+){0,14}\s+\b(image|picture|photo|logo|wallpaper|avatar|icon|art|artwork|illustration|drawing|painting|poster|sticker|banner|thumbnail|cover|mascot|emblem|badge)\b/i,
      /\b(make|create|generate|draw|render|design|paint|illustrate)\s+(?:me\s+)?(?:a|an|the|some)?(?:\s+[\w-]+){0,12}\s+\b(?:channel\s+art|profile\s+picture|brand\s+mark)\b/i,
      /\b(image|picture|photo|logo|wallpaper|avatar|icon|art|artwork|illustration|drawing|painting|poster|sticker|banner|thumbnail|cover|channel\s+art|profile\s+picture|mascot|emblem|badge)\b(?:\s+[\w-]+){0,12}\s+\b(of|for|showing|with|featuring)\b/i,
      /\b(draw|paint|illustrate|render|design)\s+(me\s+)?(a|an|the|some)?\s*\S+/i,
      /\b(make|create|generate|design)\b.*\b(text\s+(saying|that\s+says|reading)|called|named)\b/i,
    ].some((pattern) => pattern.test(cleaned)) ||
    (/\b(make|create|generate|design)\b/i.test(cleaned) && IMAGE_NOUN_PATTERN.test(cleaned))
  );
};

const shouldHandleImageRequest = (text = "", previousImagePrompt = "") => {
  const isStartingNewImage = isDirectImageCreationRequest(text) && !isImageEditRequest(text);
  const isEditingPreviousImage =
    Boolean(previousImagePrompt) && isImageEditRequest(text) && !isStartingNewImage;

  return {
    isStartingNewImage,
    isEditingPreviousImage,
    wantsImage: isStartingNewImage || isEditingPreviousImage,
  };
};

const shouldUseWebSearch = (text = "", { hasImages = false, wantsImage = false } = {}) => {
  if (!text || hasImages || wantsImage) {
    return false;
  }

  const explicitSearch = /\b(search|look up|google|web|internet|source|sources|find out|check|verify|fact check)\b/i;
  const currentInfo =
    /\b(latest|current|today|tonight|now|right now|recent|news|breaking|newest|most recent|up to date|as of|this week|this month|this year|202[4-9])\b/i;
  const volatileInfo =
    /\b(price|cost|stock|market cap|weather|forecast|score|schedule|standings|release date|version|changelog|update|available|law|policy|election|president|ceo|owner|net worth|population|ranking|stats|statistics|exchange rate)\b/i;
  const externalReference = /\b[a-z0-9-]+\.(com|org|net|io|ai|dev|app|gov|edu)\b/i;
  const personOrEventLookup =
    /\b(who|when|where|which|how many|how much)\s+(is|are|was|were|did|does|do|can|will|has|have|won|owns)\b/i;
  const specificWhatLookup =
    /\bwhat\s+(is|are|was|were|does|do|has|have)\b/i.test(text) &&
    (externalReference.test(text) || /\b(ceo|owner|founder|release|version|price|cost|weather|score|law|policy|news)\b/i.test(text));

  return (
    explicitSearch.test(text) ||
    currentInfo.test(text) ||
    volatileInfo.test(text) ||
    externalReference.test(text) ||
    personOrEventLookup.test(text) ||
    specificWhatLookup
  );
};

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

const extractRequestedImageText = (text = "") => {
  const patterns = [
    /\btext\s+(?:saying|that\s+says|reading|of)\s+["'`“”]?([^"'`“”.!?;]+)["'`“”]?/i,
    /\b(?:words|lettering)\s+(?:saying|that\s+says|reading)\s+["'`“”]?([^"'`“”.!?;]+)["'`“”]?/i,
    /\b(?:called|named)\s+["'`“”]?([^"'`“”.!?;]+)["'`“”]?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim().slice(0, 80);
    }
  }

  return "";
};

const getImageStyleHint = (text = "") => {
  if (/\b(cartoon|cartoonish|cute|playful|mascot)\b/i.test(text)) {
    return "Use a clean cartoon mascot style, friendly expressive shapes, bold readable silhouette, polished vector-like shading, and playful composition.";
  }

  if (/\b(channel|youtube|streamer|profile picture|pfp|thumbnail|cover|banner)\b/i.test(text)) {
    return "Use channel-brand artwork with a strong mascot or symbol, clear composition, readable branding, and colors that work as a profile image or banner.";
  }

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
  const requestedText = extractRequestedImageText(rawContent);
  const promptParts = [
    `Primary subject: ${subject}.`,
    "Follow the user's request literally and do not add unrelated subjects. Preserve every requested detail, including accessories, colors, style, text, and brand or channel names.",
    getImageStyleHint(rawContent),
  ];

  if (requestedText) {
    promptParts.push(
      `Include the exact readable text "${requestedText}" in the image. Spell it exactly this way and do not add any other words.`
    );
  }

  if (!explicitlyRequestsPeople(rawContent)) {
    promptParts.push(
      "Do not include people, humans, faces, bodies, portraits, models, or crowds unless the user explicitly asks for them."
    );
  }

  if (message?.attachments?.length) {
    promptParts.push("Use the uploaded image as the visual reference for the requested edit or update.");
  }

  promptParts.push(
    requestedText
      ? "No watermark, no unrelated text, and no extra logo overlay beyond the requested design."
      : "No watermark, no unrelated logo overlay, and no random text."
  );

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
  const requestedText = extractRequestedImageText(rawContent);
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

  if (requestedText) {
    promptParts.push(
      `Include the exact readable text "${requestedText}" in the image. Spell it exactly this way and do not add any other words.`
    );
  }

  promptParts.push(
    requestedText
      ? "No watermark, no unrelated text, and no extra logo overlay beyond the requested design."
      : "No watermark, no unrelated logo overlay, and no random text."
  );

  return promptParts.join(" ");
};

const encodeUrlComponentStrict = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const detectImageMimeType = (buffer) => {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  return "";
};

const base64ToArrayBuffer = (value) => {
  const binary = atob(value.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
};

const imageResultToDataUrl = async (imageResult) => {
  const bytesToDataUrl = (buffer) => {
    const mimeType = detectImageMimeType(buffer);

    if (!mimeType) {
      throw new Error("Stable Diffusion returned non-image data.");
    }

    return `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`;
  };

  if (typeof imageResult === "string") {
    return bytesToDataUrl(base64ToArrayBuffer(imageResult));
  }

  if (imageResult instanceof Response) {
    return bytesToDataUrl(await imageResult.arrayBuffer());
  }

  if (typeof imageResult?.getReader === "function") {
    return bytesToDataUrl(await new Response(imageResult).arrayBuffer());
  }

  if (imageResult instanceof ArrayBuffer) {
    return bytesToDataUrl(imageResult);
  }

  if (ArrayBuffer.isView(imageResult)) {
    const buffer = imageResult.buffer.slice(
      imageResult.byteOffset,
      imageResult.byteOffset + imageResult.byteLength
    );
    return bytesToDataUrl(buffer);
  }

  if (typeof imageResult?.image === "string") {
    return bytesToDataUrl(base64ToArrayBuffer(imageResult.image));
  }

  if (imageResult?.image instanceof ArrayBuffer) {
    return bytesToDataUrl(imageResult.image);
  }

  if (typeof imageResult?.image?.getReader === "function") {
    return bytesToDataUrl(await new Response(imageResult.image).arrayBuffer());
  }

  throw new Error("Stable Diffusion returned an unsupported image format.");
};

const buildImageResponseText = (imageUrl, prompt) => {
  const promptMetadata = `[Image prompt metadata](xirai-image-prompt:${encodeUrlComponentStrict(prompt)})`;
  const openLink = imageUrl.startsWith("data:image/")
    ? ""
    : `\n\n[Open full-size image](${imageUrl})`;

  return `Here's your image:\n\n![Generated image](${imageUrl})${openLink}\n\n${promptMetadata}`;
};

const generateStableDiffusionImageUrl = async (prompt, env) => {
  if (!env.AI?.run) {
    throw new Error("Cloudflare Workers AI binding is not configured.");
  }

  const imageResult = await env.AI.run(env.STABLE_DIFFUSION_MODEL || DEFAULT_STABLE_DIFFUSION_MODEL, {
    prompt,
    num_steps: 20,
    guidance: 7.5,
  });

  const imageUrl = await imageResultToDataUrl(imageResult);

  if (imageUrl.length > MAX_GENERATED_IMAGE_DATA_URL_LENGTH) {
    throw new Error("Stable Diffusion returned an image that is too large for the chat page.");
  }

  return imageUrl;
};

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
    const metadataMatch = content.match(/xirai-image-prompt:([^\s)]+)/);
    if (metadataMatch?.[1]) {
      try {
        return decodeURIComponent(metadataMatch[1]);
      } catch {
        return metadataMatch[1];
      }
    }

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

const parseResetDurationMs = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();
  const numericValue = Number(trimmed);
  if (Number.isFinite(numericValue)) {
    if (numericValue > 1_000_000_000_000) {
      return Math.max(0, numericValue - Date.now());
    }

    if (numericValue > 1_000_000_000) {
      return Math.max(0, numericValue * 1000 - Date.now());
    }

    return Math.max(0, numericValue * 1000);
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  const durationMatch = trimmed.match(
    /^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i
  );
  if (!durationMatch) {
    return null;
  }

  const hours = Number(durationMatch[1] || 0);
  const minutes = Number(durationMatch[2] || 0);
  const seconds = Number(durationMatch[3] || 0);
  const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;

  return totalMs > 0 ? totalMs : null;
};

const formatResetDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "a little while";
  }

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 90) {
    return `about ${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 90) {
    return `about ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 36) {
    return `about ${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.ceil(hours / 24);
  return `about ${days} day${days === 1 ? "" : "s"}`;
};

const getRateLimitResetLabel = (response) => {
  const resetDurations = [
    response.headers.get("retry-after"),
    response.headers.get("x-ratelimit-reset-requests"),
    response.headers.get("x-ratelimit-reset-tokens"),
  ]
    .map(parseResetDurationMs)
    .filter((duration) => Number.isFinite(duration));

  if (!resetDurations.length) {
    return "a little while";
  }

  return formatResetDuration(Math.max(...resetDurations));
};

const parseModelList = (value, fallbackModels) => {
  if (!value) {
    return fallbackModels;
  }

  const models = String(value)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return models.length ? models : fallbackModels;
};

const uniqueModels = (models) => [...new Set(models.filter(Boolean))];

const withCompoundAnswerStyle = (messages) => [
  {
    role: "system",
    content:
      "Important for this fallback response: state the final answer directly. Do not use sections like 'What you feel', 'Goal', 'What we can take away from this', or similar coaching/reflection templates. Do not narrate tool use or reasoning. Answer the user's request plainly and naturally.",
  },
  ...messages,
];

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
  const contentLength = Number(context.request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json(
      { error: "That upload is too large. Send fewer images or smaller files." },
      { status: 413 }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages)
    ? body.messages.slice(-10).map((message) => ({
        ...message,
        attachments: getUsableAttachments(message),
      }))
    : [];
  if (incomingMessages.length === 0) {
    return json({ error: "No messages provided." }, { status: 400 });
  }

  const latestUserMessage = getLatestUserMessage(incomingMessages);
  const hasImages = incomingMessages.some(hasUsableAttachments);
  const previousImagePrompt = getLastGeneratedImagePrompt(incomingMessages);
  const latestText = latestUserMessage?.content || "";
  const { isEditingPreviousImage, wantsImage } = shouldHandleImageRequest(latestText, previousImagePrompt);

  if ((wantsImage || hasImages) && !(await verifySignedIn(context.request, context.env))) {
    return json({ error: "Sign in with Xirako to use image features." }, { status: 401 });
  }

  if (latestUserMessage && wantsImage) {
    const prompt = isEditingPreviousImage
      ? buildImageEditPrompt(latestUserMessage, previousImagePrompt)
      : buildImagePrompt(latestUserMessage);
    let imageUrl;
    let imageFallbackNotice = "";

    try {
      imageUrl = await generateStableDiffusionImageUrl(prompt, context.env);
    } catch {
      imageUrl = buildPollinationsUrl(prompt);
      imageFallbackNotice =
        "Pro image generation is unavailable right now, so this image was generated with a more basic model instead.";
    }

    return new Response(
      buildImageResponseText(imageUrl, prompt),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          ...(imageFallbackNotice ? { "X-XirAI-Image-Fallback-Notice": imageFallbackNotice } : {}),
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
  const wantsWebSearch = shouldUseWebSearch(latestText, { hasImages, wantsImage });
  if (latestUserMessage && wantsWebSearch) {
    searchResults = await performWebSearch(latestText).catch(() => []);
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

  const fetchGroqCompletion = (selectedModel, selectedMessages = messages) =>
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: selectedMessages,
        temperature: 0.6,
        max_completion_tokens: 1024,
        stream: true,
      }),
    });

  let limitNotice = "";
  let groqResponse = await fetchGroqCompletion(model);

  if (!groqResponse.ok) {
    if (groqResponse.status === 429) {
      const resetLabel = getRateLimitResetLabel(groqResponse);
      const basicFallbackModels = uniqueModels(
        parseModelList(context.env.GROQ_BASIC_FALLBACK_MODELS, DEFAULT_BASIC_FALLBACK_MODELS)
      ).filter((fallbackModel) => fallbackModel !== model);
      const compoundFallbackModel = context.env.GROQ_COMPOUND_FALLBACK_MODEL || DEFAULT_COMPOUND_FALLBACK_MODEL;
      const fallbackAttempts = [
        ...basicFallbackModels.map((fallbackModel) => ({
          model: fallbackModel,
          messages,
        })),
        {
          model: compoundFallbackModel,
          messages: withCompoundAnswerStyle(messages),
        },
      ];
      limitNotice = `You've hit the pro tier limit for XirAI. New responses will use a more basic model until your limit resets after ${resetLabel}.`;

      for (const attempt of fallbackAttempts) {
        groqResponse = await fetchGroqCompletion(attempt.model, attempt.messages);

        if (groqResponse.ok) {
          break;
        }
      }

      if (!groqResponse.ok) {
        return new Response("XirAI is still busy. Please try again in a moment.", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-XirAI-Limit-Notice": limitNotice,
          },
        });
      }
    } else {
      const groqData = await groqResponse.json().catch(() => ({}));
      return json(
        {
          error: groqData.error?.message || "Groq request failed.",
        },
        { status: groqResponse.status }
      );
    }
  }

  if (!groqResponse.body) {
    return new Response("", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...(limitNotice ? { "X-XirAI-Limit-Notice": limitNotice } : {}),
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
        ...(limitNotice ? { "X-XirAI-Limit-Notice": limitNotice } : {}),
      },
    }
  );
}

export function onRequest() {
  return json({ error: "Method not allowed." }, { status: 405 });
}
