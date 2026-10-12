// Turns the AI's reply (light Markdown) into safe HTML. Used on the results
// page and for the emailed copy. Everything is escaped first, so nothing the
// AI or a visitor writes can become markup of its own.

export const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?!\w)/g, "$1<em>$2</em>");
}

export function renderMarkdown(markdown) {
  const out = [];
  let list = null;
  let para = [];
  const endPara = () => {
    if (para.length) out.push(`<p>${para.join("<br>")}</p>`);
    para = [];
  };
  const endList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const item = (kind, html) => {
    endPara();
    if (list !== kind) {
      endList();
      out.push(`<${kind}>`);
      list = kind;
    }
    out.push(html);
  };

  for (const raw of String(markdown).split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if (!line) {
      endPara();
    } else if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      endPara();
      endList();
      const level = Math.min(m[1].length + 1, 4);
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      endPara();
      endList();
      out.push("<hr>");
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      item("ul", `<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^(\d{1,3})[.)]\s+(.*)$/))) {
      // The number is kept, so a list split by a paragraph carries on counting.
      item("ol", `<li value="${m[1]}">${inline(m[2])}</li>`);
    } else {
      endList();
      para.push(inline(line));
    }
  }
  endPara();
  endList();
  return out.join("\n");
}
