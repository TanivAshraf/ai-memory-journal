import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export async function POST(request) {
  const { userId, message } = await request.json();

  if (!userId || !message) {
    return new Response(JSON.stringify({ error: "User ID and message are required." }), { status: 400 });
  }

  const memoryKey = `journal:${userId}`;
  let conversationResponse;

  try {
    // --- Step A: Memory Retrieval ---
    const memoryLog = await kv.get(memoryKey) || "This is my first conversation with this user.";
    
    // --- Step B: Informed Response ---
    const informedPrompt = `You are a conversational AI companion. Your goal is to be a consistent, thoughtful friend who remembers past details.
    
    Below is your memory journal of past conversations with this user. Use it to inform your response, but DO NOT mention the journal explicitly. Just act like you naturally remember.
    
    YOUR MEMORY JOURNAL:
    ---
    ${memoryLog}
    ---
    
    THE USER'S NEW MESSAGE:
    "${message}"
    
    Now, provide your response.`;
    
    const informedResult = await model.generateContent(informedPrompt);
    conversationResponse = informedResult.response.text();
    
    // Immediately send the response back to the user
    // The rest of the function will continue executing in the background on Vercel
    
  } catch (error) {
    console.error("Error during informed response:", error);
    return new Response(JSON.stringify({ error: "Failed to generate a response." }), { status: 500 });
  }

  // --- Background Memory Consolidation ---
  // This part runs after the user has already received their response.
  try {
    const memoryLog = await kv.get(memoryKey) || "";
    
    // --- Step C: Memory Consolidation ---
    const consolidationPrompt = `You are a memory consolidation AI. Your task is to summarize the following short conversation into a single, concise new journal entry. Extract only the most important new facts, topics, or feelings expressed.
    
    CONVERSATION TO SUMMARIZE:
    User: "${message}"
    You: "${conversationResponse}"
    
    Example Output: - The user mentioned they are studying for a history exam and are interested in the Roman Empire.
    
    New journal entry:`;
    
    const consolidationResult = await model.generateContent(consolidationPrompt);
    const newJournalEntry = consolidationResult.response.text().trim();
    
    // --- Step D: Memory Update ---
    const updatedMemory = memoryLog + "\n" + newJournalEntry;
    await kv.set(memoryKey, updatedMemory);
    console.log(`Memory updated for user ${userId}`);

  } catch (error) {
    // If this background task fails, the user is unaffected. We just log the error.
    console.error("Error during memory consolidation:", error);
  }

  return new Response(JSON.stringify({ response: conversationResponse }), { status: 200 });
}
