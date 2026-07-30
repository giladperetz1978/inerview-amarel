
import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0";

// Selectors for both View and Widget
const VIEW_INPUT = document.getElementById("chat-input");
const VIEW_SEND = document.getElementById("btn-chat-send");
const VIEW_MESSAGES = document.getElementById("chat-messages");

const WIDGET_INPUT = document.getElementById("widget-chat-input");
const WIDGET_SEND = document.getElementById("btn-widget-send");
const WIDGET_MESSAGES = document.getElementById("widget-messages");

const AI_STATUS_TEXT_WIDGET = document.getElementById("ai-widget-status-text");
const AI_STATUS_WIDGET = document.getElementById("ai-widget-status");
const PROGRESS_WRAP_WIDGET = document.getElementById("widget-ai-progress");
const PROGRESS_FILL_WIDGET = document.getElementById("widget-ai-progress-fill");
const PROGRESS_TEXT_WIDGET = document.getElementById("widget-ai-progress-text");

const FAB = document.getElementById("btn-ai-fab");
const WIDGET = document.getElementById("ai-chat-widget");
const CLOSE_WIDGET = document.getElementById("btn-close-chat");

// Local AI Server Configuration (like smart-data-extractor)
const LOCAL_AI_URL = "http://localhost:8000/v1/chat/completions";
const LOCAL_MODEL = "kimi-k2.5"; // Default from your other app

// FAB & Widget UI Toggles
FAB.addEventListener("click", () => {
    WIDGET.classList.toggle("hidden");
    if (!WIDGET.classList.contains("hidden")) {
        checkServerHealth();
    }
});

async function checkServerHealth() {
    AI_STATUS_WIDGET.classList.add("loading");
    AI_STATUS_TEXT_WIDGET.textContent = "בודק חיבור לשרת מקומי...";
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        // Try to fetch models to check if server is up
        const res = await fetch("http://localhost:8000/v1/models", { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            AI_STATUS_WIDGET.classList.remove("loading");
            AI_STATUS_WIDGET.classList.add("ready");
            AI_STATUS_TEXT_WIDGET.textContent = "מחובר לשרת מקומי";
        } else {
            throw new Error("Server not responding");
        }
    } catch (err) {
        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("error");
        AI_STATUS_TEXT_WIDGET.textContent = "שרת AI לא זמין (וודא ש-LM Studio/Ollama מורץ)";
    }
}

function appendMessage(role, text, container) {
    if (!container) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    const formatted = text.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    msgDiv.innerHTML = `<div class="msg-content">${formatted}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgDiv;
}

async function handleChat(inputEl, container) {
    const query = inputEl.value.trim();
    if (!query) return;

    inputEl.value = "";
    appendMessage("user", query, container);

    const allInsights = JSON.parse(localStorage.getItem("amarel_insights_v1") || "[]");
    const contextStr = allInsights.slice(-10).map(ins => 
        `מחלקה: ${ins.department}, משרה: ${ins.jobTitle}, תובנות: ${ins.insights}`
    ).join("\n");

    const messages = [
        { role: "system", content: "You are a helpful AI assistant for recruiters in Amarel company. Ground your answers in the provided context. Answer in Hebrew and be professional." },
        { role: "user", content: `הנה כמה תובנות מהמאגר שלנו:\n${contextStr}\n\nשאלה: ${query}\nענה בעברית.` }
    ];

    processRemoteAIRequest(messages, container);
}

async function processRemoteAIRequest(messages, container) {
    AI_STATUS_WIDGET.classList.add("loading");
    const aiMsgDiv = appendMessage("ai", "...", container);
    const msgContent = aiMsgDiv.querySelector(".msg-content");
    
    try {
        const response = await fetch(LOCAL_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LOCAL_MODEL,
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        const fullRes = data.choices[0].message.content;
        
        msgContent.innerHTML = fullRes.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        container.scrollTop = container.scrollHeight;
        
        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("ready");
    } catch (err) {
        console.error("Local AI Error:", err);
        msgContent.innerHTML = "שגיאה בתקשורת עם השרת המקומי. וודא שהשרת פועל בפורט 8000.";
        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("error");
    }
}

// Quick Actions Logic
document.querySelectorAll(".btn-chip").forEach(btn => {
    btn.addEventListener("click", async () => {
        const action = btn.dataset.action;

        const allInsights = JSON.parse(localStorage.getItem("amarel_insights_v1") || "[]");
        const contextStr = allInsights.slice(-10).map(ins => 
            `מחלקה: ${ins.department}, משרה: ${ins.jobTitle}, תובנות: ${ins.insights}`
        ).join("\n");

        let prompt = "";
        if (action === "summarize") {
            prompt = "סכם לי את 10 התובנות האחרונות מהמאגר ב-5 נקודות קצרות.";
            appendMessage("user", "סכם לי את התובנות האחרונות", WIDGET_MESSAGES);
        } else if (action === "analyze") {
            prompt = "מהן המגמות העיקריות שאתה רואה בתובנות האחרונות? האם יש שאלות או נושאים שחוזרים על עצמם?";
            appendMessage("user", "נתח מגמות במאגר", WIDGET_MESSAGES);
        } else if (action === "tips") {
            prompt = "תן לי 3 טיפים חשובים למנהל מגייס שמתכונן לראיון על סמך הידע שלך ועל סמך התובנות במאגר.";
            appendMessage("user", "טיפים לראיון", WIDGET_MESSAGES);
        }

        const messages = [
            { role: "system", content: "You are a professional recruiting assistant." },
            { role: "user", content: `הקשר:\n${contextStr}\n\nשאלה: ${prompt}\nענה בעברית.` }
        ];

        processRemoteAIRequest(messages, WIDGET_MESSAGES);
    });
});

// Event Listeners for Send buttons
if (WIDGET_SEND) {
    WIDGET_SEND.addEventListener("click", () => handleChat(WIDGET_INPUT, WIDGET_MESSAGES));
    WIDGET_INPUT.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChat(WIDGET_INPUT, WIDGET_MESSAGES);
        }
    });
}

if (VIEW_SEND) {
    VIEW_SEND.addEventListener("click", () => handleChat(VIEW_INPUT, VIEW_MESSAGES));
    VIEW_INPUT.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChat(VIEW_INPUT, VIEW_MESSAGES);
        }
    });
}

export function onEnterChat() {
    initEngine();
}
window.onEnterChat = onEnterChat;

