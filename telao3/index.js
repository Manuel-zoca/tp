// index.js
const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();

// Handlers
const { handleMessage } = require("./handlers/messageHandler");
const { handleConcorrer } = require("./handlers/concorrerHandler");
const { handleListar } = require("./handlers/listarHandler");
const { handleRemove } = require("./handlers/removeHandler");
const { handlePagamento } = require("./handlers/pagamentoHandler");
const { handleGrupo } = require("./handlers/grupoHandler");
const { handleBan } = require("./handlers/banHandler");
const { handleCompra } = require("./handlers/compraHandler");
const { handleTabela } = require("./handlers/tabelaHandler");
const { handleTodos } = require("./handlers/todosHandler");
const { handleMensagemPix } = require("./handlers/pixHandler");
const { handleComprovanteFoto } = require("./handlers/handleComprovanteFoto");
const { handleReaction } = require("./handlers/reactionHandler");
const { handleAntiLinkMessage } = require("./handlers/antiLink");

// Importa o novo handler compra2Handler
const { handleCompra2 } = require("./handlers/compra2Handler");

let pendingMessages = [];

async function iniciarBot(deviceName, authFolder) {
  console.log(`🟢 Iniciando o bot para o dispositivo: ${deviceName}...`);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  let sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    qrTimeout: 60_000,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
  });

  const processPendingMessages = async () => {
    for (const { jid, msg } of pendingMessages) {
      try {
        await sock.sendMessage(jid, msg);
      } catch (e) {
        console.error("❌ Falha ao reenviar mensagem pendente:", e.message);
      }
    }
    pendingMessages = [];
  };

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr);
        console.log(`📌 Escaneie o QR Code do dispositivo: ${deviceName}`);
        console.log(qrBase64.split(",")[1]);
      } catch (err) {
        console.error("❌ Erro ao gerar QR Code base64:", err);
      }
    }

    if (connection === "close") {
      const motivo = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.error(`⚠️ Conexão fechada: ${motivo}`);

      if (motivo === DisconnectReason.loggedOut) {
        console.log("❌ Bot deslogado. Encerrando...");
        process.exit(0);
      }

      console.log("🔄 Tentando reconectar...");
      setTimeout(() => iniciarBot(deviceName, authFolder), 3000);
    } else if (connection === "open") {
      console.log(`✅ Bot conectado no dispositivo: ${deviceName}`);
      await processPendingMessages();
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!messages || !messages.length) return;
    const msg = messages[0];

    // ✅ IGNORAR mensagens do próprio bot
    if (msg.key.fromMe) {
      console.log("⚠️ Ignorando mensagem enviada pelo próprio bot.");
      return;
    }

    const senderJid = msg.key.remoteJid;

    let messageText = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.text ||
      ""
    ).replace(/[\u200e\u200f\u2068\u2069]/g, "").trim();

    const lowerText = messageText.toLowerCase();

    try {
      await handleAntiLinkMessage(sock, msg);
    } catch (err) {
      console.error("❌ Erro no handleAntiLinkMessage:", err.message);
    }

    try {
      if (msg.message?.imageMessage && senderJid.endsWith("@g.us")) {
        await handleComprovanteFoto(sock, msg);
      }

      await handleMensagemPix(sock, msg);

      if (lowerText.startsWith("@") || lowerText.startsWith("/")) {
        console.log(`📥 Mensagem de ${senderJid}: ${lowerText}`);
      }

      // Novo: comando .compra (qualquer caixa)
      if (lowerText.startsWith('.compra')) {
        await handleCompra2(sock, msg);
      }
      // Mantém os comandos já existentes com @
      else if (lowerText === "@concorrentes") {
        await handleListar(sock, msg);
      } else if (lowerText.startsWith("@remove") || lowerText.startsWith("/remove")) {
        await handleRemove(sock, msg);
      } else if (lowerText.startsWith("@ban") || lowerText.startsWith("/ban")) {
        await handleBan(sock, msg);
      } else if (lowerText === "@pagamentos") {
        await handlePagamento(sock, msg);
      } else if (["@grupo on", "@grupo off"].includes(lowerText)) {
        await handleGrupo(sock, msg);
      } else if (lowerText.startsWith("@compra") || lowerText.startsWith("@rentanas") || lowerText.startsWith("@remove rentanas")) {
        await handleCompra(sock, msg);
      } else if (senderJid.endsWith("@g.us") && lowerText === "@concorrencia") {
        await handleConcorrer(sock, msg);
      } else if (lowerText === "@tabela") {
        await handleTabela(sock, msg);
      } else if (lowerText === "@todos") {
        await handleTodos(sock, msg);
      } else if (lowerText.startsWith("@") || lowerText.startsWith("/")) {
        await handleMessage(sock, msg);
      } 
      else if (['.n', '.t', '.i'].includes(lowerText)) {
        await handleTabela(sock, msg);
      }
      else if (lowerText.startsWith('.compra')) {
  await handleCompra2(sock, msg);
}


    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error);
      try {
        await sock.sendMessage(senderJid, { text: "❌ Ocorreu um erro ao processar sua solicitação." });
      } catch (sendErr) {
        console.error("⚠️ Erro ao enviar mensagem de erro. Adicionando à fila.");
        pendingMessages.push({ jid: senderJid, msg: { text: "❌ Ocorreu um erro ao processar sua solicitação." } });
      }
    }
  });

  sock.ev.on("messages.reaction", async reactions => {
    for (const reactionMsg of reactions) {
      await handleReaction({ reactionMessage: reactionMsg, sock });
    }
  });

  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    if (action === "add") {
      for (let participant of participants) {
        const nome = participant.split("@")[0];
        const mensagem = `
@${nome}  *👋 Seja muito bem-vindo(a) ao grupo!*

🎉 Ficamos felizes em ter você conosco.

Qualquer dúvida, estamos aqui para ajudar!
`.trim();

        try {
          const ppUrl = await sock.profilePictureUrl(participant, "image").catch(() => null);
          if (ppUrl) {
            await sock.sendMessage(id, { image: { url: ppUrl }, caption: mensagem, mentions: [participant] });
          } else {
            await sock.sendMessage(id, { text: mensagem, mentions: [participant] });
          }
        } catch (err) {
          console.error("❌ Erro na mensagem de boas-vindas:", err);
        }
      }
    }
  });

  return sock;
}

iniciarBot("Dispositivo 1", "./auth1");

const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("✅ TopBot rodando com sucesso no Render!"));
app.listen(PORT, () => console.log(`🌐 Servidor HTTP ativo na porta ${PORT}`));
