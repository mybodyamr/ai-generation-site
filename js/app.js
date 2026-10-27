(function () {
  var C = window.SITE_CONFIG, $ = function (s) { return document.querySelector(s); };
  var app = $("#app");
  var KEY = "aigen_state_v1";

  /* ---------- الحالة (محفوظة على جهاز الطالب) ---------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }
  var S = load();
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) return s; } catch (e) {}
    return { id: null, name: "", age: null, goal: null, level: 1, lessons: {}, exams: {}, challenge: null, placementDone: false };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------- Supabase (اختياري) ---------- */
  var sb = null;
  if (C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase) {
    try { sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
  }
  var studentSynced = false;
  function ensureStudent() {
    if (!sb || !S.id) return Promise.resolve(false);
    if (studentSynced) return Promise.resolve(true);
    return sb.from("students").insert({ id: S.id, nickname: S.name, age: S.age, goal: S.goal }).then(function (r) {
      // لو الطالب موجود قبل كده (تكرار مفتاح) نعتبره متزامن
      if (!r.error || (r.error.code === "23505")) { studentSynced = true; return true; }
      return false;
    }, function () { return false; });
  }
  function track(kind, item, score, total) {
    if (!sb || !S.id) return;
    ensureStudent().then(function (ok) {
      if (!ok) return;
      sb.from("events").insert({ student_id: S.id, kind: kind, item: String(item), score: score == null ? null : score, total: total == null ? null : total }).then(function () {}, function () {});
    });
  }

  /* ---------- أدوات ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function lessonById(id) { return LESSONS.filter(function (l) { return l.id === id; })[0]; }
  function lessonsOf(lv) { return LESSONS.filter(function (l) { return l.level === lv; }); }
  function goalById(id) { return GOALS.filter(function (g) { return g.id === id; })[0]; }
  function levelsList() {
    var set = {}; LESSONS.forEach(function (l) { set[l.level] = 1; });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }
  function levelInfo(lv) { return LEVELS[lv] || { title: "المستوى " + lv, desc: "" }; }
  function doneCount(lv) { return lessonsOf(lv).filter(function (l) { return S.lessons[l.id]; }).length; }
  function render(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function go(h) { location.hash = h; }

  /* ---------- مشغل الاختبار العام ---------- */
  function runQuiz(box, questions, onDone, opts) {
    opts = opts || {};
    var i = 0, correct = 0, answered = false;
    function show() {
      var q = questions[i]; answered = false;
      var pct = Math.round(i / questions.length * 100);
      box.innerHTML = '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<p class="note">سؤال ' + (i + 1) + " من " + questions.length + "</p>" +
        "<h3>" + esc(q.q) + "</h3>" +
        q.o.map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") +
        '<div id="fb"></div>';
      box.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () {
          if (answered) return; answered = true;
          var k = +b.getAttribute("data-k");
          var opts2 = box.querySelectorAll(".opt");
          opts2[q.a].classList.add("right");
          if (k === q.a) correct++; else b.classList.add("wrong");
          $("#fb").innerHTML = '<div class="explain"><b>' + (k === q.a ? "✅ صح!" : "❌ مش دقيق.") + "</b> " + esc(q.e) + '</div><button class="btn" id="nx">' + (i === questions.length - 1 ? "شوف نتيجتك" : "التالي") + "</button>";
          $("#nx").onclick = function () { i++; if (i < questions.length) show(); else onDone(correct, questions.length); };
        };
      });
    }
    show();
  }

  /* ---------- الصفحات ---------- */
  var pages = {};

  pages.home = function () {
    var total = LESSONS.length;
    var done = LESSONS.filter(function (l) { return S.lessons[l.id]; }).length;
    var hello = S.name ? "أهلاً يا " + esc(S.name) + " 👋" : "";
    render(
      '<section class="hero"><h1>تعلّم الذكاء الاصطناعي صح وبأمان</h1>' +
      "<p>دروس قصيرة واختبارات وتحديات، بالعامية، لأولادنا من 13 لـ 18 سنة. مجاناً.</p>" +
      (S.id && S.placementDone ?
        '<a class="btn light" href="#/path">كمّل رحلتك</a>' :
        '<a class="btn light" href="#/start">ابدأ من هنا</a>') +
      '<div class="stats"><div class="stat">📖 ' + total + " دروس</div><div class=\"stat\">📝 اختبارات وامتحانات</div><div class=\"stat\">🕵️ تحدي المفبرك</div></div></section>" +
      (hello ? "<h2>" + hello + "</h2><p>خلصت " + done + " من " + total + " دروس.</p>" : "") +
      '<h2>إيه اللي هتلاقيه هنا؟</h2><div class="grid">' +
      '<div class="card click" onclick="location.hash=\'#/start\'"><h3>🎯 اختبار تحديد المستوى</h3><p>10 أسئلة وتطلعلك خطة تناسب هدفك.</p></div>' +
      '<div class="card click" onclick="location.hash=\'#/path\'"><h3>🧭 مسارات الدروس</h3><p>دروس قصيرة (5 لـ 7 دقايق) وبعد كل درس اختبار.</p></div>' +
      '<div class="card click" onclick="location.hash=\'#/challenge\'"><h3>🕵️ حقيقي ولا مفبرك؟</h3><p>تحدي ممتع تتعلم منه تكتشف النصب.</p></div>' +
      '<div class="card click" onclick="location.hash=\'#/parents\'"><h3>👨‍👩‍👦 للأهالي</h3><p>الفايدة والمخاطر وإزاي تتابعوا.</p></div></div>'
    );
  };

  /* بدء: تسجيل بسيط -> هدف -> تحديد مستوى */
  pages.start = function () {
    if (S.id && S.goal && S.placementDone) return go("#/path");
    if (!S.id) {
      render('<div class="card"><h2>خلينا نتعرف</h2>' +
        '<label>اسمك أو لقبك (مش لازم الاسم الحقيقي)</label><input id="nm" maxlength="30" placeholder="مثلاً: عمرو">' +
        '<label>سنك</label><select id="ag"><option value="">اختار</option>' + [13,14,15,16,17,18].map(function (n) { return "<option>" + n + "</option>"; }).join("") + "</select>" +
        '<p class="note">بنسجل الاسم والسن وتقدمك في الدروس بس، عشان نتابع المستوى ونحسّن المحتوى. مفيش رقم موبايل ولا عنوان ولا صور. ولو سنك تحت 16، الأفضل ولي الأمر يكون عارف.</p>' +
        '<label style="font-weight:400"><input type="checkbox" id="ok" style="width:auto;margin-left:8px">موافق إن تقدمي يتسجل، وولي أمري عارف</label><br>' +
        '<button class="btn" id="go">يلا نبدأ</button></div>');
      $("#go").onclick = function () {
        var n = $("#nm").value.trim(), a = $("#ag").value;
        if (!n) return alert("اكتب اسمك أو لقبك");
        if (!a) return alert("اختار سنك");
        if (!$("#ok").checked) return alert("لازم توافق الأول");
        S.id = uuid(); S.name = n; S.age = +a; save();
        pages.start();
      };
      return;
    }
    if (!S.goal) {
      render('<div class="card"><h2>إيه أكتر حاجة عايز تستفيدها؟</h2>' +
        GOALS.map(function (g) { return '<button class="opt" data-g="' + g.id + '">' + g.icon + " " + esc(g.title) + "</button>"; }).join("") + "</div>");
      document.querySelectorAll(".opt").forEach(function (b) {
        b.onclick = function () { S.goal = b.getAttribute("data-g"); save(); track("goal", S.goal); pages.start(); };
      });
      return;
    }
    render('<div class="card"><h2>اختبار تحديد المستوى</h2><p>10 أسئلة بسيطة. مفيش نجاح أو رسوب، ده بس عشان نعرف تبدأ منين. التصحيح فوري ومعاه شرح.</p><div id="qz"><button class="btn" id="b">ابدأ الاختبار</button></div></div>');
    $("#b").onclick = function () {
      runQuiz($("#qz"), PLACEMENT, function (c, t) {
        S.level = c >= 6 ? 2 : 1; S.placementDone = true; save();
        track("placement", "score", c, t);
        var g = goalById(S.goal);
        render('<div class="card center"><h2>نتيجتك: ' + c + " من " + t + '</h2><p>هنبدأ بيك من <b>' + esc(levelInfo(S.level).title) + '</b>.</p><p>وعشان هدفك "<b>' + esc(g.title) + '</b>"، اقتراحنا تبدأ بدرس: <b>' + esc(lessonById(g.start).title) + '</b></p><a class="btn" href="#/lesson/' + g.start + '">ابدأ الدرس</a> <a class="btn ghost" href="#/path">شوف كل الدروس</a></div>');
      });
    };
  };

  pages.path = function () {
    if (!S.id) return go("#/start");
    var g = goalById(S.goal) || { start: "L1-what" };
    var h = '<h2>رحلتك، يا ' + esc(S.name) + "</h2>";
    levelsList().forEach(function (lv) {
      var ls = lessonsOf(lv), dc = doneCount(lv);
      h += '<div class="card" style="margin:14px 0"><h3>' + esc(levelInfo(lv).title) + '</h3><p class="note">' + esc(levelInfo(lv).desc) + "</p>" +
        '<div class="bar"><i style="width:' + Math.round(dc / ls.length * 100) + '%"></i></div>';
      ls.forEach(function (l) {
        var tags = (S.lessons[l.id] ? '<span class="tag done">تم ✓</span> ' : "") + (l.id === g.start && !S.lessons[l.id] ? '<span class="tag rec">مقترح ليك</span> ' : "");
        h += '<a class="opt" style="display:block;color:inherit" href="#/lesson/' + l.id + '">' + esc(l.title) + ' <span class="note">(' + l.mins + " دقايق)</span> " + tags + "</a>";
      });
      var ex = S.exams[lv];
      h += '<p><a class="btn ' + (ex && ex.passed ? "ghost" : "") + '" href="#/exam/' + lv + '">' + (ex && ex.passed ? "أعد الامتحان" : "امتحان نهاية المستوى") + "</a> " +
        (ex && ex.passed ? '<a class="btn" href="#/cert/' + lv + '">🎓 شهادتك</a> <span class="tag done">نجحت ' + ex.score + "/" + ex.total + "</span>" : "") + "</p></div>";
    });
    if (levelsList().indexOf(3) < 0) h += '<div class="card"><h3>المستوى الثالث: مشروع صغير</h3><p class="note">قريباً. هنبني فيه مشروع من بلدك بالـ AI.</p></div>';
    h += '<p class="center"><a class="btn ghost" href="#/challenge">🕵️ جرّب تحدي المفبرك</a></p>';
    render(h);
  };

  pages.lesson = function (id) {
    var l = lessonById(id);
    if (!l) return go("#/path");
    var done = S.lessons[id];
    render('<article class="card lesson"><span class="tag">المستوى ' + l.level + " • " + l.mins + ' دقايق</span><h1>' + esc(l.title) + "</h1>" + l.html +
      '<div class="box"><b>🧪 جرّب بنفسك:</b> ' + esc(l.tryIt) + '</div><h2>اختبار سريع</h2><div id="qz"></div></article>' +
      '<p class="center"><a class="btn ghost" href="#/path">رجوع للمسار</a></p>');
    if (S.id) track("lesson_open", id);
    runQuiz($("#qz"), l.quiz, function (c, t) {
      var passed = c >= Math.ceil(t * 0.67);
      S.lessons[id] = { score: c, total: t, passed: passed, at: Date.now() }; save();
      track("lesson", id, c, t);
      var idx = LESSONS.indexOf(l), next = LESSONS[idx + 1];
      $("#qz").innerHTML = '<div class="center"><h3>' + (passed ? "🎉 برافو!" : "كمّل وحاول تاني") + " نتيجتك " + c + " من " + t + "</h3>" +
        (next ? '<a class="btn" href="#/lesson/' + next.id + '">الدرس التالي</a> ' : "") +
        '<a class="btn ghost" href="#/path">كل الدروس</a> <button class="btn ghost" id="rt">أعد الاختبار</button></div>';
      $("#rt").onclick = function () { pages.lesson(id); };
    });
  };

  pages.exam = function (lv) {
    lv = +lv;
    if (!S.id) return go("#/start");
    var pool = [];
    lessonsOf(lv).forEach(function (l) { pool = pool.concat(l.quiz); });
    var qs = shuffle(pool).slice(0, 10);
    render('<div class="card"><h2>' + esc(levelInfo(lv).title) + "</h2><p>امتحان نهاية المستوى. النجاح من 70%. ده للتعلم، مش امتحان رسمي.</p><div id=\"qz\"><button class=\"btn\" id=\"b\">ابدأ</button></div></div>");
    $("#b").onclick = function () {
      runQuiz($("#qz"), qs, function (c, t) {
        var passed = c / t >= 0.7;
        S.exams[lv] = { score: c, total: t, passed: passed || (S.exams[lv] && S.exams[lv].passed), at: Date.now() };
        if (passed) S.exams[lv] = { score: c, total: t, passed: true, at: Date.now() };
        save(); track("exam", "L" + lv, c, t);
        $("#qz").innerHTML = '<div class="center"><h2>' + c + " من " + t + "</h2><p>" + (passed ? "🎉 نجحت! شهادتك جاهزة." : "قريب! راجع الدروس وجرب تاني.") + "</p>" +
          (passed ? '<a class="btn" href="#/cert/' + lv + '">🎓 شهادتي</a> ' : '<a class="btn" href="#/path">راجع الدروس</a> ') + '<a class="btn ghost" href="#/exam/' + lv + '">أعد المحاولة</a></div>';
      });
    };
  };

  pages.cert = function (lv) {
    lv = +lv; var ex = S.exams[lv];
    if (!ex || !ex.passed) return go("#/path");
    var d = new Date(ex.at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
    render('<div class="cert"><h1>🎓 شهادة إتمام</h1><p>تشهد ' + esc(C.SITE_NAME) + " بأن</p><div class=\"name\">" + esc(S.name) + "</div><p>أتمّ بنجاح</p><h2>" + esc(levelInfo(lv).title) + "</h2><p>بنتيجة " + ex.score + " من " + ex.total + " • " + d + '</p><p class="note">شهادة إتمام من مشروع مجتمعي تعليمي. غير معتمدة رسمياً.</p></div><p class="center noprint"><button class="btn" onclick="window.print()">اطبع / احفظ PDF</button> <a class="btn ghost" href="#/path">رجوع</a></p>');
    track("cert", "L" + lv, ex.score, ex.total);
  };

  pages.challenge = function () {
    var qs = shuffle(CHALLENGE).map(function (c) { return { q: c.t, o: ["✅ موثوق / حقيقي", "🚩 مفبرك أو نصب"], a: c.a ? 0 : 1, e: c.e }; });
    render('<div class="card"><h2>🕵️ حقيقي ولا مفبرك؟</h2><p>هتشوف مواقف ورسايل وأخبار. قرر: موثوق ولا نصب؟</p><div id="qz"><button class="btn" id="b">ابدأ التحدي</button></div></div>');
    $("#b").onclick = function () {
      runQuiz($("#qz"), qs, function (c, t) {
        S.challenge = { score: c, total: t, at: Date.now() }; save(); track("challenge", "fake", c, t);
        var badge = c >= t - 1 ? "🏅 محقق ماهر" : c >= t / 2 ? "🔍 محقق صاعد" : "🌱 لسه بتتعلم";
        $("#qz").innerHTML = '<div class="center"><h2>' + c + " من " + t + '</h2><p style="font-size:24px">' + badge + '</p><a class="btn" href="#/challenge">جرب تاني</a> <a class="btn ghost" href="#/path">الدروس</a></div>';
      });
    };
  };

  pages.parents = function () {
    var wa = C.WHATSAPP ? '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/' + esc(C.WHATSAPP) + '">كلمنا على واتساب</a>' : "";
    render('<article class="card lesson"><h1>👨‍👩‍👦 للأهالي</h1>' +
      "<h2>ليه الموضوع ده؟</h2><p>أولادنا بيستخدموا الذكاء الاصطناعي فعلاً، غالباً للواجبات أو التسلية. هدفنا نعلمهم يستخدموه <b>صح وبأمان</b>: يفهموا بيه، يتأكدوا من المعلومة، ويحموا نفسهم من النصب والصور المفبركة.</p>" +
      "<h2>الفايدة</h2><ul><li>مذاكرة أذكى: الـ AI يشرح ويختبر، مش يحل الواجب.</li><li>مهارة التفكير والتحقق من المعلومة.</li><li>وعي بالنصب والخصوصية.</li></ul>" +
      "<h2>المخاطر وإزاي نقللها</h2><ul><li><b>الاعتماد الزايد:</b> نشجع إنه يحاول بنفسه الأول.</li><li><b>معلومات غلط:</b> بنعلمه يراجع.</li><li><b>الخصوصية:</b> بنعلمه ماينشرش بياناته أو صور.</li><li><b>المحتوى:</b> الأدوات لها حدود عمرية. اقرأ شروط كل أداة وتابع استخدام ابنك.</li></ul>" +
      "<h2>نتابع إزاي؟</h2><p>بنسجل بس: الاسم أو اللقب، السن، الهدف، ونتايج الدروس والاختبارات. مفيش رقم موبايل ولا عنوان ولا صور. تقدر تطلب حذف بيانات ابنك في أي وقت.</p>" +
      "<h2>أسئلة شائعة</h2><p><b>هل الموقع مجاني؟</b> أيوه.<br><b>هل ده كورس معتمد؟</b> لأ، ده مشروع مجتمعي تعليمي والشهادة شهادة إتمام.<br><b>محتاج أجهزة؟</b> لأ، موبايل أو لابتوب وإنترنت.</p>" +
      "<p>" + wa + "</p></article>");
  };

  pages.about = function () {
    render('<article class="card lesson"><h1>عن المشروع</h1><p>مشروع مجتمعي تطوعي من أوسيم، هدفه نساعد أولادنا يتعلموا الذكاء الاصطناعي صح وبأمان. إحنا شباب بنشتغل في المجال وعايزين نرجّع حاجة لبلدنا.</p><p>الموقع تجريبي. أي رأي أو اقتراح، كلمنا.</p></article>');
  };

  /* ---------- راوتر ---------- */
  function route() {
    var h = (location.hash || "#/").replace(/^#\/?/, "");
    var p = h.split("/"), name = p[0] || "home";
    document.querySelectorAll(".nav nav a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#/" + (name === "home" ? "" : name)); });
    var fn = pages[name] || pages.home;
    fn(p[1]);
  }
  window.addEventListener("hashchange", route);
  $("#sname").textContent = C.SITE_NAME;
  route();

  /* دروس مضافة من لوحة الإدارة (Supabase). لو فشل التحميل، الدروس الأساسية تكفي */
  function validQuiz(q) {
    if (!Array.isArray(q)) return [];
    return q.filter(function (x) {
      return x && typeof x.q === "string" && Array.isArray(x.o) && x.o.length >= 2 && x.o.length <= 4 &&
        Number.isInteger(x.a) && x.a >= 0 && x.a < x.o.length;
    }).map(function (x) { return { q: x.q, o: x.o.map(String), a: x.a, e: String(x.e || "") }; });
  }
  if (sb) {
    sb.from("lessons").select("*").eq("published", true).order("level").order("sort").order("created_at").then(function (r) {
      if (r.error || !r.data) return;
      var rows = r.data.map(function (d) {
        return { id: d.id, level: d.level, title: d.title, mins: d.mins || 5, html: window.renderMarkup(d.body), tryIt: d.try_it || "", quiz: validQuiz(d.quiz), db: true };
      }).filter(function (l) { return l.quiz.length; });
      var base = LESSONS.filter(function (l) { return !l.db; });
      LESSONS.length = 0;
      base.concat(rows).map(function (l, i) { return { l: l, i: i }; })
        .sort(function (a, b) { return a.l.level - b.l.level || a.i - b.i; })
        .forEach(function (x) { LESSONS.push(x.l); });
      var cur = (location.hash || "#/").replace(/^#\/?/, "").split("/")[0] || "home";
      if (cur === "path" || cur === "home" || (cur === "lesson" && !document.querySelector(".lesson"))) route();
    }, function () {});
  }
})();
