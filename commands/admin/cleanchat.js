export default {
    name: 'cleanchat',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, senderNumber, botMessageKeys, isGroup }) => {
        try {
            // 1. Permission check (User)
            if (!isAdmin) {
                return sock.sendMessage(from, { text: '❌ Akses Ditolak! Hanya Admin yang bisa membersihkan chat.' });
            }

            // 2. Bot Admin check (Only needed in groups)
            if (isGroup) {
                const metadata = await sock.groupMetadata(from);
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = metadata.participants.find(p => p.id === botId)?.admin;

                if (!botIsAdmin) {
                    return sock.sendMessage(from, { text: '❌ Gagal! Bot harus jadi Admin grup untuk bisa menghapus pesan.' });
                }
            }

            const amount = parseInt(args[0]) || 10;
            if (amount <= 0 || amount > 100) {
                return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah pesan (1-100) yang ingin dihapus!' });
            }

            // botMessageKeys is passed from index.js
            const keysToDelete = (botMessageKeys || []).slice(-amount).reverse();
            if (keysToDelete.length === 0) {
                return sock.sendMessage(from, { text: '📭 Tidak ada pesan bot yang bisa dihapus saat ini.' });
            }

            let deletedCount = 0;
            for (const key of keysToDelete) {
                try {
                    await sock.sendMessage(from, { delete: key });
                    deletedCount++;
                    // Small delay to avoid rate limit
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (e) {
                    console.error('Individual delete error:', e);
                }
            }

            return sock.sendMessage(from, { text: `✅ Berhasil membersihkan ${deletedCount} pesan bot.` }, { skipSweep: true });
        } catch (error) {
            console.error('Cleanchat Error:', error);
            return sock.sendMessage(from, { text: `❌ Gagal membersihkan chat: ${error.message}` });
        }
    }
};
