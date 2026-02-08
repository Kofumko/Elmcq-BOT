export default {
    name: 'mancing',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, saveDB }) => {
        const user = db[senderNumber];
        const now = Date.now();
        const cooldown = 60000; // 1 menit

        // 1. Check Fishing Rod
        if (!user.rod) {
            return sock.sendMessage(from, { text: '❌ *BELUM PUNYA PANCINGAN!* ❌\n\nKamu harus beli pancingan dulu di *!toko-pancing*.\n\nBamboo Rod cuma 500 koin kok!' });
        }

        // 2. Cooldown
        if (now - (user.lastMancing || 0) < cooldown) {
            const remaining = cooldown - (now - (user.lastMancing || 0));
            const remMin = Math.floor(remaining / 60000);
            const remSec = Math.floor((remaining % 60000) / 1000);
            return sock.sendMessage(from, {
                text: `⏳ *SABAR BOS!* ⏳\nIkan lagi pada tidur. Balik lagi dalam *${remMin} menit ${remSec} detik*.`
            }, { quoted: msg });
        }

        // 3. Durability Check
        if (user.rod.durability <= 0) {
            delete user.rod;
            saveDB(db);
            return sock.sendMessage(from, { text: '💥 *KRAKK!!* Pancingan kamu patah saat melempar kail! Beli baru di *!toko-pancing*.' });
        }

        // 4. Drop Rate Logic
        const isLucky = user.rod.type === 'lucky';
        // Bonus Chance for Lucky Rod: +5% to Rare/Legendary
        const luckBonus = isLucky ? 5 : 0;

        const rand = Math.random() * 100;
        let result = {};

        // Hardcore Table
        // 0.1% Mythical
        // 9.9% Legendary
        // 20% Rare
        // 40% Common
        // 30% Junk

        if (rand <= 0.0000001) { // MYTHICAL (The Leviathan)
            result = { name: 'THE LEVIATHAN', reward: 5000, emoji: '🐉', msg: `BUMI BERGETAR!! KAMU MENANGKAP MONSTER LAUT!!` };
        } else if (rand <= (0.5 + luckBonus)) { // Legendary
            const types = ['Hiu Putih', 'Paus Biru', 'Giant Squid', 'Marlin Emas'];
            const fish = types[Math.floor(Math.random() * types.length)];
            const price = Math.floor(Math.random() * (150 - 100 + 1)) + 100;
            result = { name: `Legendary ${fish}`, reward: price, emoji: '🦈', msg: `JACKPOT! Anggap aja gaji harian.` };
        } else if (rand <= (20 + luckBonus)) { // Rare
            const types = ['Tuna', 'Salmon', 'Barramundi', 'Kerapu'];
            const fish = types[Math.floor(Math.random() * types.length)];
            const price = Math.floor(Math.random() * (20 - 15 + 1)) + 15;
            result = { name: `Rare ${fish}`, reward: price, emoji: '🐠', msg: `Lumayan, setara sebutir berlian.` };
        } else if (rand <= 60) { // Common
            const types = ['Lele', 'Nila', 'Bawal', 'Gurame', 'Mujair', 'Ikan Mas', 'Patin'];
            const fish = types[Math.floor(Math.random() * types.length)];
            const price = Math.floor(Math.random() * (3 - 1 + 1)) + 1; // 1-3 Coins
            result = { name: `Ikan ${fish}`, reward: price, emoji: '🐟', msg: `Cukup buat beli permen.` };
        } else { // Zonk (40%)
            const types = ['Sepatu Butut', 'Plastik Bekas', 'Kaleng Rongsok', 'Ban Bekas', 'Popok Bayi'];
            const junk = types[Math.floor(Math.random() * types.length)];
            result = { name: junk, reward: 0, emoji: '🚮', msg: `Zonk! Hobimu buang-buang uang ya.` };
        }

        // 5. Update Stat
        user.balance = (user.balance || 0) + result.reward;
        user.lastMancing = now;
        user.rod.durability = Math.max(0, user.rod.durability - 1);

        // Auto Break if hit 0
        let brokenMsg = '';
        if (user.rod.durability === 0) {
            brokenMsg = `\n\n💥 *PANCINGAN PATAH!* Alatmu hancur setelah tarikan ini.`;
            // Keep the rod object for now so user sees stats one last time, BUT verify logic above deletes it next time? 
            // Actually better to delete it NOW if 0.
            // But we want to show the durability 0/20 in the message first.
            // Let's delete it AFTER sending message logic? Or keep it as 0 and force buy next time?
            // Existing logic at top checks <= 0. So next time they fish it will say PATAH and delete.
            // To make it smoother, let's notify now.
            // We will let the "Next Time" logic handle the actual deletion message for "Realism" (Attempt to fish -> Snap).
            // OR we can just say "It broke".
            // Let's stick to: It is at 0 now. Next use -> Snap.
        }

        saveDB(db);

        const response = `🎣 *HASIL MEMANCING* 🎣\n` +
            `👤 @${senderNumber}\n` +
            `🏹 Rod: ${user.rod.name} (${user.rod.durability}/${user.rod.maxDurability})\n` +
            `--------------------------\n` +
            `🐟 Tangkapan: *${result.emoji} ${result.name}*\n` +
            `💰 Harga Jual: *${result.reward.toLocaleString('id-ID')}* koin\n` +
            `💬 _"${result.msg}"_${brokenMsg}`;

        return sock.sendMessage(from, { text: response, mentions: [sender] }, { quoted: msg });
    }
};
