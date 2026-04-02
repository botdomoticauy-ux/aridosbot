// ============================================================
//  AridosBot — Servidor WhatsApp (Meta Cloud API)
//  Con catálogo completo, zonas de entrega y flujo de pedido
// ============================================================

const express = require("express");
const axios   = require("axios");
require("dotenv").config();

const app  = express();
app.use(express.json());

const TOKEN           = process.env.WHATSAPP_TOKEN;
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VENDEDOR        = "59894306356"; // Número del vendedor

// ── Catálogo de productos ────────────────────────────────────
const catalogo = [
  // ARENA
  { id: 1,  nombre: "Arena 5m³",                    precio: 6650,  categoria: "arena" },
  { id: 2,  nombre: "Arena 8m³",                    precio: 7300,  categoria: "arena" },
  { id: 3,  nombre: "Arena 9m³",                    precio: 8500,  categoria: "arena" },
  // PEDREGULLO
  { id: 4,  nombre: "Pedregullo 5m³",               precio: 6500,  categoria: "pedregullo" },
  { id: 5,  nombre: "Pedregullo 8m³",               precio: 8300,  categoria: "pedregullo" },
  { id: 6,  nombre: "Pedregullo 10m³",              precio: 10500, categoria: "pedregullo" },
  // BALASTRO
  { id: 7,  nombre: "Balastro 5m³",                 precio: 4700,  categoria: "balastro" },
  { id: 8,  nombre: "Balastro 8m³",                 precio: 5700,  categoria: "balastro" },
  { id: 9,  nombre: "Balastro 10m³",                precio: 6600,  categoria: "balastro" },
  // ARENA SUCIA
  { id: 10, nombre: "Arena sucia 5m³",              precio: 3200,  categoria: "arena sucia" },
  { id: 11, nombre: "Arena sucia 8m³",              precio: 3300,  categoria: "arena sucia" },
  { id: 12, nombre: "Arena sucia 10m³",             precio: 3600,  categoria: "arena sucia" },
  // DESTAPE DE CANTERA
  { id: 13, nombre: "Destape de cantera 8m³",       precio: 3000,  categoria: "destape" },
  { id: 14, nombre: "Destape de cantera 10m³",      precio: 3000,  categoria: "destape" },
  // TIERRA NEGRA
  { id: 15, nombre: "Tierra negra 5m³",             precio: 4700,  categoria: "tierra negra" },
  { id: 16, nombre: "Tierra negra 8m³",             precio: 5700,  categoria: "tierra negra" },
  { id: 17, nombre: "Tierra negra 10m³",            precio: 6500,  categoria: "tierra negra" },
  // COMBOS
  { id: 18, nombre: "2m³ Arena + 2m³ Pedregullo",   precio: 6500,  categoria: "combo" },
  { id: 19, nombre: "4m³ Arena + 4m³ Pedregullo",   precio: 8700,  categoria: "combo" },
  { id: 20, nombre: "5m³ Arena + 5m³ Pedregullo",   precio: 10500, categoria: "combo" },
  // GRAVILLA
  { id: 21, nombre: "Gravilla 10m³",                precio: 8300,  categoria: "gravilla" },
  // TOSCA
  { id: 22, nombre: "Tosca/Balastro de segunda 10m³", precio: 5200, categoria: "tosca" },
  // PIEDRA GRIS
  { id: 23, nombre: "Piedra gris 4m³",              precio: 8500,  categoria: "piedra gris" },
  { id: 24, nombre: "Piedra gris 10m³",             precio: 15900, categoria: "piedra gris" },
  { id: 25, nombre: "Piedra gris 20m³",             precio: 26000, categoria: "piedra gris" },
];

// ── Zonas de entrega ─────────────────────────────────────────
const zonas = [
  { nombre: "Aeropuerto",            precio: 1000 },
  { nombre: "Aeroparque",            precio: 1200 },
  { nombre: "Antel Arena",           precio: 650  },
  { nombre: "Barros Blancos",        precio: 1000 },
  { nombre: "Bella Italiana",        precio: 700  },
  { nombre: "Canelón Chico",         precio: 500  },
  { nombre: "Casarino",              precio: 800  },
  { nombre: "Casavalle",             precio: 600  },
  { nombre: "Cerro",                 precio: 600  },
  { nombre: "Ciudad del Plata",      precio: 800  },
  { nombre: "Ciudad de la Costa",    precio: 900  },
  { nombre: "Colón",                 precio: 300  },
  { nombre: "Colonia Nicolás",       precio: 900  },
  { nombre: "Cruz de Carrasco",      precio: 900  },
  { nombre: "Delta del Tigre",       precio: 1200 },
  { nombre: "El Pinar",              precio: 1400 },
  { nombre: "Empalme Olmos",         precio: 1800 },
  { nombre: "Empalme Sauce",         precio: 800  },
  { nombre: "Estadio de Peñarol",    precio: 700  },
  { nombre: "Flor de Maroñas",       precio: 600  },
  { nombre: "Gruta de Lourdes",      precio: 600  },
  { nombre: "Joaquín Suárez",        precio: 600  },
  { nombre: "La Comercial",          precio: 800  },
  { nombre: "La Tablada",            precio: 300  },
  { nombre: "La Teja",               precio: 600  },
  { nombre: "La Unión",              precio: 700  },
  { nombre: "Las Acacias",           precio: 600  },
  { nombre: "Las Piedras",           precio: 300  },
  { nombre: "Lógica",                precio: 300  },
];

// ── Sesiones de conversación ─────────────────────────────────
const sesiones = {};

// ── Lógica principal del bot ─────────────────────────────────
function obtenerRespuesta(texto, numero) {
  const t   = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ses = sesiones[numero] || { paso: "inicio" };
  sesiones[numero] = ses;

  // ── FLUJO DE PEDIDO ──────────────────────────────────────

  // Paso: esperando zona
  if (ses.paso === "esperando_zona") {
    const zonaEncontrada = zonas.find(z =>
      z.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t)
    );
    if (zonaEncontrada) {
      ses.zona     = zonaEncontrada.nombre;
      ses.flete    = zonaEncontrada.precio;
      ses.total    = ses.precioMaterial + zonaEncontrada.precio;
      ses.paso     = "esperando_confirmacion";
      return (
        `📋 *Resumen de tu pedido:*\n\n` +
        `📦 ${ses.producto}\n` +
        `💰 Material: $${ses.precioMaterial.toLocaleString("es-UY")}\n` +
        `🚛 Flete a ${zonaEncontrada.nombre}: $${zonaEncontrada.precio.toLocaleString("es-UY")}\n` +
        `━━━━━━━━━━━━━━━\n` +
        `💵 *TOTAL: $${ses.total.toLocaleString("es-UY")} UYU*\n\n` +
        `¿Confirmás el pedido? Respondé *SI* o *NO*`
      );
    } else {
      // Buscar zonas parecidas
      const sugerencias = zonas
        .filter(z => z.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t.slice(0,4)))
        .slice(0, 3)
        .map(z => `• ${z.nombre}`)
        .join("\n");
      return (
        `❓ No encontré esa zona. ` +
        (sugerencias ? `¿Querés decir alguna de estas?\n${sugerencias}\n\nEscribí el nombre de tu zona.` : `Escribí el nombre de tu zona. Ej: *Las Piedras*, *Colón*, *Cerro*`)
      );
    }
  }

  // Paso: esperando confirmación
  if (ses.paso === "esperando_confirmacion") {
    if (/\b(si|sí|dale|confirmo|ok|yes)\b/.test(t)) {
      ses.paso = "esperando_direccion";
      return `✅ Perfecto! Para coordinar la entrega necesito tu *dirección exacta* 📍`;
    }
    if (/\b(no|cancelar|cancel)\b/.test(t)) {
      sesiones[numero] = { paso: "menu" };
      return `❌ Pedido cancelado. ¿En qué más te puedo ayudar? Escribí *menú* para ver las opciones.`;
    }
    return `Por favor respondé *SI* para confirmar o *NO* para cancelar.`;
  }

  // Paso: esperando dirección
  if (ses.paso === "esperando_direccion") {
    ses.direccion = texto;
    ses.paso = "completado";

    // Notificar al vendedor
    const msgVendedor =
      `🔔 *NUEVO PEDIDO CONFIRMADO*\n\n` +
      `👤 Cliente: ${numero}\n` +
      `📦 Producto: ${ses.producto}\n` +
      `📍 Dirección: ${ses.direccion}\n` +
      `🗺️ Zona: ${ses.zona}\n` +
      `💰 Material: $${ses.precioMaterial.toLocaleString("es-UY")}\n` +
      `🚛 Flete: $${ses.flete.toLocaleString("es-UY")}\n` +
      `💵 *TOTAL: $${ses.total.toLocaleString("es-UY")} UYU*`;

    enviarMensaje(VENDEDOR, msgVendedor);
    sesiones[numero] = { paso: "menu" };

    return (
      `🎉 *¡Pedido confirmado!*\n\n` +
      `📦 ${ses.producto}\n` +
      `📍 ${ses.direccion}\n` +
      `💵 Total: *$${ses.total.toLocaleString("es-UY")} UYU*\n\n` +
      `Un vendedor te va a contactar pronto para coordinar la entrega. ¡Gracias! 🙏`
    );
  }

  // ── MENÚ PRINCIPAL ───────────────────────────────────────

  if (/\b(hola|buenas|buenos|buen dia|hi|inicio|menu|holi)\b/.test(t) || ses.paso === "inicio") {
    sesiones[numero] = { paso: "menu" };
    return (
      `👋 ¡Hola! Bienvenido a *Barraca Rocco* 🪨\n\n` +
      `¿Qué necesitás?\n\n` +
      `1️⃣ Ver precios\n` +
      `2️⃣ Hacer un pedido\n` +
      `3️⃣ Zonas de entrega\n` +
      `4️⃣ Hablar con un vendedor\n\n` +
      `Escribí el número de tu opción 👇`
    );
  }

  // Opción 1 - Ver precios
  if (t.trim() === "1" || /\b(precio|cuanto|costo|vale|lista)\b/.test(t)) {
    return menuPrecios();
  }

  // Opción 2 - Hacer pedido
  if (t.trim() === "2" || /\b(pedir|pedido|quiero|necesito|comprar)\b/.test(t)) {
    sesiones[numero] = { paso: "esperando_producto" };
    return menuProductosParaPedido();
  }

  // Opción 3 - Zonas
  if (t.trim() === "3" || /\b(zona|flete|entrega|llega|reparte)\b/.test(t)) {
    return listarZonas();
  }

  // Opción 4 - Vendedor
  if (t.trim() === "4" || /\b(vendedor|persona|humano|hablar)\b/.test(t)) {
    enviarMensaje(VENDEDOR, `📞 El cliente ${numero} quiere hablar con un vendedor.`);
    return `📞 Ya avisé al vendedor. Te va a contactar en breve. ¡Gracias por tu paciencia!`;
  }

  // Selección de producto para pedido
  if (ses.paso === "esperando_producto") {
    const num = parseInt(t.trim());
    const prod = catalogo.find(p => p.id === num);
    if (prod) {
      ses.producto       = prod.nombre;
      ses.precioMaterial = prod.precio;
      ses.paso           = "esperando_zona";
      return (
        `✅ Elegiste: *${prod.nombre}* — $${prod.precio.toLocaleString("es-UY")} UYU\n\n` +
        `🗺️ ¿A qué zona entregamos?\n\n` +
        `Escribí tu zona. Ej: *Las Piedras*, *Colón*, *Cerro*, *Ciudad de la Costa*`
      );
    }
    return `❓ Escribí el número del producto. Por ejemplo: *1* para Arena 5m³`;
  }

  // Búsqueda por categoría
  if (/arena sucia/.test(t)) return listarCategoria("arena sucia");
  if (/arena/.test(t))       return listarCategoria("arena");
  if (/pedregullo/.test(t))  return listarCategoria("pedregullo");
  if (/balastro/.test(t))    return listarCategoria("balastro");
  if (/tierra/.test(t))      return listarCategoria("tierra negra");
  if (/piedra/.test(t))      return listarCategoria("piedra gris");
  if (/gravilla/.test(t))    return listarCategoria("gravilla");
  if (/tosca/.test(t))       return listarCategoria("tosca");
  if (/destape/.test(t))     return listarCategoria("destape");
  if (/combo/.test(t))       return listarCategoria("combo");

  return (
    `🤔 No entendí tu consulta.\n\n` +
    `Escribí *menú* para ver las opciones, o preguntame por:\n` +
    `• *arena* · *pedregullo* · *balastro*\n` +
    `• *tierra negra* · *piedra gris* · *gravilla*\n` +
    `• *precios* · *zonas* · *pedido*`
  );
}

// ── Funciones de menú ────────────────────────────────────────
function menuPrecios() {
  const cats = [...new Set(catalogo.map(p => p.categoria))];
  let msg = `💰 *Lista de Precios*\n\n`;
  cats.forEach(cat => {
    const items = catalogo.filter(p => p.categoria === cat);
    msg += `*${cat.toUpperCase()}*\n`;
    items.forEach(p => {
      msg += `• ${p.nombre}: $${p.precio.toLocaleString("es-UY")}\n`;
    });
    msg += "\n";
  });
  msg += `Para hacer un pedido escribí *2* o *pedido* 👇`;
  return msg;
}

function menuProductosParaPedido() {
  let msg = `📦 *¿Qué producto querés pedir?*\n\nEscribí el número:\n\n`;
  catalogo.forEach(p => {
    msg += `*${p.id}.* ${p.nombre} — $${p.precio.toLocaleString("es-UY")}\n`;
  });
  return msg;
}

function listarCategoria(cat) {
  const items = catalogo.filter(p => p.categoria === cat);
  if (items.length === 0) return `❓ No encontré productos en esa categoría.`;
  let msg = `📦 *${cat.toUpperCase()}*\n\n`;
  items.forEach(p => {
    msg += `• ${p.nombre}: *$${p.precio.toLocaleString("es-UY")} UYU*\n`;
  });
  msg += `\n¿Querés hacer un pedido? Escribí *pedido* 👇`;
  return msg;
}

function listarZonas() {
  let msg = `🗺️ *Zonas de entrega y precios de flete:*\n\n`;
  zonas.forEach(z => {
    msg += `• ${z.nombre}: $${z.precio.toLocaleString("es-UY")}\n`;
  });
  msg += `\n¿Querés hacer un pedido? Escribí *pedido* 👇`;
  return msg;
}

// ── Enviar mensaje ───────────────────────────────────────────
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
    console.error("❌ Error:", err.response?.data || err.message);
  }
}

// ── Webhook verificación ─────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ── Webhook recibir mensajes ─────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const mensaje = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!mensaje || mensaje.type !== "text") return;
    const numero  = mensaje.from;
    const texto   = mensaje.text.body;
    console.log(`📩 Mensaje de ${numero}: "${texto}"`);
    const respuesta = obtenerRespuesta(texto, numero);
    await enviarMensaje(numero, respuesta);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
});

// ── Health check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "AridosBot activo 🪨", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AridosBot corriendo en puerto ${PORT}`));
