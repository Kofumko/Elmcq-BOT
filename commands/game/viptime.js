export default {
    name: 'viptime',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender }) => {
        const user = db[senderNumber];

        if (!user.vip) {
            return sock.sendMessage(from, { text: '❌ Kamu belum menjadi Member VIP. Ketik *!shop* untuk berlangganan!' }, { quoted: msg });
        }

        const now = Date.now();
        const remaining = user.vipExpiry - now;

        if (remaining <= 0) {
            return sock.sendMessage(from, { text: '⚠️ Status VIP kamu telah berakhir. Silakan beli lagi di *!shop*!' }, { quoted: msg });
        }

        const days = Math.floor(remaining / 86400000);
        const hours = Math.floor((remaining % 86400000) / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);

        const response = `🌟 *STATUS VIP KAMU* 🌟\n` +
            `--------------------------------\n` +
            `👤 *User:* @${senderNumber}\n` +
            `⏳ *Sisa Waktu:* ${days} Hari, ${hours} Jam, ${minutes} Menit\n` +
            `📅 *Berakhir:* ${new Date(user.vipExpiry).toLocaleString('id-ID')}\n` +
            `--------------------------------\n` +
            `Nikmati fitur Unlimited & Read View Once!`;

        return sock.sendMessage(from, { text: response, mentions: [sender] }, { quoted: msg });
    }
};
