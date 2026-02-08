import config from '../config.js';

const spamTracker = new Map();

/**
 * Handle anti-spam logic
 */
async function executePenalty(sock, msg, from, sender, senderNumber, tracker, db, isGroup, groupAdmins) {
  const warnCount = db[senderNumber].warns;

  // Warn 1: Kasih reaksi emoji
  if (warnCount === 1) {
    try {
      await sock.sendMessage(from, { react: { text: "⚠️", key: msg.key } });
    } catch (e) { }
  }
  // Warn 2-4: Kasih pesan tag peringatan
  else if (warnCount >= 2 && warnCount <= 4) {
    await sock.sendMessage(from, {
      text: `@${senderNumber} ⛔ Peringatan ${warnCount}/5`,
      mentions: [sender]
    }, { quoted: msg });
  }
  // Warn 5: Otomatis kick user
  else if (warnCount >= 5) {
    const botId = sock.user.id.split(':')[0];
    const botIsAdmin = groupAdmins.includes(botId);

    if (isGroup && botIsAdmin) {
      try {
        await sock.sendMessage(from, {
          text: `@${senderNumber} 🚫 Anda dikick karena spam/toxic berlebihan (5/5).`,
          mentions: [sender]
        });

        await sock.groupParticipantsUpdate(from, [sender], 'remove');
      } catch (err) {
        console.error('Gagal kick user:', err);
        await sock.sendMessage(from, { text: '❌ Gagal melakukan kick. Pastikan bot adalah admin.' });
      }
    } else {
      await sock.sendMessage(from, {
        text: `@${senderNumber} ⛔ Warn 5/5! (Bot bukan admin, tidak bisa kick)`,
        mentions: [sender]
      }, { quoted: msg });
    }
  }
}

/**
 * Manually add a warning (e.g. for toxic words)
 */
export async function addToxicWarning(sock, msg, from, isGroup, groupAdmins, ownerNumber, db) {
  if (!msg.message) return;

  const sender = msg.key.participant || from;
  const senderNumber = sender.split('@')[0];

  const isOwner = config.owner.includes(senderNumber);
  const isAdmin = config.admin.includes(senderNumber) || groupAdmins.includes(senderNumber);

  if (isOwner || isAdmin) return;

  if (!db[senderNumber]) return;
  if (db[senderNumber].warns >= 5) return;

  db[senderNumber].warns += 1;
  // Note: saveDB is called in index.js after loop or can be called here if needed.
  // But usually index.js handles the db saving. Let's assume we save it.

  await executePenalty(sock, msg, from, sender, senderNumber, {}, db, isGroup, groupAdmins);
}

export default async function warnHandler(sock, msg, from, isGroup, groupAdmins, ownerNumber, db) {
  if (!msg.message) return;

  const sender = msg.key.participant || from;
  const senderNumber = sender.split('@')[0];

  // 1. Cek Exemption
  const isOwner = config.owner.includes(senderNumber);
  const isAdmin = config.admin.includes(senderNumber) || groupAdmins.includes(senderNumber);

  const isVip = db[senderNumber]?.vip === true;

  if (isOwner || isAdmin || isVip) return;

  // 2. Whitelist Check (Haram, Solat)
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  const whitelist = ['haram', 'solat'];
  if (whitelist.some(word => text.toLowerCase().includes(word))) return;

  // 3. Ambil state user (Delay check)
  const now = Date.now();
  let lastTime = spamTracker.get(senderNumber) || 0;

  if (!db[senderNumber]) return;
  if (db[senderNumber].warns >= 5) return;

  // 4. Cek interval (2 detik)
  const timeDiff = now - lastTime;
  spamTracker.set(senderNumber, now);

  if (timeDiff < 2000) {
    // TERDETEKSI SPAM
    db[senderNumber].warns += 1;
    await executePenalty(sock, msg, from, sender, senderNumber, {}, db, isGroup, groupAdmins);
  }
}

