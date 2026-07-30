
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const CHAT_INPUT = document.getElementById("chat-input");
const CHAT_SEND = document.getElementById("btn-chat-send");
const CHAT_MESSAGES = document.getElementById("chat-messages");
const AI_STATUS_TEXT = document.getElementById("ai-status-text");
const AI_STATUS = document.getElementById("ai-status");
const PROGRESS_WRAP = document.getElementById("ai-progress");
const PROGRESS_FILL = document.getElementById("ai-progress-fill");
const PROGRESS_TEXT = document.getElementById("ai-progress-text");

let engine = null;
const modelId = "gemma-2b-it-q4f16_1-MLC"; // Verified ID for WebLLM prebuilt list
const chatConfig = {
    temperature: 0.7,
    top_p: 0.95,
};

async function initEngine() {
    if (engine) return;

    try {
        AI_STATUS.classList.add("loading");
        AI_STATUS_TEXT.textContent = "מאתחל מנוע AI (מצב CPU - איטי יותר)...";
        PROGRESS_WRAP.style.display = "block";

        // Create engine with explicitly specified WASM/CPU fallback if possible
        // Note: WebLLM 0.2.84 automatically handles device selection, 
        // but we ensure the progress callback is set to see where it hangs.
        engine = await webllm.CreateMLCEngine(modelId, {
            initProgressCallback: (report) => {
                console.log("WebLLM Progress:", report);
                const progress = Math.round(report.progress * 100);
                PROGRESS_FILL.style.width = `${progress}%`;
                PROGRESS_TEXT.textContent = `טוען: ${progress}% - ${report.text}`;
                if (progress >= 100) {
                    setTimeout(() => PROGRESS_WRAP.style.display = "none", 1000);
                }
            }
        });

        AI_STATUS.classList.remove("loading");
        AI_STATUS.classList.add("ready");
        AI_STATUS_TEXT.textContent = "המודל מוכן מקומית (CPU Mode)";
    } catch (err) {
        console.error("AI Init Error:", err);
        AI_STATUS_TEXT.textContent = "שגיאת טעינה. נסה לרענן או לבדוק WebGPU.";
        PROGRESS_TEXT.textContent = "שגיאה: " + err.message;
        AI_STATUS.classList.remove("loading");
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    
    // Simple markdown-like replacement for line breaks and bold
    const formatted = text.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    msgDiv.innerHTML = `<div class="msg-content">${formatted}</div>`;
    CHAT_MESSAGES.appendChild(msgDiv);
    CHAT_MESSAGES.scrollTop = CHAT_MESSAGES.scrollHeight;
}

async function handleChat() {
    const query = CHAT_INPUT.value.trim();
    if (!query || !engine) return;

    CHAT_INPUT.value = "";
    appendMessage("user", query);

    // Prepare context from storage
    const allInsights = JSON.parse(localStorage.getItem("amarel_insights") || "[]");
    const contextStr = allInsights.map(ins => 
        `מחלקה: ${ins.department}, משרה: ${ins.jobTitle}, מרואיין: ${ins.intervieweeName}, תובנות: ${ins.insights}, סיטואציות: ${ins.situations}`
    ).join("\n---\n");

    const systemPrompt = `You are a helpful AI assistant for Amarel hiring managers. 
You have access to a database of interview insights.
Language: Hebrew.
Current Date: ${new Date().toLocaleDateString('he-IL')}.

Database Content:
${contextStr}

Analyze the query based on this data. If the user asks for a summary, explain the main points. If they ask for advice, use the patterns from the database.
Always answer in Hebrew.`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
    ];

    try {
        AI_STATUS.classList.add("loading");
        AI_STATUS_TEXT.textContent = "ה-AI חושב...";

        const chunks = await engine.chat.completions.create({
            messages,
            stream: true
        });

        const aiMsgDiv = document.createElement("div");
        aiMsgDiv.className = "message ai-message";
        const msgContent = document.createElement("div");
        msgContent.className = "msg-content";
        aiMsgDiv.appendChild(msgContent);
        CHAT_MESSAGES.appendChild(aiMsgDiv);

        let fullRes = "";
        for await (const chunk of chunks) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullRes += content;
            msgContent.innerHTML = fullRes.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            CHAT_MESSAGES.scrollTop = CHAT_MESSAGES.scrollHeight;
        }

        AI_STATUS.classList.remove("loading");
        AI_STATUS_TEXT.textContent = "המודל מוכן (Gemma-2-2B)";
    } catch (err) {
        console.error("Chat Error:", err);
        appendMessage("ai", "מצטער, קרתה שגיאה בזמן העיבוד. נסה שוב.");
    }
}

CHAT_SEND.addEventListener("click", handleChat);
CHAT_INPUT.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChat();
    }
});

// Lazy load engine when user navigates to chat
export function onEnterChat() {
    initEngine();
}

// Exporting to global scope for the simple view switcher in app.js
window.onEnterChat = onEnterChat;
