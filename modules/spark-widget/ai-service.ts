/**
 * AI Service using Groq API (free tier)
 * Get your API key from: https://console.groq.com/keys
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TRANSCRIPTION_URL =
    "https://api.groq.com/openai/v1/audio/transcriptions";

export async function askAI(question: string): Promise<string> {
    if (!GROQ_API_KEY) {
        return "No está configurada la clave de API de Groq. Añade VITE_GROQ_API_KEY al archivo .env";
    }

    try {
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un asistente útil y conciso. Responde en español de forma breve y clara, máximo 2-3 frases. Si te preguntan por cálculos matemáticos, resuélvelos y explica el resultado brevemente.",
                    },
                    {
                        role: "user",
                        content: question,
                    },
                ],
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content ?? "No obtuve respuesta.";
    } catch (error) {
        console.error("Error calling Groq API:", error);
        return "Lo siento, hubo un error al procesar tu pregunta.";
    }
}

export async function transcribeAudio(
    audio: Blob,
    fileName = "speech.webm"
): Promise<string> {
    if (!GROQ_API_KEY) {
        throw new Error(
            "No está configurada la clave de API de Groq. Añade VITE_GROQ_API_KEY al archivo .env"
        );
    }

    const formData = new FormData();
    formData.append("file", audio, fileName);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "es");
    formData.append("response_format", "json");
    formData.append("temperature", "0");

    const response = await fetch(GROQ_TRANSCRIPTION_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
            `Groq transcription error: ${response.status}${errorText ? ` - ${errorText}` : ""
            }`
        );
    }

    const data = (await response.json()) as { text?: string };
    return (data.text ?? "").trim();
}
