const esc = (s) =>
  String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function parse(body) {
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch (e) { return {}; }
  }
  return body || {};
}

async function tg(token, method, payload) {
  const r = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  let j = {};
  try { j = await r.json(); } catch (e) {}
  return j;
}

module.exports = async (req, res) => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chat = (process.env.TELEGRAM_CHAT_ID || "").trim();

  if (req.method === "GET") {
    const out = {
      tokenSet: !!token,
      tokenHasBotPrefix: /^bot/i.test(token),
      tokenHasColon: token.indexOf(":") > 0,
      chatSet: !!chat,
      chatLooksNumeric: /^-?\d+$/.test(chat),
    };
    if (token) {
      try {
        const me = await tg(token, "getMe");
        out.tokenCheck = me.ok ? "OK, bot: @" + me.result.username : "XATO: " + me.description;
        if (me.ok && chat) {
          const c = await tg(token, "getChat", { chat_id: chat });
          out.chatCheck = c.ok ? "OK, chat turi: " + c.result.type : "XATO: " + c.description;
        }
      } catch (e) {
        out.network = "Telegram'ga ulanib bo'lmadi: " + String(e.message || e);
      }
    }
    return res.status(200).json(out);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method" });
  }

  const b = parse(req.body);
  if (b.website) return res.status(200).json({ ok: true });

  const name = String(b.name || "").trim().slice(0, 80);
  const phone = String(b.phone || "").trim().slice(0, 30);
  const people = Math.min(Math.max(parseInt(b.people, 10) || 1, 1), 50);
  const tour = String(b.tour || "").trim().slice(0, 120);

  if (name.length < 2 || phone.replace(/\D/g, "").length < 9) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }

  if (!token || !chat) {
    console.error("TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan");
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  const time = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" });
  const text =
    "🆕 <b>Yangi so‘rov</b>\n\n" +
    "🌍 Paket: " + esc(tour) + "\n" +
    "👤 Ism: " + esc(name) + "\n" +
    "📞 Telefon: " + esc(phone) + "\n" +
    "👥 Kishi soni: " + people + "\n" +
    "🕒 " + time;

  try {
    const j = await tg(token, "sendMessage", { chat_id: chat, text: text, parse_mode: "HTML" });
    if (!j.ok) {
      console.error("Telegram xatosi:", j.description);
      return res.status(502).json({ ok: false, error: "telegram" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Tarmoq xatosi:", e);
    return res.status(502).json({ ok: false, error: "network" });
  }
};
