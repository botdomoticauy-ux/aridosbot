// ============================================================
//  AridosBot — Servidor WhatsApp (Meta Cloud API)
//  Requiere Node.js 18+ y las variables de entorno en .env
// ============================================================

const express = require("express");
const axios   = require("axios");
require("dotenv").config();

const app  = express();
app.use(express.json());

const TOKEN           = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// ── Catálogo de productos ────────────────────────────────────
const catalogo = [
  { nombre: "Arena lavada fina",     tipo: "arena",      precio: 8500,  unidad: "m³",  stock: true  },
  { nombre: "Arena gruesa",          tipo: "arena",      precio: 7200,  unidad: "m³",  stock: true  },
  { nombre: "Pedregullo 6-20mm",     tipo: "pedregullo", precio: 11200, unidad: "m³",  stock: true  },
  { nombre: "Pedregullo 20-40mm",    tipo: "pedregullo", precio: 10500, unidad: "m³",  stock: false },
  { nombre: "Árido grueso 40mm",     tipo: "arido",      precio: 9800,  unidad: "m³",  stock: true  },
  { nombre: "Árido fino",            tipo: "arido",      precio: 8900,  unidad: "m³",  stock: true  },
];

// ── Memoria de sesiones (para seguimiento de conversación) ───
const sesiones = {};

// ── Lógica del bot ───────────────────────────────────────────
function obtenerRespuesta(texto, numero) {
  const t   = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ses = sesiones[numero] || { paso: "inicio" };

  // Saludo / inicio
  if (/\b(hola|buenas|buenos|buen dia|hi|inicio|menu)\b/.test(t) || ses.paso === "inicio") {
    sesiones[numero] = { paso: "menu" };
    return (
      "👋 ¡Hola! Soy el asistente de *AridosMateriales*.\n\n" +
      "¿En qué te puedo ayudar?\n" +
      "1️⃣  Ver precios\n" +
      "2️⃣  Disponibilidad\n" +
      "3️⃣  Información de entrega\n" +
      "4️⃣  Hablar con un vendedor\n\n" +
      "Escribí el número de tu opción 👇"
    );
  }

  // Opciones numéricas del menú
  if (t.trim() === "1" || /precio|cuanto|costo|vale/.test(t)) {
    return listarPrecios();
  }
  if (t.trim() === "2" || /disponib|stock|hay/.test(t)) {
    return listarDisponibilidad();
  }
  if (t.trim() === "3" || /entrega|flete|envio|enviar|lleva|manda/.test(t)) {
    return mensajeEntrega();
  }
  if (t.trim() === "4" || /vendedor|persona|humano|hablar/.test(t)) {
    return "📞 Enseguida te paso con un vendedor. Dejanos tu nombre y te contactamos en minutos. ¡Gracias!";
  }

  // Productos específicos
  if (/arena/.test(t))      return listarPorTipo("arena");
  if (/pedregullo|piedra/.test(t)) return listarPorTipo("pedregullo");
  if (/arido|ripio/.test(t)) return listarPorTipo("arido");

  // No entendió
  return (
    "🤔 No entendí bien tu consulta.\n\n" +
    "Podés escribir:\n" +
    "• *arena* · *pedregullo* · *áridos*\n" +
    "• *precios* · *disponibilidad* · *entrega*\n" +
    "• O escribí *menú* para ver las opciones 👋"
  );
}

function listarPrecios() {
  const lista = catalogo
    .map(p => `• ${p.nombre}: *$${p.precio.toLocaleString("es-AR")}/${p.unidad}*`)
    .join("\n");
  return `💰 *Nuestros precios actuales:*\n\n${lista}\n\n¿Cuál te interesa? Te hago una cotización.`;
}

function listarDisponibilidad() {
  const disp = catalogo.filter(p => p.stock).map(p => `✅ ${p.nombre}`).join("\n");
  const ndisp = catalogo.filter(p => !p.stock).map(p => `⛔ ${p.nombre} (sin stock)`).join("\n");
  return `📦 *Disponibilidad actual:*\n\n${disp}\n${ndisp}`;
}

function listarPorTipo(tipo) {
  const items = catalogo.filter(p => p.tipo === tipo);
  const lista = items
    .map(p => `• ${p.nombre}: *$${p.precio.toLocaleString("es-AR")}/${p.unidad}* — ${p.stock ? "✅ Disponible" : "⛔ Sin stock"}`)
    .join("\n");
  const nombre = tipo.charAt(0).toUpperCase() + tipo.slice(1);
  return `🪨 *${nombre} disponible:*\n\n${lista}\n\n¿Cuántos m³ necesitás? Te preparo la cotización.`;
}

function mensajeEntrega() {
  return (
    "🚛 *Información de Entregas*\n\n" +
    "📍 Zona de cobertura: radio de 50 km\n" +
    "⏰ Horarios: Lunes a Sábado 7:00 – 17:00 hs\n" +
    "🕐 Tiempo estimado: 24 a 48 hs hábiles\n" +
    "💰 Flete desde: $5.000 según distancia\n\n" +
    "Para coordinar un envío mandanos:\n" +
    "• Dirección completa\n" +
    "• Material y cantidad\n" +
    "• Fecha preferida 📅"
  );
}

// ── Enviar mensaje a WhatsApp ────────────────────────────────
async function enviarMensaje(numero, texto) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: numero,
        type: "text",
        text: { body: texto },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Mensaje enviado a ${numero}`);
  } catch (err) {
    console.error("❌ Error enviando mensaje:", err.response?.data || err.message);
  }
}

// ── Webhook: verificación de Meta ────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ── Webhook: recibir mensajes entrantes ──────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Responder rápido a Meta (obligatorio)

  try {
    const entry   = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const mensaje = value?.messages?.[0];

    if (!mensaje || mensaje.type !== "text") return;

    const numero  = mensaje.from;
    const texto   = mensaje.text.body;

    console.log(`📩 Mensaje de ${numero}: "${texto}"`);

    const respuesta = obtenerRespuesta(texto, numero);
    await enviarMensaje(numero, respuesta);

  } catch (err) {
    console.error("❌ Error procesando mensaje:", err.message);
  }
});

// ── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "AridosBot activo 🪨", timestamp: new Date().toISOString() });
});

// ── Iniciar servidor ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AridosBot corriendo en puerto ${PORT}`);
});
