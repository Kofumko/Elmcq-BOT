export default {
    name: 'mycollection',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender }) => {
        const user = db[senderNumber];
        const collection = user.collection || [];

        if (collection.length === 0) {
            return sock.sendMessage(from, { text: '📭 Koleksi kamu masih kosong! Ketik *!gacha-anime* untuk mendapatkan kartu pertama kamu.' }, { quoted: msg });
        }

        // Sort by power descending
        const sortedCollection = [...collection].sort((a, b) => b.power - a.power);

        let response = `╭───『 ⛩️ KOLEKSI ANIME 』───\n`;
        response += `┃ 👤 User: @${senderNumber}\n`;
        response += `┃ 📑 Total: ${collection.length} Kartu\n`;
        response += `╰────────────────────────\n\n`;

        sortedCollection.slice(0, 15).forEach((item, index) => {
            response += `${index + 1}. *${item.name}*\n`;
            response += `   🌟 Rarity: ${item.rarity}\n`;
            response += `   ⚔️ Power: ${item.power.toLocaleString('id-ID')}\n\n`;
        });

        if (collection.length > 15) {
            response += `_...dan ${collection.length - 15} kartu lainnya._`;
        } else {
            response += `_Gunakan koinmu untuk memperkuat koleksi!_`;
        }

        return sock.sendMessage(from, { text: response, mentions: [sender] }, { quoted: msg });
    }
};
