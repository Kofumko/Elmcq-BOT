import config from '../../config.js';

export default {
    name: 'location',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, saveDB, cmd, senderNumber }) => {
        const pusatGroupId = db.__settings__?.pusatGroupId;
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;

        // 1. Permission check (Admin Kerajaan)
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses ditolak! Hanya Admin Kerajaan yang bisa mengatur koordinat.' });
        }

        // 2. Setup Commands (Allowed anywhere for initial config, or by Owner)
        if (cmd === '!setpusat') {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '⚠️ Perintah ini hanya bisa digunakan di dalam Grup!' });

            db.__settings__.pusatGroupId = from;
            saveDB(db);
            return sock.sendMessage(from, { text: `✅ Grup ini berhasil didaftarkan sebagai *GRUP PUSAT* (Mod & Server Tools).` });
        }

        if (cmd === '!setarena') {
            if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '⚠️ Perintah ini hanya bisa digunakan di dalam Grup!' });

            db.__settings__.arenaGroupId = from;
            saveDB(db);
            return sock.sendMessage(from, { text: `✅ Grup ini berhasil didaftarkan sebagai *GRUP ARENA* (Game & Ekonomi).` });
        }

        if (cmd === '!location' || cmd === '!koordinat') {
            const arenaGroupId = db.__settings__?.arenaGroupId;
            const res = `🏰 *KOORDINAT KERAJAAN* 🏰\n\n` +
                `📍 *Pusat (Grup 1):* ${pusatGroupId || 'Belum diatur'}\n` +
                `🏟️ *Arena (Grup 2):* ${arenaGroupId || 'Belum diatur'}\n\n` +
                `Gunakan *!setpusat* atau *!setarena* untuk mengatur ulang.`;
            return sock.sendMessage(from, { text: res });
        }

        // 3. Restricted Admin Commands check (for future expansions in this file)
        if (from !== pusatGroupId && !!pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur konfigurasi server hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }
    }
};
