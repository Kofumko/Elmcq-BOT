const pendingDuels = new Map();

export default {
    name: 'duel',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, saveDB, isGroup }) => {

        const userA = db[senderNumber];
        const cmd = args[0];

        // 0. Reset Logic
        if (cmd === 'reset') {
            if (pendingDuels.has(senderNumber)) {
                pendingDuels.delete(senderNumber);
                return sock.sendMessage(from, { text: '🔄 Pending duel berhasil di-reset!' });
            }
            return sock.sendMessage(from, { text: '❓ Kamu tidak memiliki duel yang pending.' });
        }

        // 1. Logic Terima Duel
        if (cmd === 'terima' || msg.message.conversation?.startsWith('!terima')) {
            const challenge = [...pendingDuels.entries()].find(([key, val]) => val.target === senderNumber && val.fromChat === from);

            if (!challenge) {
                return sock.sendMessage(from, { text: '❌ Kamu tidak punya tantangan duel yang pending!' }, { quoted: msg });
            }
            // ... (rest of logic)

            const [challengerNumber, data] = challenge;
            const userB = db[senderNumber]; // Target
            const challenger = db[challengerNumber];

            // Re-validate balance
            if (challenger.balance < data.bet) {
                pendingDuels.delete(challengerNumber);
                return sock.sendMessage(from, { text: `❌ Duel dibatalkan. Koin @${challengerNumber} sudah tidak cukup!`, mentions: [challenger.id] });
            }
            if (userB.balance < data.bet) {
                pendingDuels.delete(challengerNumber);
                return sock.sendMessage(from, { text: `❌ Koin kamu tidak cukup untuk menerima duel ini!` }, { quoted: msg });
            }

            // Get cards
            const cardA = (challenger.collection || []).sort((a, b) => b.power - a.power)[0];
            const cardB = (userB.collection || []).sort((a, b) => b.power - a.power)[0];

            if (!cardA || !cardB) {
                pendingDuels.delete(challengerNumber);
                return sock.sendMessage(from, { text: '❌ Salah satu dari kalian tidak punya koleksi anime untuk berduel! Gacha dulu di *!gacha-anime*.' });
            }

            // Calculate Power + RNG (±10%)
            const rngA = 0.9 + Math.random() * 0.2;
            const rngB = 0.9 + Math.random() * 0.2;
            const finalP1 = Math.floor(cardA.power * rngA);
            const finalP2 = Math.floor(cardB.power * rngB);

            let winner, winnerNumber, loser, loserNumber;
            if (finalP1 > finalP2) {
                winner = challenger; winnerNumber = challengerNumber;
                loser = userB; loserNumber = senderNumber;
            } else {
                winner = userB; winnerNumber = senderNumber;
                loser = challenger; loserNumber = challengerNumber;
            }

            winner.balance += data.bet;
            loser.balance -= data.bet;
            saveDB(db);
            pendingDuels.delete(challengerNumber);

            const resultMsg = `⚔️ *ARENA DUEL TUX-46* ⚔️\n` +
                `--------------------------\n` +
                `👤 @${challengerNumber} vs @${senderNumber}\n` +
                `🃏 *${cardA.name}* vs *${cardB.name}*\n` +
                `🔥 Power: *${finalP1.toLocaleString()}* vs *${finalP2.toLocaleString()}*\n` +
                `💰 Taruhan: *${data.bet.toLocaleString()} koin*\n` +
                `--------------------------\n` +
                `🏆 *PEMENANG:* @${winnerNumber}\n` +
                `💸 @${loserNumber} kehilangan *${data.bet.toLocaleString()} koin*!`;

            return sock.sendMessage(from, { text: resultMsg, mentions: [challenger.id, sender] });
        }

        // 2. Logic Tantangan Duel
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Tag orang yang ingin dichallenge! Contoh: !duel @user 1000' });

        const targetJid = mentioned[0];
        const targetNumber = targetJid.split('@')[0];
        const bet = parseInt(args[1]);

        if (isNaN(bet) || bet < 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah taruhan yang valid!' });
        if (targetNumber === senderNumber) return sock.sendMessage(from, { text: '😂 Jangan duel sama bayangan sendiri bos!' });
        if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ Lawan belum terdaftar di database!' });

        if (userA.balance < bet || db[targetNumber].balance < bet) return sock.sendMessage(from, { text: '❌ Koin tidak cukup untuk taruhan!' });

        if ((userA.collection || []).length === 0) return sock.sendMessage(from, { text: '❌ Kamu belum punya koleksi anime! Gacha dulu di *!gacha-anime*.' });
        if ((db[targetNumber].collection || []).length === 0) return sock.sendMessage(from, { text: '❌ Lawanmu belum punya kartu anime! Suruh dia !gacha-anime dulu.' });

        const now = Date.now();
        pendingDuels.set(senderNumber, {
            target: targetNumber,
            bet: bet,
            fromChat: from,
            timestamp: now
        });

        // Auto delete after 120s (2 minutes)
        setTimeout(async () => {
            if (pendingDuels.has(senderNumber)) {
                pendingDuels.delete(senderNumber);
                await sock.sendMessage(from, { text: `⏰ *WAKTU HABIS!* ⏰\nTantangan duel dari @${senderNumber} telah kadaluarsa.`, mentions: [sender] });
            }
        }, 120000);

        return sock.sendMessage(from, {
            text: `⚔️ *DUEL CHALLENGE* ⚔️\n\n@${senderNumber} menantang @${targetNumber} berduel!\n💰 Taruhan: *${bet.toLocaleString()} koin*\n\nKetik *!terima* untuk bertarung! (Berlaku 2 menit)`,
            mentions: [sender, targetJid]
        });
    }
};
