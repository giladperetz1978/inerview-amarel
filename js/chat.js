/**
 * Amarel Interview Insights - AI Assistant Engine & UI
 * Supports Smart Local In-Browser Analysis (Zero dependencies/No API key required)
 * as well as Automatic Insight Extraction & 1-Click Saving from Natural Language Chat.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "amarel_ai_config_v1";

  // Elements - View & Widget
  const VIEW_INPUT = document.getElementById("chat-input");
  const VIEW_SEND = document.getElementById("btn-chat-send");
  const VIEW_MESSAGES = document.getElementById("chat-messages");
  const VIEW_STATUS_TEXT = document.getElementById("ai-view-status-text");

  const WIDGET_INPUT = document.getElementById("widget-chat-input");
  const WIDGET_SEND = document.getElementById("btn-widget-send");
  const WIDGET_MESSAGES = document.getElementById("widget-messages");
  const WIDGET_STATUS = document.getElementById("ai-widget-status");
  const WIDGET_STATUS_TEXT = document.getElementById("ai-widget-status-text");
  const WIDGET_TITLE = document.getElementById("ai-widget-title");

  const FAB = document.getElementById("btn-ai-fab");
  const WIDGET = document.getElementById("ai-chat-widget");
  const CLOSE_WIDGET = document.getElementById("btn-close-chat");

  // Settings Modal Elements
  const SETTINGS_MODAL = document.getElementById("ai-settings-modal");
  const SETTINGS_CLOSE = document.getElementById("ai-settings-close");
  const SETTINGS_CANCEL = document.getElementById("btn-cancel-ai-settings");
  const SETTINGS_SAVE = document.getElementById("btn-save-ai-settings");
  const PROVIDER_SELECT = document.getElementById("ai-provider-select");
  const FIELD_API_KEY = document.getElementById("field-api-key");
  const FIELD_SERVER_URL = document.getElementById("field-server-url");
  const INPUT_API_KEY = document.getElementById("ai-api-key-input");
  const INPUT_SERVER_URL = document.getElementById("ai-server-url-input");

  function getAIConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {
      provider: "smart_local",
      apiKey: "",
      serverUrl: "http://localhost:11434/v1",
    };
  }

  function saveAIConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    updateStatusUI();
  }

  function updateStatusUI() {
    const cfg = getAIConfig();
    let statusText = "מנוע מקומי חכם פעיל";
    let isReady = true;

    if (cfg.provider === "gemini") {
      statusText = cfg.apiKey ? "מחובר ל-Google Gemini" : "נדרש מפתח Gemini API";
      isReady = Boolean(cfg.apiKey);
    } else if (cfg.provider === "openai") {
      statusText = cfg.apiKey ? "מחובר ל-OpenAI/OpenRouter" : "נדרש מפתח API";
      isReady = Boolean(cfg.apiKey);
    } else if (cfg.provider === "custom_local") {
      statusText = `שרת מקומי (${cfg.serverUrl || "localhost"})`;
    }

    if (WIDGET_STATUS_TEXT) WIDGET_STATUS_TEXT.textContent = statusText;
    if (VIEW_STATUS_TEXT) VIEW_STATUS_TEXT.textContent = statusText;

    if (WIDGET_STATUS) {
      WIDGET_STATUS.className = `ai-status ${isReady ? "ready" : "error"}`;
    }
    if (WIDGET_TITLE) {
      WIDGET_TITLE.textContent =
        cfg.provider === "smart_local" ? "עוזר AI מקומי" : "עוזר AI (מונע API)";
    }
  }

  function openSettingsModal() {
    const cfg = getAIConfig();
    if (PROVIDER_SELECT) PROVIDER_SELECT.value = cfg.provider;
    if (INPUT_API_KEY) INPUT_API_KEY.value = cfg.apiKey || "";
    if (INPUT_SERVER_URL) INPUT_SERVER_URL.value = cfg.serverUrl || "";
    onProviderChange();
    if (SETTINGS_MODAL) SETTINGS_MODAL.classList.add("open");
  }

  function closeSettingsModal() {
    if (SETTINGS_MODAL) SETTINGS_MODAL.classList.remove("open");
  }

  function onProviderChange() {
    const val = PROVIDER_SELECT?.value;
    if (FIELD_API_KEY) {
      FIELD_API_KEY.style.display =
        val === "gemini" || val === "openai" ? "block" : "none";
    }
    if (FIELD_SERVER_URL) {
      FIELD_SERVER_URL.style.display = val === "custom_local" ? "block" : "none";
    }
  }

  document.getElementById("btn-open-ai-settings-widget")?.addEventListener("click", openSettingsModal);
  document.getElementById("btn-open-ai-settings-view")?.addEventListener("click", openSettingsModal);
  SETTINGS_CLOSE?.addEventListener("click", closeSettingsModal);
  SETTINGS_CANCEL?.addEventListener("click", closeSettingsModal);
  PROVIDER_SELECT?.addEventListener("change", onProviderChange);

  SETTINGS_SAVE?.addEventListener("click", () => {
    const config = {
      provider: PROVIDER_SELECT.value,
      apiKey: INPUT_API_KEY.value.trim(),
      serverUrl: INPUT_SERVER_URL.value.trim() || "http://localhost:11434/v1",
    };
    saveAIConfig(config);
    closeSettingsModal();
  });

  if (FAB && WIDGET) {
    FAB.addEventListener("click", () => {
      WIDGET.classList.toggle("hidden");
    });
  }

  if (CLOSE_WIDGET && WIDGET) {
    CLOSE_WIDGET.addEventListener("click", () => {
      WIDGET.classList.add("hidden");
    });
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function appendMessage(role, text, container, extractedData = null) {
    if (!container) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
    const formatted = String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    let cardHtml = "";
    if (extractedData) {
      cardHtml = `
        <div class="chat-extracted-card">
          <h4>✨ תוכן שחולץ אוטומטית</h4>
          <div class="grid-fields">
            <div class="field-item"><span class="lbl">שם המנהל:</span><span class="val">${escapeHtml(extractedData.managerName)}</span></div>
            <div class="field-item"><span class="lbl">תפקיד המנהל:</span><span class="val">${escapeHtml(extractedData.managerRole)}</span></div>
            <div class="field-item"><span class="lbl">מחלקה:</span><span class="val">${escapeHtml(extractedData.department)}</span></div>
            <div class="field-item"><span class="lbl">שם המשרה:</span><span class="val">${escapeHtml(extractedData.jobTitle)}</span></div>
            <div class="field-item"><span class="lbl">שם המרואיין:</span><span class="val">${escapeHtml(extractedData.intervieweeName)}</span></div>
          </div>
          ${extractedData.insights ? `<div style="margin-bottom:8px;font-size:0.85rem;"><strong>תובנות:</strong> ${escapeHtml(extractedData.insights)}</div>` : ""}
          <button type="button" class="btn btn-primary btn-save-extracted">💾 שמירה למאגר המרכזי</button>
        </div>`;
    }

    msgDiv.innerHTML = `<div class="msg-content">${formatted}${cardHtml}</div>`;
    container.appendChild(msgDiv);

    if (extractedData) {
      const saveBtn = msgDiv.querySelector(".btn-save-extracted");
      saveBtn?.addEventListener("click", async () => {
        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "שומר...";
          if (window.Storage && typeof window.Storage.saveInsight === "function") {
            await window.Storage.saveInsight(extractedData);
          } else {
            const list = JSON.parse(localStorage.getItem("amarel_insights_v1") || "[]");
            list.unshift({ ...extractedData, id: `id_${Date.now()}`, createdAt: new Date().toISOString() });
            localStorage.setItem("amarel_insights_v1", JSON.stringify(list));
          }
          saveBtn.textContent = "✓ נשמר בהצלחה במאגר!";
          saveBtn.classList.remove("btn-primary");
          saveBtn.classList.add("btn-secondary");
          
          if (typeof window.toast === "function") window.toast("הרשומה נשמרה במאגר!", "success");
          // Refresh views if available
          if (typeof window.refreshHome === "function") window.refreshHome();
          if (typeof window.refreshDatalists === "function") window.refreshDatalists();
        } catch (err) {
          console.error("Save error:", err);
          saveBtn.disabled = false;
          saveBtn.textContent = "שגיאה בשמירה - נסה שוב";
        }
      });
    }

    container.scrollTop = container.scrollHeight;
    return msgDiv;
  }

  function getInsightsData() {
    try {
      if (window.Storage && typeof window.Storage.getInsights === "function") {
        return window.Storage.getInsights();
      }
      return JSON.parse(localStorage.getItem("amarel_insights_v1") || "[]");
    } catch (e) {
      return [];
    }
  }

  // --- AUTOMATIC INSIGHT EXTRACTION FROM NATURAL TEXT ---
  function parseInsightFromNaturalText(text) {
    const t = String(text || "").trim();
    if (t.length < 12) return null;

    const lower = t.toLowerCase();
    const keywords = ["ראיינתי", "ראיון", "מועמד", "מנהל", "מחלקה", "תובנה", "משרה", "סיטואציה", "מקרים"];
    const matchesKeyword = keywords.some((k) => lower.includes(k));
    if (!matchesKeyword) return null;

    // Pattern Extractors
    const extractPattern = (regexes, fallback = "") => {
      for (const r of regexes) {
        const match = t.match(r);
        if (match && match[1]) return match[1].trim();
      }
      return fallback;
    };

    const intervieweeName = extractPattern([
      /(?:מרואיין|מועמד|את|עם)\s*:?\s*([א-תA-Za-z\s]{2,20})(?=\s+(?:לתפקיד|במחלקה|מנהל|שם|תובנה|$))/i,
      /(?:ראיינתי|ראיון עם)\s+([א-תA-Za-z\s]{2,20})/i,
    ], "מועמד חדש");

    const jobTitle = extractPattern([
      /(?:משרה|לתפקיד|משרת|תפקיד)\s*:?\s*([א-תA-Za-z0-9\/\s]{2,30})(?=\s+(?:במחלקה|מנהל|מועמד|תובנה|$))/i,
      /(?:פיתוח|מפתח|אינטגרציה|מהנדס|בודק|מנהל)\s*[א-תA-Za-z0-9\/\s]{0,20}/i,
    ], "משרה מיועדת");

    const department = extractPattern([
      /(?:מחלקה|מחלקת)\s*:?\s*([א-תA-Za-z\s]{2,20})(?=\s+|$)/i,
    ], "אינטגרציה");

    const managerName = extractPattern([
      /(?:מנהל מגייס|מנהל|שם המנהל)\s*:?\s*([א-תA-Za-z\s]{2,20})/i,
    ], "מנהל מגייס");

    const managerRole = extractPattern([
      /(?:תפקיד המנהל|תפקיד מנהל)\s*:?\s*([א-תA-Za-z\s]{2,20})/i,
    ], "מנהל צוות");

    // Clean text for insights
    let insights = t;
    if (t.includes("תובנה:") || t.includes("תובנות:")) {
      insights = t.split(/תובנה:|תובנות:/i)[1]?.trim() || t;
    }

    return {
      managerName: managerName.slice(0, 30),
      managerRole: managerRole.slice(0, 30),
      department: department.slice(0, 30),
      jobTitle: jobTitle.slice(0, 40),
      intervieweeName: intervieweeName.slice(0, 30),
      insights: insights,
      situations: "",
      cases: "",
    };
  }

  function generateSmartLocalResponse(query, actionType = null) {
    const insights = getInsightsData();
    const q = String(query || "").trim().toLowerCase();

    // Check if this input is a new interview entry to extract
    const extracted = parseInsightFromNaturalText(query);

    if (actionType === "summarize" || q.includes("סיכום") || q.includes("סכם")) {
      if (!insights.length) return "עדיין אין תובנות במאגר. הוסיפו ראיונות ראשונים!";
      const top = insights.slice(0, 5);
      const deps = [...new Set(insights.map((i) => i.department))].join(", ");
      let res = `**📋 סיכום תובנות ממאגר הראיונות (${insights.length} רשומות):**\n\n`;
      res += `* **מחלקות פעילות:** ${deps}\n\n`;
      res += `**5 התובנות האחרונות שנרשמו:**\n`;
      top.forEach((item, idx) => {
        const textSnippet = item.insights || item.situations || item.cases || "ללא פירוט";
        res += `\n**${idx + 1}. ${item.jobTitle}** (${item.department})\n`;
        res += `• מנהל/ת: ${item.managerName} | מרואיין/ת: ${item.intervieweeName}\n`;
        res += `• תובנה: ${textSnippet.slice(0, 120)}${textSnippet.length > 120 ? "..." : ""}\n`;
      });
      return { text: res, extracted: null };
    }

    if (actionType === "analyze" || q.includes("מגמה") || q.includes("ניתוח")) {
      if (!insights.length) return { text: "אין מספיק נתונים לניתוח מגמות. הוסיפו תובנות ראשונות!", extracted: null };
      const depMap = {};
      const jobMap = {};
      insights.forEach((i) => {
        depMap[i.department] = (depMap[i.department] || 0) + 1;
        jobMap[i.jobTitle] = (jobMap[i.jobTitle] || 0) + 1;
      });

      const topDeps = Object.entries(depMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
      const topJobs = Object.entries(jobMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");

      let res = `**📊 ניתוח מגמות ונתונים מתוך המאגר:**\n\n`;
      res += `• **סך הכל תובנות מוקלטות:** ${insights.length}\n`;
      res += `• **המחלקות הפעילות ביותר:** ${topDeps}\n`;
      res += `• **המשרות הנפוצות ביותר:** ${topJobs}\n`;
      return { text: res, extracted: null };
    }

    if (actionType === "tips" || q.includes("טיפ") || q.includes("המלצ")) {
      let res = `**💡 3 טיפים זהב למנהל/ת מגייס/ת באמרל:**\n\n`;
      res += `1. **מיקוד בשאלות התנהגותיות (STAR):** בקשו מהמועמד/ת לתאר סיטואציה ממשית, משימה, פעולה ותוצאה.\n\n`;
      res += `2. **בדיקת התאמה לצוות:** בדקו התמודדות עם שינויים ועבודה תחת עומס.\n\n`;
      res += `3. **תיעוד מיידי בסיום הראיון:** זינו את התובנות שלכם בטופס או בצ'אט מיד בתום הראיון.\n`;
      return { text: res, extracted: null };
    }

    if (extracted) {
      return {
        text: `זיהיתי ששיתפת פרטי ראיון חדש! הנה הנתונים שחולצו מהטקסט. תוכל לשמור אותם בלחיצה אחת למאגר:`,
        extracted: extracted,
      };
    }

    // Default Keyword Search Response
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    const matches = insights.filter((item) => {
      const hay = [
        item.managerName,
        item.managerRole,
        item.department,
        item.jobTitle,
        item.intervieweeName,
        item.insights,
        item.situations,
        item.cases,
      ].join(" ").toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });

    if (matches.length > 0) {
      let res = `**נמצאו ${matches.length} תובנות מתאימות לשאלה שלך:**\n\n`;
      matches.slice(0, 3).forEach((item, idx) => {
        res += `**${idx + 1}. משרה: ${item.jobTitle}** (${item.department})\n`;
        res += `• מנהל/ת: ${item.managerName} | מרואיין/ת: ${item.intervieweeName}\n`;
        if (item.insights) res += `• **תובנות:** ${item.insights}\n`;
        res += `\n`;
      });
      return { text: res, extracted: null };
    }

    return {
      text: `סרקתי את המאגר. לא נמצאה התאמה ישירה למילים "${query}".\n\nתוכל לכתוב לי תובנות מראיון בלשון חופשית (למשל: *"ראיינתי את ישראל לתפקיד מפתח במחלקת ניסויים..."*) ואני אסווג ואשמור אותן עבורך!`,
      extracted: null,
    };
  }

  async function processRemoteAIRequest(messages, container, cfg, fallbackQuery) {
    const aiMsgDiv = appendMessage("ai", "מעבד תשובה...", container);
    const msgContent = aiMsgDiv.querySelector(".msg-content");

    try {
      let url, body, headers;
      const apiKey = cfg.apiKey;

      if (cfg.provider === "gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        headers = { "Content-Type": "application/json" };
        const systemMsg = messages.find((m) => m.role === "system")?.content || "";
        const userMsgs = messages.filter((m) => m.role !== "system");
        body = {
          contents: userMsgs.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        };
        if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
      } else {
        const baseUrl =
          cfg.provider === "custom_local"
            ? cfg.serverUrl || "http://localhost:11434/v1"
            : "https://api.openai.com/v1";
        url = `${baseUrl}/chat/completions`;
        headers = { "Content-Type": "application/json" };
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
        body = {
          model: cfg.provider === "custom_local" ? "llama3" : "gpt-3.5-turbo",
          messages: messages,
          temperature: 0.7,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`שגיאת API (${response.status})`);
      }

      const data = await response.json();
      let fullRes = "";
      if (cfg.provider === "gemini") {
        fullRes = data.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מ-Gemini.";
      } else {
        fullRes = data.choices?.[0]?.message?.content || "לא התקבלה תשובה.";
      }

      // Check if response contains structured insight JSON
      msgContent.innerHTML = fullRes
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      container.scrollTop = container.scrollHeight;
    } catch (err) {
      console.warn("Remote AI request failed, falling back to Smart Local:", err);
      const localResult = generateSmartLocalResponse(fallbackQuery);
      msgContent.innerHTML =
        `<small style="color:var(--orange); display:block; margin-bottom:6px;">⚠️ מעבר למנוע מקומי:</small>` +
        localResult.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      container.scrollTop = container.scrollHeight;
    }
  }

  async function handleChat(inputEl, container, actionType = null) {
    const query = inputEl ? inputEl.value.trim() : "";
    if (!query && !actionType) return;

    if (inputEl) inputEl.value = "";

    const userLabel = actionType === "summarize"
      ? "סיכום תובנות"
      : actionType === "analyze"
      ? "ניתוח מגמות"
      : actionType === "tips"
      ? "טיפים לראיון"
      : query;

    appendMessage("user", userLabel, container);

    const cfg = getAIConfig();

    if (cfg.provider === "smart_local" || (!cfg.apiKey && cfg.provider !== "custom_local")) {
      setTimeout(() => {
        const res = generateSmartLocalResponse(query || userLabel, actionType);
        appendMessage("ai", res.text, container, res.extracted);
      }, 150);
      return;
    }

    const insights = getInsightsData();
    const contextStr = insights
      .slice(-10)
      .map((ins) => `מחלקה: ${ins.department}, משרה: ${ins.jobTitle}, תובנות: ${ins.insights}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: "You are a recruiting assistant for Amarel. Answer in Hebrew.",
      },
      {
        role: "user",
        content: `הקשר:\n${contextStr}\n\nשאלה: ${userLabel}\nענה בעברית.`,
      },
    ];

    processRemoteAIRequest(messages, container, cfg, userLabel);
  }

  document.querySelectorAll(".btn-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const targetContainer =
        WIDGET && !WIDGET.classList.contains("hidden")
          ? WIDGET_MESSAGES
          : VIEW_MESSAGES;
      handleChat(null, targetContainer, action);
    });
  });

  if (WIDGET_SEND && WIDGET_INPUT) {
    WIDGET_SEND.addEventListener("click", () => handleChat(WIDGET_INPUT, WIDGET_MESSAGES));
    WIDGET_INPUT.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChat(WIDGET_INPUT, WIDGET_MESSAGES);
      }
    });
  }

  if (VIEW_SEND && VIEW_INPUT) {
    VIEW_SEND.addEventListener("click", () => handleChat(VIEW_INPUT, VIEW_MESSAGES));
    VIEW_INPUT.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChat(VIEW_INPUT, VIEW_MESSAGES);
      }
    });
  }

  updateStatusUI();
})();
