
import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js";

// Selectors for both View and Widget
const VIEW_INPUT = document.getElementById("chat-input");
const VIEW_SEND = document.getElementById("btn-chat-send");
const VIEW_MESSAGES = document.getElementById("chat-messages");

const WIDGET_INPUT = document.getElementById("widget-chat-input");
const WIDGET_SEND = document.getElementById("btn-widget-send");
const WIDGET_MESSAGES = document.getElementById("widget-messages");

const AI_STATUS_TEXT_WIDGET = document.getElementById("ai-widget-status-text");
const AI_STATUS_WIDGET = document.getElementById("ai-widget-status");
const AI_WIDGET_TITLE = document.getElementById("ai-widget-title");
const PROGRESS_WRAP_WIDGET = document.getElementById("widget-ai-progress");
const PROGRESS_FILL_WIDGET = document.getElementById("widget-ai-progress-fill");
const PROGRESS_TEXT_WIDGET = document.getElementById("widget-ai-progress-text");

const FAB = document.getElementById("btn-ai-fab");
const WIDGET = document.getElementById("ai-chat-widget");
const CLOSE_WIDGET = document.getElementById("btn-close-chat");

// AI Configuration 
const AI_CONFIG = {
    cloud: {
        baseUrl: "https://api.aionlabs.ai/v1",
        model: "aion-labs/aion-3.0",
        apiKey: "alv2_y3s3anuVjAxr-JOynSz1QyCPthA6Kz9Jff9Hm8rTz9E"
    },
    openrouter: {
        baseUrl: "https://openrouter.ai/api/v1",
        model: "deepseek/deepseek-r1",
        apiKey: localStorage.getItem("AI_OPENROUTER_KEY") || "" 
    },
    gemini: {
        baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        model: "gemini-1.5-flash",
        apiKey: "" || ""
    },
    local: {
        baseUrl: "http://localhost:8000/v1",
        model: "kimi-k2.5"
    }
};

let currentMode = "cloud"; // Default to AION Cloud as requested

// FAB & Widget UI Toggles
if (FAB) {
    FAB.addEventListener("click", () => {
        WIDGET.classList.toggle("hidden");
        if (!WIDGET.classList.contains("hidden")) {
            checkServerHealth();
        }
    });
}

if (CLOSE_WIDGET) {
    CLOSE_WIDGET.addEventListener("click", () => {
        WIDGET.classList.add("hidden");
    });
}

async function checkServerHealth() {
    AI_STATUS_WIDGET.classList.add("loading");
    AI_STATUS_TEXT_WIDGET.textContent = "בודק חיבור לשרתים...";
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        // Try local server first as preferred fallback
        const res = await fetch(`${AI_CONFIG.local.baseUrl}/models`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            currentMode = "local";
            if (AI_WIDGET_TITLE) AI_WIDGET_TITLE.textContent = "עוזר AI מקומי";
            AI_STATUS_WIDGET.classList.remove("loading");
            AI_STATUS_WIDGET.classList.add("ready");
            AI_STATUS_TEXT_WIDGET.textContent = "מחובר לשרת מקומי (מהיר)";
            return;
        }
    } catch (err) {
        // Local failed
    }

    // Default to AION Cloud provider
    currentMode = "cloud";
    if (AI_WIDGET_TITLE) AI_WIDGET_TITLE.textContent = "עוזר AI (ענן)";
    AI_STATUS_WIDGET.classList.remove("loading");
    AI_STATUS_WIDGET.classList.add("ready");
    AI_STATUS_TEXT_WIDGET.textContent = "מחובר לענן (AION)";
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
    if (AI_STATUS_WIDGET) AI_STATUS_WIDGET.classList.add("loading");
    const aiMsgDiv = appendMessage("ai", "...", container);
    const msgContent = aiMsgDiv.querySelector(".msg-content");
    
    const config = AI_CONFIG[currentMode];
    let url, body, headers;

    // Use placeholder directly if deployment didn't replace it (local testing)
    let rawKey = config.apiKey;
    let activeApiKey = rawKey.trim().replace(/^['"]|['"]$/g, '');
    
    // Safety check: if user included "Bearer " in the secret, strip it
    if (activeApiKey.toLowerCase().startsWith("bearer ")) {
        activeApiKey = activeApiKey.substring(7).trim();
    }
    
    // DEBUG: Logs key status to Console
    console.log(`DEBUG: Final key info: "${activeApiKey.substring(0, 5)}...${activeApiKey.slice(-5)}" (Total length: ${activeApiKey.length})`);
    if (activeApiKey === "alv2_y3s3anuVjAxr-JOynSz1QyCPthA6Kz9Jff9Hm8rTz9E") {
        console.warn("DEBUG: Replacement failure!");
    }

    try {
        if (currentMode === "gemini") {
            // Google Gemini Format
            url = `${config.baseUrl}/models/${config.model}:generateContent?key=${activeApiKey}`;
            headers = { 'Content-Type': 'application/json' };
            
            const systemMsg = messages.find(m => m.role === "system")?.content || "";
            const userMessages = messages.filter(m => m.role !== "system");
            
            body = {
                contents: userMessages.map(msg => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                })),
                generationConfig: { temperature: 0.7 }
            };

            if (systemMsg) {
                body.systemInstruction = { parts: [{ text: systemMsg }] };
            }
        } else {
            // OpenAI Compatible Format (Moonshot, OpenRouter, Local)
            url = `${config.baseUrl}/chat/completions`;
            headers = { 'Content-Type': 'application/json' };
            if (activeApiKey) {
                headers['Authorization'] = `Bearer ${activeApiKey}`;
            }
            body = {
                model: config.model,
                messages: messages,
                temperature: 0.7
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = "API Error";
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || errorData.message || `Status ${response.status}`;
            } catch (e) {
                errorMessage = `Status ${response.status}: ${errorText.substring(0, 50)}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        let fullRes;
        if (currentMode === "gemini") {
            fullRes = data.candidates?.[0]?.content?.parts?.[0]?.text || "סליחה, לא התקבלה תשובה.";
        } else {
            fullRes = data.choices[0].message.content;
        }
        
        msgContent.innerHTML = fullRes.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        container.scrollTop = container.scrollHeight;
        
        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("ready");
    } catch (err) {
        console.error("AI Error:", err);
        const keyStart = activeApiKey.substring(0, 4);
        msgContent.innerHTML = `שגיאה בתקשורת: ${err.message}<br><small style="opacity:0.5">KeyDebug: ${keyStart}... (Len: ${activeApiKey.length})</small>`;
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

