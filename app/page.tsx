"use client";

import { useState, useEffect, useRef } from "react";

// Helper function to generate a simple unique ID
const generateUUID = () => crypto.randomUUID();

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function HomePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // On first load, check for or create a User ID
  useEffect(() => {
    let storedUserId = localStorage.getItem('ai-journal-userId');
    if (!storedUserId) {
      storedUserId = generateUUID();
      localStorage.setItem('ai-journal-userId', storedUserId);
    }
    setUserId(storedUserId);
    // Greet the user
    setMessages([{ sender: 'ai', text: 'Hello! What would you like to talk about today?' }]);
  }, []);

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading || !userId) return;

    const userMessage: Message = { sender: 'user', text: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setCurrentInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: currentInput }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }
      
      const aiMessage: Message = { sender: 'ai', text: data.response };
      setMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      const errorMessage: Message = { sender: 'ai', text: `Sorry, an error occurred: ${(err as Error).message}`};
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearMemory = () => {
      // This is a simple way to start over for testing
      localStorage.removeItem('ai-journal-userId');
      window.location.reload();
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl h-[80vh] flex flex-col bg-white rounded-lg shadow-xl">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-center">The Amnesiac's Journal</h1>
          <p className="text-xs text-center text-gray-500">Your User ID: {userId}</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
           <button onClick={handleClearMemory} className="text-xs text-gray-400 hover:text-red-500 mt-2">Clear Memory & Start Over</button>
        </div>
      </div>
    </main>
  );
}
