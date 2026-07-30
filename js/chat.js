
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
// החלפה סופית למודל Qwen 2.5 0.5B - פתוח לחלוטין ללא חסימות גוגל
const modelId = "onnx-community/Qwen2.5-0.5B-Instruct"; 

async function initEngine() {
    if (engine) return;

    try {
        AI_STATUS.classList.add("loading");
        AI_STATUS_TEXT.textContent = "מאתחל מנוע דור חדש (Qwen 2.5)...";
        PROGRESS_WRAP.style.display = "block";

        console.log("Loading Qwen 2.5...");
        
        // טעינת המודל עם הגדרות תואמות CPU/WebGPU
        engine = await pipeline('text-generation', modelId, {
            dtype: 'q4',
            device: 'webgpu', // ינסה WebGPU ואם ייכשל יעבור ל-CPU לבד
            progress_callback: (item) => {
                if (item.status === 'progress') {
                    const progress = Math.round(item.progress);
                    PROGRESS_FILL.style.width = `${progress}%`;
                    PROGRESS_TEXT.textContent = `טוען רכיב: ${progress}% - ${item.file}`;
                }
            }
        }).catch(async (err) => {
            console.warn("Retrying with explicit CPU...");
            return await pipeline('text-generation', modelId, {
                dtype: 'q4',
                device: 'cpu',
                progress_callback: (item) => {
                    if (item.status === 'progress') {
                        const progress = Math.round(item.progress);
                        PROGRESS_FILL.style.width = `${progress}%`;
                        PROGRESS_TEXT.textContent = `טוען (CPU): ${progress}% - ${item.file}`;
                    }
                }
            });
        });

        AI_STATUS.classList.remove("loading");
        AI_STATUS.classList.add("ready");
        AI_STATUS_TEXT.textContent = "הצ'אט מוכן לעבודה (V4)";
        setTimeout(() => {
            PROGRESS_WRAP.style.display = "none";
        }, 2000);
    } catch (err) {
        console.error("AI Init Error:", err);
        AI_STATUS_TEXT.textContent = "שגיאת טעינה.";
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

    const messages = [
        { role: "user", content: `Context: ${contextStr}\n\nQuestion: ${query}\n\nAnswer in Hebrew.` }
    ];

    try {
        AI_STATUS.classList.add("loading");
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
            max_new_tokens: 400,
            streamer,
            temperature: 0.7,
            do_sample: true,
        });

        AI_STATUS.classList.remove("loading");
    } catch (err) {
        console.error("Chat Error:", err);
        appendMessage("ai", "שגיאת עיבוד.");
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
