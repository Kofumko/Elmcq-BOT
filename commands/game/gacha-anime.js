import { characters } from '../../lib/characters.js';

export default {
    name: 'gacha-anime',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, saveDB }) => {
        const user = db[senderNumber];
        const cost = 2000;

        if ((user.balance || 0) < cost) {
            return sock.sendMessage(from, { text: `❌ Saldo koin kamu tidak cukup! Gacha Anime butuh *${cost.toLocaleString('id-ID')} koin*.` }, { quoted: msg });
        }

        // Deduct cost
        user.balance -= cost;

        const rand = Math.random() * 100;
        let selectedRarity = '';
        if (rand <= 70) selectedRarity = 'C';
        else if (rand <= 90) selectedRarity = 'R';
        else if (rand <= 99) selectedRarity = 'SR';
        else selectedRarity = 'UR';

        const possibleChars = characters.filter(c => c.rarity === selectedRarity);

        // Safety check if rarity filter fails (though it shouldn't)
        if (possibleChars.length === 0) {
            return sock.sendMessage(from, { text: '❌ Terjadi kesalahan pada database karakter. Silakan hubungi Owner.' });
        }

        const char = possibleChars[Math.floor(Math.random() * possibleChars.length)];

        const newCard = {
            name: char.name,
            rarity: `[${char.rarity}]`,
            power: char.power,
            date: Date.now()
        };

        user.collection.push(newCard);
        saveDB(db);

        const response = `╭───『 ⛩️ GACHA ANIME 』───\n` +
            `┃ 👤 User: @${senderNumber}\n` +
            `┃ 🃏 Karakter: *${char.name}*\n` +
            `┃ 🌟 Rarity: *[${char.rarity}]*\n` +
            `┃ ⚔️ Power: *${char.power.toLocaleString('id-ID')}*\n` +
            `╰────────────────────────\n` +
            `*Ketik !mycollection untuk lihat kartu kamu!*`;

        return sock.sendMessage(from, { text: response, mentions: [sender] }, { quoted: msg });
    }
};
