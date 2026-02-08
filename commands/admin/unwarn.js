import config from '../../config.js';

export default {
    name: 'unwarn',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { senderNumber, groupAdmins, saveDB }) => {
        const isExecutorOwner = config.owner.includes(senderNumber);
        const isExecutorAdmin = config.admin.includes(senderNumber) || groupAdmins.includes(senderNumber);

        if (!isExecutorOwner && !isExecutorAdmin) {
            return sock.sendMessage(from, { text: '❌ Akses Ditolak! Hanya Owner atau Admin yang bisa memberikan ampunan.' });
        }

        const unwarnMentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (unwarnMentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Tag orang yang ingin di-unwarn!' });

        const unwarnTargetJid = unwarnMentioned[0];
        const unwarnTargetNumber = unwarnTargetJid.split('@')[0];

        if (!db[unwarnTargetNumber]) return sock.sendMessage(from, { text: '❌ User belum terdaftar di database.' });

        const isTargetOwner = config.owner.includes(unwarnTargetNumber);
        if (isTargetOwner && !isExecutorOwner) {
            return sock.sendMessage(from, { text: '❌ Pangkatmu tidak cukup tinggi untuk menyentuh sang Owner!' });
        }

        db[unwarnTargetNumber].warns = 0;
        saveDB(db);

        const executorRole = isExecutorOwner ? 'Owner' : 'Admin';
        return sock.sendMessage(from, {
            text: `✅ ${executorRole} telah memulihkan nama baik @${unwarnTargetNumber}. Peringatan direset ke 0/5.`,
            mentions: [unwarnTargetJid]
        });
    }
};
