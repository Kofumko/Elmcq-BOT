import config from '../../config.js';

export default {
    name: 'silent-mode',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, saveDB, senderNumber }) => {
        const pusatGroupId = db.__settings__?.pusatGroupId;

        // 1. Location check
        if (from !== pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur Silent Mode hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }

        // 2. Permission check
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses ditolak! Hanya Admin Kerajaan yang bisa mengatur keheningan grup.' });
        }

        const silentArg = args[0];
        if (silentArg === 'on') {
            db.__settings__ = { ...db.__settings__, silentMode: true };
            saveDB(db);
            return sock.sendMessage(from, { text: '🤫 *SILENT MODE AKTIF!* 🤫\nMember dilarang menggunakan perintah ekonomi & game untuk sementara waktu.' });
        } else if (silentArg === 'off') {
            db.__settings__ = { ...db.__settings__, silentMode: false };
            saveDB(db);
            return sock.sendMessage(from, { text: '🔊 *SILENT MODE NONAKTIF!* 🔊\nMember sekarang boleh bermain kembali dengan bot.' });
        } else {
            return sock.sendMessage(from, { text: '⚠️ Gunakan: !silent-mode on atau !silent-mode off' });
        }
    }
};
