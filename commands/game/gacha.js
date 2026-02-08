export default {
    name: 'gacha',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, saveDB }) => {
        const user = db[senderNumber];
        const cost = 2000;

        if ((user.balance || 0) < cost) {
            return sock.sendMessage(from, { text: `❌ Saldo koin kamu tidak cukup! Gacha butuh *${cost.toLocaleString('id-ID')} koin*.` }, { quoted: msg });
        }

        // Deduct cost immediately
        user.balance -= cost;
        saveDB(db);

        // Loading message
        const { key } = await sock.sendMessage(from, { text: '🎰 *Memutar mesin gacha...*' }, { quoted: msg });

        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        const rand = Math.random() * 100;
        let result = {};
        let resultMsg = '';

        if (rand <= 60) { // 60% Zonk
            resultMsg = `💀 *GACHA ZONK* 💀\n\nMaaf, kamu kurang beruntung! Tux-46 memakan koinmu.\nCoba lagi lain kali!`;
        } else if (rand <= 85) { // 25% Small Coins (500 - 3000)
            const win = Math.floor(Math.random() * (3000 - 500 + 1)) + 500;
            user.balance += win;
            resultMsg = `💰 *GACHA BERHASIL* 💰\n\nSelamat! Kamu mendapatkan koin hiburan sebesar *${win.toLocaleString('id-ID')} koin*.`;
        } else if (rand <= 95) { // 10% Jackpot Coins (10k - 50k)
            const win = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
            user.balance += win;
            resultMsg = `🔥 *JACKPOT KOIN* 🔥\n\nLuar biasa! Kamu memenangkan Jackpot sebesar *${win.toLocaleString('id-ID')} koin*!`;
        } else if (rand <= 99) { // 4% VIP 3 Days
            const duration = 3 * 24 * 60 * 60 * 1000;
            user.vip = true;
            user.vipExpiry = (user.vipExpiry > Date.now() ? user.vipExpiry : Date.now()) + duration;
            user.role = '🌟 VIP Member';
            resultMsg = `👑 *GACHA HOKI: VIP (3 HARI)* 👑\n\nSelamat! Status VIP kamu telah aktif/bertambah selama 3 hari!`;
        } else { // 1% VIP 1 Month
            const duration = 30 * 24 * 60 * 60 * 1000;
            user.vip = true;
            user.vipExpiry = (user.vipExpiry > Date.now() ? user.vipExpiry : Date.now()) + duration;
            user.role = '🌟 VIP Member';
            resultMsg = `💎 *SUPER GRAND PRIZE: VIP (1 BULAN)* 💎\n\nGILA!! Kamu dapet hadiah tertinggi! Rank VIP 30 Hari resmi milikmu!`;
        }

        saveDB(db);

        // Edit loading message to show result
        return sock.sendMessage(from, { text: resultMsg, edit: key }, { quoted: msg });
    }
};
