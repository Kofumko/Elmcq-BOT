import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
    name: 'rvo',
    category: 'utility',
    execute: async (sock, msg, from, args, db, { senderNumber }) => {
        const user = db[senderNumber];

        // 1. VIP Check
        if (!user.vip) {
            return sock.sendMessage(from, { text: '❌ Fitur ini khusus Rank VIP! Ketik *!shop* untuk jadi Sultan.' }, { quoted: msg });
        }

        // 2. Reply Check
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return sock.sendMessage(from, { text: '⚠️ Silakan reply pesan View Once (Foto/Video) dengan *!rvo* atau *!readviewonce*.' }, { quoted: msg });
        }

        // 3. View Once Detection
        const viewOnce = quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessage;
        if (!viewOnce) {
            return sock.sendMessage(from, { text: '⚠️ Pesan yang kamu reply bukan pesan View Once.' }, { quoted: msg });
        }

        const type = Object.keys(viewOnce.message)[0];
        const mediaMsg = viewOnce.message[type];

        if (!['imageMessage', 'videoMessage'].includes(type)) {
            return sock.sendMessage(from, { text: '⚠️ Hanya mendukung View Once Foto atau Video.' }, { quoted: msg });
        }

        // 4. Download and Re-send
        try {
            await sock.sendMessage(from, { text: '⏳ Sedang mengunduh media View Once...' }, { quoted: msg });

            const stream = await downloadContentFromMessage(mediaMsg, type === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (type === 'imageMessage') {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ *READ VIEW ONCE SUCCESS*\n🔓 Media berhasil dibuka oleh VIP!`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `✅ *READ VIEW ONCE SUCCESS*\n🔓 Media berhasil dibuka oleh VIP!`
                }, { quoted: msg });
            }
        } catch (e) {
            console.error('RVO Error:', e);
            await sock.sendMessage(from, { text: '❌ Gagal mengunduh media. Terjadi kesalahan pada server.' }, { quoted: msg });
        }
    }
};
