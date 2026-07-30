
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

let engine = null;
const modelId = "onnx-community/Qwen2.5-0.5B-Instruct"; 

// FAB & Widget UI Toggles
FAB.addEventListener("click", () => {
    WIDGET.classList.toggle("hidden");
    if (!WIDGET.classList.contains("hidden")) {
        initEngine();
    }
});

CLOSE_WIDGET.addEventListener("click", () => {
    WIDGET.classList.add("hidden");
});

async function initEngine() {
    if (engine) return;

    try {
        AI_STATUS_WIDGET.classList.add("loading");
        AI_STATUS_TEXT_WIDGET.textContent = "מאתחל מנוע AI...";
        PROGRESS_WRAP_WIDGET.style.display = "block";

        // Attempting a safer initialization for Qwen 2.5
        engine = await pipeline('text-generation', modelId, {
            dtype: 'q4', // Using quantized 4-bit for smaller memory footprint
            device: 'webgpu',
            progress_callback: (item) => {
                if (item.status === 'progress') {
                    const progress = Math.round(item.progress);
                    PROGRESS_FILL_WIDGET.style.width = `${progress}%`;
                    PROGRESS_TEXT_WIDGET.textContent = `טוען רכיבים: ${progress}%`;
                }
            }
        }).catch(async (err) => {
            console.warn("WebGPU not supported or failed, falling back to CPU...", err);
            return await pipeline('text-generation', modelId, {
                dtype: 'fp32', // Some CPUs handle fp32 better than q4 if they lack specific instructions
                device: 'cpu',
                progress_callback: (item) => {
                    if (item.status === 'progress') {
                        const progress = Math.round(item.progress);
                        PROGRESS_FILL_WIDGET.style.width = `${progress}%`;
                        PROGRESS_TEXT_WIDGET.textContent = `טוען (מצב תאימות): ${progress}%`;
                    }
                }
            });
        });

        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("ready");
        AI_STATUS_TEXT_WIDGET.textContent = "AI מוכן";
        setTimeout(() => {
            PROGRESS_WRAP_WIDGET.style.display = "none";
        }, 1500);
    } catch (err) {
        console.error("AI Init Error:", err);
        AI_STATUS_WIDGET.classList.remove("loading");
        AI_STATUS_WIDGET.classList.add("error");
        AI_STATUS_TEXT_WIDGET.textContent = `שגיאת טעינה: ${err.message.slice(0, 30)}...`;
        PROGRESS_TEXT_WIDGET.textContent = "נסו לרענן או לבדוק חיבור אינטרנט.";
        PROGRESS_WRAP_WIDGET.style.display = "block";
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
    if (!query || !engine) return;

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

    processAIRequest(messages, container);
}

async function processAIRequest(messages, container) {
    try {
        AI_STATUS_WIDGET.classList.add("loading");
        const aiMsgDiv = appendMessage("ai", "...", container);
        const msgContent = aiMsgDiv.querySelector(".msg-content");
        let fullRes = "";
        
        const streamer = new TextStreamer(engine.tokenizer, {
            skip_prompt: true,
            callback_function: (text) => {
                fullRes += text;
                msgContent.innerHTML = fullRes.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                container.scrollTop = container.scrollHeight;
            }
        });

        await engine(messages, {
            max_new_tokens: 500,
            streamer,
            temperature: 0.6,
            do_sample: true,
        });

        AI_STATUS_WIDGET.classList.remove("loading");
    } catch (err) {
        console.error("Chat Error:", err);
        appendMessage("ai", "שגיאת עיבוד.", container);
        AI_STATUS_WIDGET.classList.remove("loading");
    }
}

// Quick Actions Logic
document.querySelectorAll(".btn-chip").forEach(btn => {
    btn.addEventListener("click", async () => {
        const action = btn.dataset.action;
        if (!engine) return;

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

        processAIRequest(messages, WIDGET_MESSAGES);
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

