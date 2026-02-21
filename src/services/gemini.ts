import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export async function generateResponse(prompt: string, history: { role: string; parts: { text: string }[] }[]) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: prompt }] }
    ],
  });

  return response.text;
}
