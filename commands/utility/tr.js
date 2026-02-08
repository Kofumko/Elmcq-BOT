import { translate } from '@vitalets/google-translate-api';

export default {
    name: 'tr',
    category: 'utility',
    execute: async (sock, msg, from, args, db, { cmd, fullText }) => {
        const lang = args[0];
        let textToTranslate = args.slice(1).join(' ');

        // Handle reply
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quotedMsg) {
            textToTranslate = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || textToTranslate;
        }

        if (!lang) {
            return sock.sendMessage(from, { text: '⚠️ Format: *!tr [kode_bahasa] [teks]*\nContoh: *!tr en Selamat pagi*\nAtau reply pesan dengan *!tr en*' }, { quoted: msg });
        }

        if (!textToTranslate) {
            return sock.sendMessage(from, { text: '⚠️ Masukkan teks yang ingin diterjemahkan atau reply sebuah pesan!' }, { quoted: msg });
        }

        try {
            const res = await translate(textToTranslate, { to: lang });

            const resultMsg = `🌏 *GOOGLE TRANSLATE* 🌏\n` +
                `--------------------------------\n` +
                `📝 *Original:* ${textToTranslate}\n` +
                `✨ *Hasil (${lang}):* ${res.text}\n` +
                `--------------------------------\n` +
                `*SMP 46 Project - Translator*`;

            return sock.sendMessage(from, { text: resultMsg }, { quoted: msg });
        } catch (error) {
            console.error('Translate Error:', error);
            return sock.sendMessage(from, { text: `❌ Gagal menerjemahkan. Pastikan kode bahasa benar (en, id, ja, dll).\nError: ${error.message}` }, { quoted: msg });
        }
    }
};
