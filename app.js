(() => {
  const T = window.TEXTS || [];
  const START = new Date(2026, 9, 31); // Hari 1 = 31 Oktober 2026
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const isZh = (s) => /[㐀-鿿]/.test(s);

  // ---------- penyimpanan lokal (aman jika diblokir) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const done = new Set(store.get("hsk-done", []));
  let fontSize = store.get("hsk-fs", 20);
  let pinyinOn = store.get("hsk-py", false);

  function tanggal(i) {
    const d = new Date(START); d.setDate(d.getDate() + i);
    return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  }
  const hanziCount = (s) => (s.match(/[一-鿿]/g) || []).length;

  // ---------- glosarium dari semua tabel kosakata ----------
  const gloss = new Map();
  T.forEach((t) => t.v.forEach(([w, py, id]) => {
    const k = w.replace(/（.*?）/g, "");
    if (k.length > 1 && !k.includes("…") && !gloss.has(k)) gloss.set(k, { w, py, id });
  }));
  const byFirst = new Map();
  [...gloss.keys()].sort((a, b) => b.length - a.length).forEach((k) => {
    if (!byFirst.has(k[0])) byFirst.set(k[0], []);
    byFirst.get(k[0]).push(k);
  });

  // ---------- segmentasi kata + pinyin ----------
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter("zh", { granularity: "word" }) : null;

  function tokenize(para) {
    const out = [];
    let buf = "";
    const flush = () => {
      if (!buf) return;
      if (seg) for (const s of seg.segment(buf)) out.push({ t: s.segment, v: false });
      else for (const ch of buf) out.push({ t: ch, v: false });
      buf = "";
    };
    let i = 0;
    while (i < para.length) {
      const hit = (byFirst.get(para[i]) || []).find((k) => para.startsWith(k, i));
      if (hit) { flush(); out.push({ t: hit, v: true }); i += hit.length; }
      else { buf += para[i]; i++; }
    }
    flush();
    return out;
  }

  function charPinyin(para) {
    const chars = Array.from(para);
    if (!window.pinyinPro) return chars.map(() => "");
    try {
      const all = pinyinPro.pinyin(para, { type: "all" });
      if (Array.isArray(all) && all.length === chars.length) return all.map((o) => (o.isZh ? o.pinyin : ""));
    } catch (e) {}
    return chars.map((c) => (isZh(c) ? pinyinPro.pinyin(c) : ""));
  }

  function pinyinOf(text) {
    if (!window.pinyinPro) return "";
    try {
      return pinyinPro.pinyin(text, { nonZh: "consecutive" })
        .replace(/\s+([，。！？；：、”’）》])/g, "$1")
        .replace(/([“‘（《])\s+/g, "$1");
    } catch (e) { return ""; }
  }

  // ---------- terjemahan ----------
  const tcache = new Map();
  function chunks(text, max) {
    const parts = text.split(/(?<=[。！？；])/);
    const out = []; let cur = "";
    for (const p of parts) {
      if ((cur + p).length > max && cur) { out.push(cur); cur = ""; }
      cur += p;
    }
    if (cur) out.push(cur);
    return out;
  }
  async function translateOne(q) {
    try {
      const r = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=id&dt=t&q=" + encodeURIComponent(q));
      if (r.ok) { const j = await r.json(); return j[0].map((x) => x[0]).join(""); }
    } catch (e) {}
    try {
      const r = await fetch("https://api.mymemory.translated.net/get?langpair=zh-CN|id&q=" + encodeURIComponent(q));
      if (r.ok) { const j = await r.json(); if (j.responseData && j.responseData.translatedText) return j.responseData.translatedText; }
    } catch (e) {}
    throw new Error("translate failed");
  }
  async function translate(text) {
    text = text.trim();
    if (tcache.has(text)) return tcache.get(text);
    const res = [];
    for (const c of chunks(text, 450)) res.push(await translateOne(c));
    const out = res.join(" ");
    tcache.set(text, out);
    return out;
  }

  // ---------- suara ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find((x) => /^zh(-|_)?(CN|Hans)?/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  // ---------- popup ----------
  let popSeq = 0;
  let popState = null;
  const failMsg = '<span class="muted">Terjemahan tidak tersedia (cek koneksi internet), coba tombol Google Translate.</span>';

  function openPop({ text, py, glossEntry, sentence, long }) {
    const seq = ++popSeq;
    popState = { text, sentence };
    $("pop").hidden = false;
    $("popWord").textContent = text;
    $("popWord").classList.toggle("long", !!long);
    $("popPy").textContent = py || "";
    $("popSent").hidden = true;
    $("popSentence").hidden = !sentence || sentence === text;
    $("popGoogle").href = "https://translate.google.com/?sl=zh-CN&tl=id&op=translate&text=" + encodeURIComponent(text);
    if (glossEntry) {
      $("popTr").innerHTML = `<span class="tag">kosakata</span>${esc(glossEntry.id)}`;
      // tambahkan terjemahan mesin sebagai pembanding
      translate(text).then((r) => {
        if (seq === popSeq && r && r.toLowerCase() !== glossEntry.id.toLowerCase())
          $("popTr").innerHTML += `<div class="muted" style="font-size:13.5px;margin-top:4px">Mesin: ${esc(r)}</div>`;
      }).catch(() => {});
    } else {
      $("popTr").innerHTML = '<span class="muted">Menerjemahkan…</span>';
      translate(text)
        .then((r) => { if (seq === popSeq) $("popTr").textContent = r; })
        .catch(() => { if (seq === popSeq) $("popTr").innerHTML = failMsg; });
    }
  }
  function closePop() {
    $("pop").hidden = true;
    popSeq++;
    document.querySelectorAll(".w.sel").forEach((e) => e.classList.remove("sel"));
  }
  $("popClose").onclick = closePop;
  $("popSpeak").onclick = () => popState && speak(popState.text);
  $("popSentence").onclick = () => {
    if (!popState || !popState.sentence) return;
    const s = popState.sentence, seq = popSeq;
    $("popSent").hidden = false;
    $("popSent").innerHTML = `<div class="zh">${esc(s)}</div><div class="py2">${esc(pinyinOf(s))}</div><div class="tr muted">Menerjemahkan…</div>`;
    translate(s)
      .then((r) => { if (seq === popSeq) { const el = $("popSent").querySelector(".tr"); el.classList.remove("muted"); el.textContent = r; } })
      .catch(() => { if (seq === popSeq) $("popSent").querySelector(".tr").innerHTML = failMsg; });
  };

  // ---------- render ----------
  let sentences = []; // sentences[paragraf][kalimat] = teks

  function renderParagraph(para, pi) {
    const pys = charPinyin(para);
    const toks = tokenize(para);
    const sents = [""];
    let off = 0, si = 0, pending = false, html = "";
    for (const tk of toks) {
      if (pending && !/^[”’」』）\s]+$/.test(tk.t)) { si++; sents[si] = ""; pending = false; }
      sents[si] += tk.t;
      const chars = Array.from(tk.t);
      const tpy = pys.slice(off, off + chars.length);
      off += chars.length;
      if (isZh(tk.t) || /[A-Za-z0-9]/.test(tk.t)) {
        const inner = chars.map((c, k) => (tpy[k] ? `<ruby>${esc(c)}<rt>${esc(tpy[k])}</rt></ruby>` : esc(c))).join("");
        const wpy = tpy.filter(Boolean).join(" ");
        html += `<span class="w${tk.v ? " v" : ""}" data-t="${esc(tk.t)}" data-py="${esc(wpy)}" data-p="${pi}" data-s="${si}">${inner}</span>`;
      } else {
        html += esc(tk.t);
      }
      if (/[。！？；]$/.test(tk.t)) pending = true;
    }
    sentences[pi] = sents;
    return `<p>${html}</p>`;
  }

  function home() {
    const pct = Math.round((done.size / T.length) * 100);
    let h = `<p class="intro"><b>${T.length} teks bacaan Mandarin faktual</b> tingkat HSK 8–9, satu teks per hari (${tanggal(0)} – ${tanggal(T.length - 1)}).
      Ketuk sebuah kata untuk melihat <b>pinyin dan arti</b>; blok beberapa kata atau satu kalimat untuk melihat <b>terjemahannya</b>.</p>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="meta">${done.size} dari ${T.length} selesai (${pct}%)</div>
      <a class="btn dl" href="Bacaan_Mandarin_HSK8-9_50_Hari.pdf" download>⬇ Unduh versi PDF</a>
      <ul class="list">`;
    T.forEach((t, i) => {
      const d = done.has(i + 1);
      h += `<li><a href="#/${i + 1}" class="${d ? "done" : ""}"><span class="n">${i + 1}</span>
        <span><div class="tt">${esc(t.t)}</div><div class="sub">${tanggal(i)} · ${esc(t.id)} · ${hanziCount(t.p)} 字</div></span>
        <span class="ok">${d ? "✓" : ""}</span></a></li>`;
    });
    h += "</ul>";
    $("app").innerHTML = h;
    document.title = "50 Hari Membaca Mandarin · HSK 8–9";
  }

  function reader(n) {
    const t = T[n - 1];
    if (!t) return home();
    sentences = [];
    const paras = t.p.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    const n2 = hanziCount(t.p);
    const isDone = done.has(n);
    let h = `<div class="meta">Hari ${n} · 第${n}天 · ${tanggal(n - 1)} · ${n2} 字 · ±${Math.round(n2 / 150)}–${Math.round(n2 / 100)} menit</div>
      <h1>${esc(t.t)}</h1><div class="topic">${esc(t.id)}</div>
      <div class="hint">Ketuk kata → pinyin &amp; arti. Blok (seret / tekan lama) beberapa kata → terjemahan. Kata bergaris titik = kosakata penting.${window.pinyinPro ? "" : " <b>Pinyin gagal dimuat — periksa koneksi internet.</b>"}</div>
      <div class="text">${paras.map(renderParagraph).join("")}</div>
      <div class="vocab"><h3>重点词语 · Kosakata penting</h3><table>${t.v.map((w) => `<tr><td>${esc(w[0])}</td><td>${esc(w[1])}</td><td>${esc(w[2])}</td></tr>`).join("")}</table></div>
      <div class="q"><h3>思考题 · Pertanyaan</h3>${esc(t.q)}</div>
      <div class="nav">
        ${n > 1 ? `<a class="btn" href="#/${n - 1}">← Hari ${n - 1}</a>` : "<span></span>"}
        <button class="mark${isDone ? " on" : ""}" id="markBtn">${isDone ? "✓ Sudah dibaca" : "Tandai selesai"}</button>
        ${n < T.length ? `<a class="btn" href="#/${n + 1}">Hari ${n + 1} →</a>` : `<a class="btn" href="#/">Daftar isi</a>`}
      </div>`;
    $("app").innerHTML = h;
    document.title = `Hari ${n} · ${t.t}`;
    $("markBtn").onclick = () => {
      if (done.has(n)) done.delete(n); else done.add(n);
      store.set("hsk-done", [...done]);
      reader(n);
    };
  }

  function route() {
    closePop();
    const m = location.hash.match(/^#\/(\d+)/);
    if (m) reader(+m[1]); else home();
    window.scrollTo(0, 0);
  }

  // ---------- interaksi: ketuk & blok ----------
  function selectedText() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const box = document.querySelector(".text");
    if (!box || !box.contains(range.commonAncestorContainer)) return null;
    const frag = range.cloneContents();
    frag.querySelectorAll("rt").forEach((r) => r.remove());
    const txt = frag.textContent.replace(/\s+/g, "").trim();
    return isZh(txt) ? txt : null;
  }
  function showSelection() {
    const txt = selectedText();
    if (!txt) return false;
    if (popState && popState.text === txt && !$("pop").hidden) return true;
    openPop({ text: txt, py: pinyinOf(txt), long: txt.length > 6 });
    return true;
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("#pop")) return;
    if (showSelection()) return;
    const w = e.target.closest(".text .w");
    if (!w) { if (!e.target.closest(".bar")) closePop(); return; }
    document.querySelectorAll(".w.sel").forEach((x) => x.classList.remove("sel"));
    w.classList.add("sel");
    const word = w.dataset.t;
    const sent = (sentences[w.dataset.p] || [])[w.dataset.s];
    const g = gloss.get(word);
    openPop({ text: word, py: g ? g.py : w.dataset.py, glossEntry: g, sentence: sent ? sent.trim() : null });
  });

  // untuk layar sentuh: seleksi dengan tekan lama tidak memicu "click"
  let selTimer = null;
  document.addEventListener("selectionchange", () => {
    clearTimeout(selTimer);
    selTimer = setTimeout(showSelection, 700);
  });

  // ---------- toolbar ----------
  function applySettings() {
    document.documentElement.style.setProperty("--fs", fontSize + "px");
    document.body.classList.toggle("py", pinyinOn);
    $("btnPinyin").classList.toggle("on", pinyinOn);
  }
  $("btnPinyin").onclick = () => { pinyinOn = !pinyinOn; store.set("hsk-py", pinyinOn); applySettings(); };
  $("btnBigger").onclick = () => { fontSize = Math.min(32, fontSize + 2); store.set("hsk-fs", fontSize); applySettings(); };
  $("btnSmaller").onclick = () => { fontSize = Math.max(14, fontSize - 2); store.set("hsk-fs", fontSize); applySettings(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });

  applySettings();
  window.addEventListener("hashchange", route);
  route();
})();
