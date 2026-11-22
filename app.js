/* ========================================================================
   إعدادات Firebase: ضع بيانات مشروعك هنا (من Firebase Console > Project settings > Your apps > Web app).
   اترك الحقول فارغة ليعمل النظام محلياً (على نفس الجهاز فقط) كوضع احتياطي تلقائي.
   ======================================================================== */
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // مثال: https://your-project-default-rtdb.firebaseio.com
  projectId: "",
  appId: ""
};
const CAFE_WA = "201022622210";
const STAFF_PIN = "1234";
const MAPS_URL = "https://goo.gl";   // استبدله برابط تقييم الكافيه على خرائط جوجل
const GOAL = 5;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toast = t => { const e = $("#toast"); e.textContent = t; e.classList.add("show"); setTimeout(() => e.classList.remove("show"), 2200); };
const waLink = (n, t) => "https://wa.me/" + n + "?text=" + encodeURIComponent(t);
const normPhone = p => { let d = String(p).replace(/\D/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("0")) d = "20" + d.slice(1); return d; };

/* ---------- طبقة البيانات (سحابية أو محلية) ---------- */
let useFB = !!(firebaseConfig.apiKey && firebaseConfig.databaseURL), fbRef = null, fbOrders = null, cache = {}, orders = {}, loaded = false, ordersLoaded = false;
const subs = [], bc = "BroadcastChannel" in window ? new BroadcastChannel("oromo") : null;
const emit = () => subs.forEach(f => f());
const loadLocal = () => { try { cache = JSON.parse(localStorage.getItem("oromo_db") || "{}"); } catch (e) { cache = {}; } try { orders = JSON.parse(localStorage.getItem("oromo_orders") || "{}"); } catch (e) { orders = {}; } };
const DB = {
  saveOrder(o) { orders[o.id] = o; emit(); if (useFB) fbOrders.child(o.id).set(o); else { localStorage.setItem("oromo_orders", JSON.stringify(orders)); bc && bc.postMessage(1); } },
  save(m) { cache[m.id] = m; emit(); if (useFB) fbRef.child(m.id).set(m); else { localStorage.setItem("oromo_db", JSON.stringify(cache)); bc && bc.postMessage(1); } }
};
const loadScript = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
async function initDB() {
  if (useFB) {
    try {
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js");
      firebase.initializeApp(firebaseConfig);
      fbRef = firebase.database().ref("members");
      fbRef.on("value", s => { cache = s.val() || {}; loaded = true; emit(); });
      fbOrders = firebase.database().ref("orders");
      fbOrders.on("value", s => { orders = s.val() || {}; ordersLoaded = true; emit(); });
      return;
    } catch (e) { console.warn("fallback to local", e); useFB = false; }
  }
  loadLocal(); loaded = true; ordersLoaded = true;
  addEventListener("storage", e => { if (e.key === "oromo_db" || e.key === "oromo_orders") { loadLocal(); emit(); } });
  if (bc) bc.onmessage = () => { loadLocal(); emit(); };
}

/* ---------- أدوات عامة ---------- */
const tierOf = t => t >= 25 ? "العضوية الملكية" : t >= 10 ? "العضوية الذهبية" : "العضوية الفضية";
const greeting = () => { const h = new Date().getHours(); return h < 5 ? "ليلة سعيدة" : h < 12 ? "صباح الخير ☀️" : h < 17 ? "طاب يومك" : h < 21 ? "مساء الخير 🌙" : "سهرة هادئة"; };
let actx = null;
const unlockAudio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} };
function chime() {
  if (!actx) return;
  [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * 0.28;
    o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.start(t); o.stop(t + 1.2);
  });
}
function confetti() {
  const c = $("#fx"), x = c.getContext("2d"); c.width = innerWidth; c.height = innerHeight;
  const P = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, v: 2 + Math.random() * 4, r: 3 + Math.random() * 5, a: Math.random() * 6, col: ["#D4AF37", "#F3E3A2", "#fff", "#8A6D1B"][Math.floor(Math.random() * 4)] }));
  let n = 0; (function f() { x.clearRect(0, 0, c.width, c.height); P.forEach(p => { p.y += p.v; p.a += .1; p.x += Math.sin(p.a); x.fillStyle = p.col; x.fillRect(p.x, p.y, p.r, p.r * 1.6); }); if (++n < 220) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height); })();
}

/* ---------- شاشة العميل ---------- */
let me = null, prev = null, alarmTimer = null, qrFor = null, lastAlarm = 0;
try { me = JSON.parse(localStorage.getItem("oromo_me") || "null"); } catch (e) {}

function stopAlarm() { clearInterval(alarmTimer); alarmTimer = null; navigator.vibrate && navigator.vibrate(0); }
function alarm() {
  if (Date.now() - lastAlarm < 6000) return; lastAlarm = Date.now();
  const buzz = () => { navigator.vibrate && navigator.vibrate([500, 200, 500, 200, 900]); chime(); };
  buzz(); let n = 0; clearInterval(alarmTimer); alarmTimer = setInterval(() => { if (++n > 8) stopAlarm(); else buzz(); }, 3500);
  const body = "طلبك جاهز الآن في أورومو ☕ تفضل بالاستلام";
  if ("Notification" in window && Notification.permission === "granted") {
    const opts = { body, icon: "./icon.svg", badge: "./icon.svg", vibrate: [500, 200, 500], tag: "oromo-ready", renotify: true, dir: "rtl", lang: "ar" };
    if (navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification("OROMO Café", opts)).catch(() => new Notification("OROMO Café", opts));
    else new Notification("OROMO Café", opts);
  }
}
function renderClient() {
  const m = me && cache[me.id];
  if (!m) { if (me && loaded) DB.save(me); return; }
  me = m; localStorage.setItem("oromo_me", JSON.stringify(m));
  $("#greet").textContent = greeting(); $("#helloName").textContent = m.name;
  $("#cName").textContent = m.name; $("#cId").textContent = "#" + m.id; $("#tier").textContent = tierOf(m.total || 0);
  if (qrFor !== m.id && window.QRCode) { $("#qr").innerHTML = ""; new QRCode($("#qr"), { text: m.id, width: 84, height: 84, colorDark: "#0B0B0D", colorLight: "#F3E3A2" }); qrFor = m.id; }
  const s = Math.min(m.stamps || 0, GOAL);
  $("#stamps").innerHTML = Array.from({ length: GOAL }, (_, i) => `<div class="stamp ${i < s ? "on" : ""}">${i < s ? "☕" : ""}</div>`).join("") + `<div class="stamp gift ${s >= GOAL ? "on" : ""}">🎁</div>`;
  $("#cNote").textContent = s >= GOAL ? "كوبك السادس مجاني + هدية أورومو، اطلبها من الكاشير 🎉" : `باقي ${GOAL - s} ${GOAL - s === 1 ? "ختم" : "أختام"} على كوبك المجاني`;
  const st = m.status || "idle", pg = $("#pager");
  pg.className = "pager glass " + st;
  $("#pTitle").textContent = st === "ready" ? "قهوتك جاهزة ☕" : st === "preparing" ? "جاري تحضير قهوتك" : "لا يوجد طلب نشط";
  $("#pSub").textContent = st === "ready" ? "تفضل بالاستلام من الكاونتر." : st === "preparing" ? "سنخبرك فور جاهزيتها، استرخِ." : "عند جاهزية قهوتك سيهتز هاتفك وتصلك نغمة هادئة.";
  const mine = myOrders(); renderTracker(mine);
  const nowReady = mine.filter(o => o.status === "ready").map(o => o.id);
  if (prev) {
    const newReady = nowReady.some(id => !prev.r.includes(id));
    if ((prev.st !== "ready" && st === "ready") || newReady) alarm();
    if (st !== "ready" && !nowReady.length) stopAlarm();
    if ((prev.s || 0) < GOAL && s >= GOAL) { confetti(); navigator.vibrate && navigator.vibrate([100, 60, 100]); }
  }
  prev = { st, s, r: nowReady };
  document.querySelectorAll("#stars button").forEach((b, i) => b.classList.toggle("on", i < (m.rating || 0)));
}
function waMsg(item) { return `مرحباً أورومو ☕\nالاسم: ${me ? me.name : "-"}\nرقم العضوية: ${me ? me.id : "-"}\nالطلب: ${item}`; }
function buildClient() {
  const offers = [["🥐", "كرواسون سوبريم طازج", "مخبوز الآن بزبدة فاخرة"], ["🥨", "بريتزل أورومو", "مقرمش بلمسة ملح البحر"], ["🏷️", "خصم 20% على مشروبك الثاني", "وأنت على ترابيزتك"]];
  $("#offers").innerHTML = offers.map((o, i) => `<button class="offer" data-i="${i}"><span class="em">${o[0]}</span><div><b>${o[1]}</b><span>${o[2]}</span></div></button>`).join("");
  $("#offers").onclick = e => { const b = e.target.closest(".offer"); if (b) open(waLink(CAFE_WA, waMsg(offers[b.dataset.i][1])), "_blank"); };
  const svcs = ["مياه 💧", "مناديل", "فاتورة الحساب 🧾", "مساعدة الويتر 🔔"];
  $("#concierge").innerHTML = svcs.map((s, i) => `<button class="svc" data-i="${i}">${s}</button>`).join("");
  $("#concierge").onclick = e => { const b = e.target.closest(".svc"); if (b) open(waLink(CAFE_WA, waMsg("خدمة الطاولة: " + svcs[b.dataset.i])), "_blank"); };
  $("#stars").innerHTML = [1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} نجوم">★</button>`).join("");
  $("#stars").onclick = e => {
    const b = e.target.closest("button"); if (!b || !me) return; const n = +b.dataset.n;
    DB.save({ ...me, rating: n });
    if (n >= 4) { $("#rateMsg").textContent = "شكراً لذوقك الرفيع، وجودك يشرّفنا في أورومو ✨"; $("#mapsBtn").href = MAPS_URL; $("#mapsBtn").hidden = false; }
    else { $("#mapsBtn").hidden = true; $("#rateMsg").textContent = "نعتذر عن أي تقصير، سنحل الأمر فوراً."; open(waLink(CAFE_WA, waMsg(`تقييم ${n} نجوم - أرغب في حل مشكلتي`)), "_blank"); }
  };
  const card = $("#card"), tilt = (x, y) => { card.style.setProperty("--ry", (x * 16) + "deg"); card.style.setProperty("--rx", (-y * 16) + "deg"); card.style.setProperty("--sx", (x * 60) + "%"); };
  const reset = () => tilt(0, 0);
  card.addEventListener("pointermove", e => { const r = card.getBoundingClientRect(); tilt((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5); });
  card.addEventListener("pointerleave", reset); card.addEventListener("pointerup", reset);
  addEventListener("deviceorientation", e => { if (e.gamma == null) return; tilt(Math.max(-.5, Math.min(.5, e.gamma / 60)), Math.max(-.5, Math.min(.5, (e.beta - 45) / 90))); });
  let dip = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); dip = e; $("#installBtn").hidden = false; });
  $("#installBtn").onclick = async () => { if (dip) { dip.prompt(); await dip.userChoice; dip = null; $("#installBtn").hidden = true; } };
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (ios && !standalone) $("#iosHint").hidden = false;
  document.addEventListener("pointerdown", () => { unlockAudio(); if (me) stopAlarm(); }, { passive: true });
  document.addEventListener("pointerdown", function once() {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(() => {});
    document.removeEventListener("pointerdown", once);
  });
}
function genId() { let id; do { id = "ORM-" + String(Math.floor(1000 + Math.random() * 9000)); } while (cache[id]); return id; }
$("#regForm").onsubmit = e => {
  e.preventDefault(); unlockAudio();
  const name = $("#rName").value.trim(), phone = $("#rPhone").value.trim(), ph = normPhone(phone);
  if (!name || ph.length < 10) return toast("تأكد من الاسم ورقم الموبايل");
  const old = Object.values(cache).find(x => normPhone(x.phone) === ph);
  me = old || { id: genId(), name, phone, stamps: 0, total: 0, gifts: 0, rating: 0, status: "idle", created: Date.now() };
  DB.save(me); localStorage.setItem("oromo_me", JSON.stringify(me)); $("#regModal").hidden = true; prev = null; renderClient();
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  confetti();
};

/* ---------- لوحة الكاشير ---------- */
let sel = null, q = "";
const findMember = t => { t = t.trim().toUpperCase(); if (!t) return null; const n = normPhone(t); return Object.values(cache).find(m => m.id === t || m.id === "ORM-" + t || (n.length >= 6 && normPhone(m.phone).endsWith(n.slice(-9)))) || null; };
function upd(patch) { if (!sel || !cache[sel]) return; DB.save({ ...cache[sel], ...patch }); }
function renderStaff() {
  const all = Object.values(cache).sort((a, b) => (b.created || 0) - (a.created || 0));
  $("#stats").innerHTML = [["العملاء", all.length], ["أختام ممنوحة", all.reduce((s, m) => s + (m.total || 0), 0)], ["طلبات جاهزة", all.filter(m => m.status === "ready").length], ["هدايا مسلّمة", all.reduce((s, m) => s + (m.gifts || 0), 0)]].map(s => `<div class="stat"><b>${s[1]}</b><span>${s[0]}</span></div>`).join("");
  const box = $("#selBox"), m = sel && cache[sel];
  box.hidden = !m;
  if (m) {
    const stl = { idle: "—", preparing: "قيد التحضير", ready: "جاهز للاستلام" }[m.status || "idle"];
    box.innerHTML = `<div class="who"><div><b>${esc(m.name)}</b><div class="mid" style="color:var(--mut)">#${esc(m.id)} · ${esc(m.phone)}</div></div><div>الأختام: <b>${m.stamps || 0}/${GOAL}</b> · ${esc(tierOf(m.total || 0))} · ${stl}</div></div>
    <div class="acts"><button class="btn gold" data-a="stamp">+ إضافة ختم</button><button class="btn ghost" data-a="reset">تصفير بعد الهدية</button><button class="btn prep" data-a="prep">قيد التحضير</button><button class="btn gold" data-a="ready">جاهز للاستلام ☕</button><button class="btn wa" data-a="wa">إرسال تنبيه واتساب</button><button class="btn ghost" data-a="idle">إنهاء الطلب</button></div>`;
  }
  const f = q.trim().toLowerCase(), n = normPhone(q);
  const list = f ? all.filter(m => m.name.toLowerCase().includes(f) || m.id.toLowerCase().includes(f) || (n.length >= 4 && normPhone(m.phone).includes(n))) : all;
  $("#rows").innerHTML = list.map(m => `<tr data-id="${esc(m.id)}" class="${m.id === sel ? "cur" : ""}"><td>${esc(m.name)}</td><td>${esc(m.phone)}</td><td>${esc(m.id)}</td><td>${m.stamps || 0}/${GOAL}</td><td>${m.rating ? "★".repeat(m.rating) : "—"}</td></tr>`).join("") || `<tr><td colspan="5">لا يوجد عملاء مطابقون</td></tr>`;
}
function buildStaff() {
  $("#search").oninput = e => { q = e.target.value; const m = findMember(q); if (m) sel = m.id; renderStaff(); };
  $("#rows").onclick = e => { const r = e.target.closest("tr[data-id]"); if (r) { sel = r.dataset.id; renderStaff(); scrollTo({ top: 0, behavior: "smooth" }); } };
  $("#selBox").onclick = e => {
    const a = e.target.dataset.a, m = sel && cache[sel]; if (!a || !m) return;
    if (a === "stamp") { if ((m.stamps || 0) >= GOAL) return toast("العداد مكتمل: سلّم الهدية ثم صفّر"); upd({ stamps: (m.stamps || 0) + 1, total: (m.total || 0) + 1 }); toast("تمت إضافة ختم"); }
    if (a === "reset") { upd({ stamps: 0, gifts: (m.gifts || 0) + 1 }); toast("تم تصفير العداد"); }
    if (a === "prep") upd({ status: "preparing" });
    if (a === "ready") { upd({ status: "ready" }); toast("وصل التنبيه لهاتف العميل"); }
    if (a === "idle") upd({ status: "idle" });
    if (a === "wa") open(waLink(normPhone(m.phone), `أهلاً ${m.name}، قهوتك جاهزة في أورومو ☕ تفضل بالاستلام`), "_blank");
  };
  $("#csvBtn").onclick = () => {
    const rows = [["الاسم", "الموبايل", "العضوية", "الأختام", "إجمالي الأختام", "المستوى", "التقييم"]].concat(Object.values(cache).map(m => [m.name, m.phone, m.id, m.stamps || 0, m.total || 0, tierOf(m.total || 0), m.rating || ""]));
    const csv = "\ufeff" + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "oromo-members.csv"; a.click();
  };
  let stream = null, timer = null;
  const stopScan = () => { clearInterval(timer); stream && stream.getTracks().forEach(t => t.stop()); stream = null; $("#scanModal").hidden = true; };
  $("#scanClose").onclick = stopScan;
  $("#scanBtn").onclick = async () => {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices) { const v = prompt("أدخل رقم العضوية (مثال ORM-1234)"); const m = v && findMember(v); if (m) { sel = m.id; renderStaff(); } else if (v) toast("لم يتم العثور على العميل"); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = $("#vid"); v.srcObject = stream; await v.play(); $("#scanModal").hidden = false;
      const det = new BarcodeDetector({ formats: ["qr_code"] });
      timer = setInterval(async () => { try { const r = await det.detect(v); if (r.length) { const m = findMember(r[0].rawValue); stopScan(); if (m) { sel = m.id; renderStaff(); toast("تم العثور على " + m.name); } else toast("كود غير معروف"); } } catch (e) {} }, 400);
    } catch (e) { toast("تعذر فتح الكاميرا، تأكد من الصلاحيات"); }
  };
}
function enterStaff() { $("#client").hidden = true; $("#kitchen").hidden = true; $("#staff").hidden = false; document.title = "OROMO · الكاشير"; renderStaff(); renderBoards(); }
let pinTarget = "staff", kFrom = "client";
function enterKitchen() { $("#client").hidden = true; $("#staff").hidden = true; $("#kitchen").hidden = false; document.title = "OROMO · المطبخ"; renderBoards(); }
function exitKitchen() { $("#kitchen").hidden = true; document.title = "OROMO Café"; if (kFrom === "staff") enterStaff(); else { $("#client").hidden = false; if (!me) $("#regModal").hidden = false; } kFrom = "client"; }
function exitStaff() { $("#staff").hidden = true; $("#client").hidden = false; document.title = "OROMO Café"; }

/* ---------- السلة وتتبع الطلب (العميل) ---------- */
const MENU = [["☕", "قهوة / إسبريسو", 45], ["🥛", "سبانش لاتيه", 75], ["🧊", "آيس سبانش لاتيه", 85], ["🍫", "شوكليت فرابيه", 95], ["🥟", "باتيه طازج", 55], ["🥐", "كرواسون سوبريم", 75], ["🥨", "بريتزل أورومو", 60], ["🥞", "بان كيك ميكس شوكولاتة", 95]];
const cart = {};
const tableLabel = t => t === "counter" ? "استلام من الكاونتر" : "ترابيزة " + t;
const STEPS = [["new", "تم الاستلام"], ["preparing", "جاري التحضير 🔥"], ["ready", "جاهز ☕"]];
const myOrders = () => me ? Object.values(orders).filter(o => o.memberId === me.id && o.status !== "done").sort((a, b) => b.t - a.t) : [];
function cartTotals() { let c = 0, t = 0; MENU.forEach((m, i) => { const q = cart[i] || 0; c += q; t += q * m[2]; }); return { c, t }; }
function renderCart() {
  MENU.forEach((m, i) => { $("#q" + i).textContent = cart[i] || 0; });
  const { c, t } = cartTotals();
  $("#cCount").textContent = c + (c === 1 ? " صنف" : " أصناف"); $("#cTotal").textContent = t + " ج";
  $("#cartBar").hidden = c === 0;
}
function buildMenu() {
  $("#menu").innerHTML = MENU.map((m, i) => `<div class="mitem"><span class="em">${m[0]}</span><div class="mi"><b>${m[1]}</b><span>${m[2]} ج</span></div><div class="qty"><button data-i="${i}" data-d="-1" aria-label="إنقاص">−</button><output id="q${i}">0</output><button data-i="${i}" data-d="1" aria-label="زيادة">+</button></div></div>`).join("");
  $("#menu").onclick = e => {
    const b = e.target.closest("button[data-i]"); if (!b) return;
    const i = b.dataset.i; cart[i] = Math.max(0, Math.min(20, (cart[i] || 0) + Number(b.dataset.d))); renderCart();
  };
  $("#tableSel").innerHTML = `<option value="counter">استلام من الكاونتر</option>` + Array.from({ length: 30 }, (_, k) => `<option value="${k + 1}">ترابيزة ${k + 1}</option>`).join("");
  $("#sendOrder").onclick = sendOrder; renderCart();
}
function sendOrder() {
  if (!me) return;
  const items = MENU.map((m, i) => ({ n: m[1], q: cart[i] || 0, p: m[2] })).filter(x => x.q > 0);
  if (!items.length) return;
  const num = Object.values(orders).reduce((a, o) => Math.max(a, o.num || 100), 100) + 1;
  const o = { id: "O" + Date.now().toString(36) + Math.floor(Math.random() * 99), num, memberId: me.id, name: me.name, phone: me.phone, table: $("#tableSel").value, items, total: cartTotals().t, status: "new", t: Date.now() };
  DB.saveOrder(o);
  Object.keys(cart).forEach(k => delete cart[k]); renderCart();
  toast("تم إرسال طلبك بنجاح ✓"); $("#trackWrap").scrollIntoView({ behavior: "smooth" });
}
function renderTracker(list) {
  $("#tracker").innerHTML = list.map(o => {
    const k = STEPS.findIndex(s => s[0] === o.status);
    const msg = o.status === "new" ? "تم إرسال طلبك بنجاح — الوقت المتوقع للتحضير 10 إلى 15 دقيقة ⏳" : o.status === "preparing" ? "فريقنا يجهّز طلبك الآن 🔥" : "طلبك جاهز الآن في أورومو ☕ تفضل بالاستلام";
    return `<div class="glass trk ${o.status}"><div class="trow"><b>طلب #${o.num}</b><span>${esc(tableLabel(o.table))}</span></div><p class="tmsg">${msg}</p>${o.status !== "ready" ? `<div class="cd" data-t="${o.t}">15:00</div>` : ""}<div class="steps">${STEPS.map((s, i) => `<i class="${i <= k ? "on" : ""}">${s[1]}</i>`).join("")}</div><small>${o.items.map(x => esc(x.n) + " × " + x.q).join("، ")} · ${o.total} ج</small></div>`;
  }).join("");
  tick();
}
function tick() {
  document.querySelectorAll(".cd").forEach(e => {
    const r = Math.max(0, 900 - Math.floor((Date.now() - Number(e.dataset.t)) / 1000));
    e.textContent = String(Math.floor(r / 60)).padStart(2, "0") + ":" + String(r % 60).padStart(2, "0");
  });
}
setInterval(tick, 1000);

/* ---------- شاشة المطبخ والبار (KDS) ---------- */
const seen = new Set(); let boardInit = false;
const ago = t => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? "الآن" : "منذ " + m + " د"; };
function setOrderStatus(o, status) {
  if (!o) return;
  DB.saveOrder({ ...o, status });
  const m = cache[o.memberId]; if (!m) return;
  const act = Object.values(orders).filter(x => x.memberId === o.memberId && x.status !== "done");
  const ms = act.some(x => x.status === "ready") ? "ready" : act.some(x => x.status === "preparing") ? "preparing" : "idle";
  DB.save({ ...m, status: ms });
}
function boardHTML() {
  const list = Object.values(orders).filter(o => o.status !== "done").sort((a, b) => a.t - b.t);
  if (!list.length) return `<p class="empty">لا توجد طلبات حالياً ☕ الطلبات الجديدة تظهر هنا فوراً.</p>`;
  const lbl = { new: "جديد", preparing: "جاري التحضير 🔥", ready: "جاهز ☕" };
  return list.map(o => `<article class="kcard ${o.status}"><header><b class="onum">#${o.num}</b><span class="badge">${lbl[o.status]}</span></header><div class="kmeta"><b>${esc(o.name)}</b><span>${esc(tableLabel(o.table))}</span><span>${new Date(o.t).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} · ${ago(o.t)}</span></div><ul>${o.items.map(x => `<li><b>${x.q}×</b> ${esc(x.n)}</li>`).join("")}</ul><div class="kacts">${o.status === "ready" ? `<button class="btn ghost" data-o="${esc(o.id)}" data-a="done">تم التسليم ✓</button>` : `<button class="btn prep" data-o="${esc(o.id)}" data-a="preparing" ${o.status === "preparing" ? "disabled" : ""}>جاري التحضير 🔥</button><button class="btn emerald" data-o="${esc(o.id)}" data-a="ready">تم التحضير ☕</button>`}</div></article>`).join("");
}
function renderBoards() {
  if (!ordersLoaded) return;
  const list = Object.values(orders), active = list.filter(o => o.status !== "done").length;
  const fresh = list.some(o => !seen.has(o.id) && o.status === "new");
  if (boardInit && fresh && (!$("#kitchen").hidden || !$("#staff").hidden)) chime();
  list.forEach(o => seen.add(o.id)); boardInit = true;
  $("#kBoard").innerHTML = boardHTML(); $("#sBoard").innerHTML = boardHTML();
  $("#ordTab").textContent = "الطلبات الواردة" + (active ? " (" + active + ")" : "");
}
function buildOrders() {
  const act = e => { const b = e.target.closest("button[data-o]"); if (b && !b.disabled) setOrderStatus(orders[b.dataset.o], b.dataset.a); };
  $("#kBoard").onclick = act; $("#sBoard").onclick = act;
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.toggle("on", x === t));
    $("#tabOrders").hidden = t.dataset.tab !== "Orders"; $("#tabMembers").hidden = t.dataset.tab !== "Members";
  });
  setInterval(() => { if (!$("#kitchen").hidden || !$("#staff").hidden) renderBoards(); }, 30000);
}

/* ---------- التشغيل ---------- */
$("#lockBtn").onclick = () => { pinTarget = "staff"; $("#pinModal").hidden = false; $("#pinIn").value = ""; $("#pinErr").textContent = ""; setTimeout(() => $("#pinIn").focus(), 50); };
$("#pinCancel").onclick = () => { $("#pinModal").hidden = true; if (pinTarget === "kitchen") { $("#client").hidden = false; pinTarget = "staff"; if (!me) $("#regModal").hidden = false; } };
$("#pinForm").onsubmit = e => { e.preventDefault(); if ($("#pinIn").value === STAFF_PIN) { unlockAudio(); $("#pinModal").hidden = true; if (pinTarget === "kitchen") { kFrom = "client"; enterKitchen(); } else enterStaff(); } else $("#pinErr").textContent = "الرقم السري غير صحيح"; };
$("#exitStaff").onclick = exitStaff;
$("#exitKitchen").onclick = exitKitchen;
$("#openKitchen").onclick = () => { kFrom = "staff"; enterKitchen(); };

(async function boot() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  buildClient(); buildMenu(); buildStaff(); buildOrders();
  const view = new URLSearchParams(location.search).get("view");
  if (view === "kitchen") { pinTarget = "kitchen"; $("#client").hidden = true; $("#pinModal").hidden = false; setTimeout(() => $("#pinIn").focus(), 50); }
  subs.push(() => { if (!$("#staff").hidden) renderStaff(); renderClient(); renderBoards(); });
  await initDB();
  if (view === "staff") enterStaff();
  else if (view !== "kitchen" && !me) $("#regModal").hidden = false;
  emit();
  setInterval(() => { if (me) $("#greet").textContent = greeting(); }, 60000);
})();
