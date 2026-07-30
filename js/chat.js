
import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0";

const CHAT_INPUT = document.getElementById("chat-input");
const CHAT_SEND = document.getElementById("btn-chat-send");
const CHAT_MESSAGES = document.getElementById("chat-messages");
const AI_STATUS_TEXT = document.getElementById("ai-status-text");
const AI_STATUS = document.getElementById("ai-status");
const PROGRESS_WRAP = document.getElementById("ai-progress");
const PROGRESS_FILL = document.getElementById("ai-progress-fill");
const PROGRESS_TEXT = document.getElementById("ai-progress-text");

let engine = null;
// מודל Gemma 2 2B מותאם ל-Transformers.js (Quantized)
const modelId = "onnx-community/gemma-2-2b-it-ONNX"; 

async function initEngine() {
    if (engine) return;

    try {
        AI_STATUS.classList.add("loading");
        AI_STATUS_TEXT.textContent = "מאתחל את Gemma 2 2B (הורדה ראשונית גדולה)...";
        PROGRESS_WRAP.style.display = "block";

        engine = await pipeline('text-generation', modelId, {
            dtype: 'q4', // 4-bit quantization לחיסכון במקום וזיכרון
            device: 'webgpu', // ינסה GPU, אם לא יצליח יעבור אוטומטית ל-CPU
            progress_callback: (item) => {
                if (item.status === 'progress') {
                    const progress = Math.round(item.progress);
                    PROGRESS_FILL.style.width = `${progress}%`;
                    PROGRESS_TEXT.textContent = `מוריד רכיב: ${progress}% - ${item.file} (נפח כולל ~1.4GB)`;
                }
            }
        });

        AI_STATUS.classList.remove("loading");
        AI_STATUS.classList.add("ready");
        AI_STATUS_TEXT.textContent = "Gemma 2 2B מוכן מקומית";
        setTimeout(() => {
            PROGRESS_WRAP.style.display = "none";
        }, 2000);
    } catch (err) {
        console.error("AI Init Error:", err);
        AI_STATUS_TEXT.textContent = "שגיאה בטעינת Gemma. המכשיר כנראה חלש מדי.";
        PROGRESS_TEXT.textContent = "שגיאה: " + err.message;
        AI_STATUS.classList.remove("loading");
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    const formatted = text.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    msgDiv.innerHTML = `<div class="msg-content">${formatted}</div>`;
    CHAT_MESSAGES.appendChild(msgDiv);
    CHAT_MESSAGES.scrollTop = CHAT_MESSAGES.scrollHeight;
    return msgDiv;
}

async function handleChat() {
    const query = CHAT_INPUT.value.trim();
    if (!query || !engine) return;

    CHAT_INPUT.value = "";
    appendMessage("user", query);

    const allInsights = JSON.parse(localStorage.getItem("amarel_insights") || "[]");
    const contextStr = allInsights.slice(-10).map(ins => 
        `מחלקה: ${ins.department}, משרה: ${ins.jobTitle}, תובנות: ${ins.insights}`
    ).join("\n");

    const systemPrompt = `You are an AI assistant for Amarel recruitment.
Analyze based on these interview insights:
${contextStr}
Answer in Hebrew.`;

    const messages = [
        { role: "user", content: `${systemPrompt}\n\nQuestion: ${query}` }
    ];

    try {
        AI_STATUS.classList.add("loading");
        AI_STATUS_TEXT.textContent = "Gemma חושבת...";

        const aiMsgDiv = appendMessage("ai", "");
        const msgContent = aiMsgDiv.querySelector(".msg-content");
        let fullRes = "";
        
        const streamer = new TextStreamer(engine.tokenizer, {
            skip_prompt: true,
            callback_function: (text) => {
                fullRes += text;
                msgContent.innerHTML = fullRes.replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
                CHAT_MESSAGES.scrollTop = CHAT_MESSAGES.scrollHeight;
            }
        });

        await engine(messages, {
            max_new_tokens: 500,
            streamer,
            temperature: 0.6,
            do_sample: true,
        });

        AI_STATUS.classList.remove("loading");
        AI_STATUS_TEXT.textContent = "מוכן";
    } catch (err) {
        console.error("Chat Error:", err);
        appendMessage("ai", "שגיאה בעיבוד. ייתכן שחסר זיכרון (RAM) במכשיר.");
        AI_STATUS.classList.remove("loading");
    }
}

CHAT_SEND.addEventListener("click", handleChat);
CHAT_INPUT.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChat();
    }
});

export function onEnterChat() {
    initEngine();
}

window.onEnterChat = onEnterChat;
