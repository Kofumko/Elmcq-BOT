import axios from 'axios';

export default {
    name: 'infogempa',
    category: 'info',
    execute: async (sock, msg, from, args, db) => {
        try {
            const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
            const gempa = response.data.Infogempa.gempa;

            const region = gempa.Wilayah;
            const magnitude = gempa.Magnitude;
            const kedalaman = gempa.Kedalaman;
            const koordinat = gempa.Coordinates;
            const potensi = gempa.Potensi;
            const waktu = `${gempa.Tanggal} pukul ${gempa.Jam}`;
            const image = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`;

            const gempaMsg = `🚨 *INFO GEMPA TERKINI (BMKG)* 🚨\n` +
                `--------------------------------\n` +
                `📍 *Wilayah:* ${region}\n` +
                `📈 *Magnitudo:* ${magnitude} SR\n` +
                `🌊 *Kedalaman:* ${kedalaman}\n` +
                `📍 *Koordinat:* ${koordinat}\n` +
                `🕒 *Waktu:* ${waktu}\n` +
                `⚠️ *Potensi:* ${potensi}\n` +
                `--------------------------------\n` +
                `*SMP 46 Project - BMKG Alert*`;

            return sock.sendMessage(from, {
                image: { url: image },
                caption: gempaMsg
            }, { quoted: msg });

        } catch (error) {
            console.error('BMKG API Error:', error);
            return sock.sendMessage(from, { text: '❌ Gagal mengambil data gempa dari BMKG.' }, { quoted: msg });
        }
    }
};
