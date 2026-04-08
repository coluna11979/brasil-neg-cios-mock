const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const MODEL = "gemini-2.5-flash";

export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (!GOOGLE_API_KEY) {
    throw new Error("VITE_GOOGLE_API_KEY não configurada no .env");
  }

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: fullPrompt }] }],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GOOGLE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na API Google: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text as string;
}
