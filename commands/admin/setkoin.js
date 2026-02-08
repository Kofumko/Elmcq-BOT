export default {
    name: 'setkoin',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { senderNumber, saveDB, isAdmin }) => {
        // Permission Check (Owner or Group Admin)
        if (!isAdmin) {
            return sock.sendMessage(from, { text: '❌ Akses Ditolak! Hanya Admin yang punya kunci brankas.' }, { quoted: msg });
        }

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            return sock.sendMessage(from, { text: '⚠️ Tag target yang ingin diubah koinnya! Contoh: !setkoin @user 50000' }, { quoted: msg });
        }

        const targetJid = mentioned[0];
        const targetNumber = targetJid.split('@')[0];
        const amount = parseInt(args[1]);

        if (isNaN(amount)) {
            return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah koin yang valid!' }, { quoted: msg });
        }

        if (!db[targetNumber]) {
            return sock.sendMessage(from, { text: '❌ Target tidak ditemukan di database!' }, { quoted: msg });
        }

        // Apply change
        db[targetNumber].balance = amount;
        saveDB(db);

        const response = `✅ Berhasil mengubah saldo @${targetNumber} menjadi ${amount.toLocaleString('id-ID')} koin oleh Admin @${senderNumber}.`;

        return sock.sendMessage(from, { text: response, mentions: [targetJid, msg.key.participant || msg.key.remoteJid] }, { quoted: msg });
    }
};
