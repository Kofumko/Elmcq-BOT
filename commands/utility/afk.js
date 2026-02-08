export default {
    name: 'afk',
    category: 'utility',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, saveDB }) => {
        const user = db[senderNumber];
        const reason = args.join(' ') || 'Tanpa Alasan';

        user.afk = Date.now();
        user.afkReason = reason;
        saveDB(db);

        return sock.sendMessage(from, {
            text: `💤 *@${senderNumber}* sekarang AFK dengan alasan: *${reason}*`,
            mentions: [sender]
        }, { quoted: msg });
    }
};
