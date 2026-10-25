const esc = (s) =>
  String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function parse(body) {
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch (e) { return {}; }
  }
  return body || {};
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method" });
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chat = (process.env.TELEGRAM_CHAT_ID || "").trim();

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
    const r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text, parse_mode: "HTML" }),
    });
    if (!r.ok) {
      console.error("Telegram xatosi:", r.status);
      return res.status(502).json({ ok: false, error: "telegram" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Tarmoq xatosi:", e);
    return res.status(502).json({ ok: false, error: "network" });
  }
};
