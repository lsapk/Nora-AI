import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

export async function getAIResponse(noteContent: string, userMessage: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Tu es un assistant IA spécialisé dans la prise de notes.
    Contenu actuel de la note :
    """
    ${noteContent}
    """

    Instruction de l'utilisateur : "${userMessage}"

    Réponds au format JSON suivant :
    {
      "explanation": "Ce que tu as fait",
      "newContent": "Le nouveau contenu complet de la note après modification",
      "suggestedImages": ["mots clés pour images Unsplash si pertinent"]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  try {
    // Basic JSON extraction if Gemini adds markdown markers
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
}
