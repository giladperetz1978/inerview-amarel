/**
 * PDF (print) and Outlook / email export helpers.
 */
const ExportUtil = (() => {
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("he-IL", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso || "";
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function section(title, text) {
    if (!text || !String(text).trim()) return "";
    return `
      <div style="margin:14px 0;padding-top:10px;border-top:1px solid #e4e8ec;">
        <div style="color:#d94a1c;font-weight:700;margin-bottom:6px;">${escapeHtml(title)}</div>
        <div style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(text)}</div>
      </div>`;
  }

  function buildHtml(item) {
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>תובנות ראיון – ${escapeHtml(item.jobTitle)}</title>
  <style>
    body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #3d4a54; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #8a97a3; margin-bottom: 18px; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 8px; }
    .label { color: #8a97a3; font-size: 12px; }
    .val { font-weight: 600; }
    .brand { color: #f15a29; font-weight: 700; margin-bottom: 16px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="brand">Amarel · מאגר ותובנות ראיונות</div>
  <h1>${escapeHtml(item.jobTitle)}</h1>
  <div class="sub">נוצר: ${escapeHtml(formatDate(item.createdAt))}</div>
  <div class="grid">
    <div><div class="label">שם המנהל</div><div class="val">${escapeHtml(item.managerName)}</div></div>
    <div><div class="label">תפקיד המנהל</div><div class="val">${escapeHtml(item.managerRole)}</div></div>
    <div><div class="label">מחלקה</div><div class="val">${escapeHtml(item.department)}</div></div>
    <div><div class="label">שם המשרה</div><div class="val">${escapeHtml(item.jobTitle)}</div></div>
    <div><div class="label">שם המרואיין</div><div class="val">${escapeHtml(item.intervieweeName)}</div></div>
  </div>
  ${section("תובנות מהראיון", item.insights)}
  ${section("סיטואציות", item.situations)}
  ${section("מקרים ותגובות", item.cases)}
</body>
</html>`;
  }

  function plainText(item) {
    const lines = [
      "מאגר ותובנות ראיונות באמרל",
      "========================",
      `משרה: ${item.jobTitle}`,
      `מנהל: ${item.managerName}`,
      `תפקיד המנהל: ${item.managerRole}`,
      `מחלקה: ${item.department}`,
      `מרואיין: ${item.intervieweeName}`,
      `תאריך: ${formatDate(item.createdAt)}`,
      "",
    ];
    if (item.insights) {
      lines.push("תובנות מהראיון:", item.insights, "");
    }
    if (item.situations) {
      lines.push("סיטואציות:", item.situations, "");
    }
    if (item.cases) {
      lines.push("מקרים ותגובות:", item.cases, "");
    }
    return lines.join("\n");
  }

  function exportPdf(item) {
    const html = buildHtml(item);
    const win = window.open("", "_blank");
    if (!win) {
      throw new Error("הדפדפן חסם חלון קופץ. אפשר חלונות קופצים ונסה שוב.");
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Give the new document a moment to render before print
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  }

  function exportOutlook(item) {
    const subject = encodeURIComponent(
      `תובנות ראיון – ${item.jobTitle} | ${item.intervieweeName}`
    );
    const body = encodeURIComponent(plainText(item));
    // mailto opens default mail client (Outlook when configured)
    const href = `mailto:?subject=${subject}&body=${body}`;
    // Prefer location for broader Outlook Desktop compatibility
    window.location.href = href;
  }

  function downloadJsonBackup(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `amarel-insights-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    exportPdf,
    exportOutlook,
    plainText,
    buildHtml,
    downloadJsonBackup,
    formatDate,
  };
})();
