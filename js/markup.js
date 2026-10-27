/* تحويل نص بسيط إلى HTML آمن (يُستخدم في الدروس المضافة من لوحة الإدارة)
   ## عنوان          -> عنوان فرعي
   * بند  أو - بند   -> نقطة
   1. بند            -> قائمة مرقمة
   > نص              -> مربع معلومة
   !> نص             -> مربع تحذير
   **كلمة**          -> غامق
   سطر فاضي          -> فقرة جديدة */
(function () {
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
  var RE_H = /^##\s+(.*)$/, RE_UL = /^[*\-]\s+(.*)$/, RE_OL = /^\d+[.)]\s+(.*)$/, RE_BOX = /^(!?>)\s?(.*)$/;

  window.renderMarkup = function (src) {
    var lines = String(src == null ? "" : src).replace(/\r/g, "").split("\n"), out = [], i = 0, m;
    while (i < lines.length) {
      var t = lines[i].trim();
      if (!t) { i++; continue; }
      if ((m = RE_H.exec(t))) { out.push("<h2>" + inline(m[1]) + "</h2>"); i++; continue; }
      if (RE_UL.test(t)) {
        var li = [];
        while (i < lines.length && (m = RE_UL.exec(lines[i].trim()))) { li.push("<li>" + inline(m[1]) + "</li>"); i++; }
        out.push("<ul>" + li.join("") + "</ul>"); continue;
      }
      if (RE_OL.test(t)) {
        var ol = [];
        while (i < lines.length && (m = RE_OL.exec(lines[i].trim()))) { ol.push("<li>" + inline(m[1]) + "</li>"); i++; }
        out.push("<ol>" + ol.join("") + "</ol>"); continue;
      }
      if ((m = RE_BOX.exec(t))) {
        var warn = m[1] === "!>", rows = [];
        while (i < lines.length) {
          var ln = lines[i].trim();
          if (!ln || RE_H.test(ln) || RE_UL.test(ln) || RE_OL.test(ln)) break;
          if ((m = RE_BOX.exec(ln))) { if ((m[1] === "!>") !== warn) break; rows.push(inline(m[2])); }
          else rows.push(inline(ln));   // سطر عادي بعد المربع يكمّله
          i++;
        }
        out.push('<div class="box' + (warn ? " warn" : "") + '">' + rows.join("<br>") + "</div>"); continue;
      }
      var para = [];
      while (i < lines.length) {
        var s = lines[i].trim();
        if (!s || RE_H.test(s) || RE_UL.test(s) || RE_OL.test(s) || RE_BOX.test(s)) break;
        para.push(inline(s)); i++;
      }
      out.push("<p>" + para.join("<br>") + "</p>");
    }
    return out.join("\n");
  };

  /* قالب جاهز للمحرر */
  window.MARKUP_TEMPLATE = "جملة افتتاحية بتشرح فكرة الدرس.\n\n## معادلة أو خطوات\n* النقطة الأولى\n* النقطة التانية\n\n> مثال: قبل \"...\" وبعد \"...\"\n\n## نصيحة\nفقرة عادية. تقدر تكتب **كلمة غامقة**.\n\n!> تحذير مهم يظهر في مربع أحمر";
})();
