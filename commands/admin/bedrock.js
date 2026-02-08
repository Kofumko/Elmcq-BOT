import { exec } from 'child_process';
import path from 'path';
import config from '../../config.js';

export default {
    name: 'bedrock',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, fullText, senderNumber }) => {
        const text = fullText.toLowerCase().trim();
        const pusatGroupId = db.__settings__?.pusatGroupId;

        // 1. Location check
        if (from !== pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur kontrol server hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }

        // 2. Permission check
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses Ditolak! Perintah ini hanya untuk tim Admin SMP 46.' });
        }

        if (text === '!start bedrock') {
            await sock.sendMessage(from, { text: 'Starting Bedrock server...' });
            exec(`bash ${path.resolve('./start_server.sh')}`, (err) => {
                if (err) return sock.sendMessage(from, { text: 'Gagal start Bedrock' });
                sock.sendMessage(from, { text: 'Bedrock server dimulai!' });
            });
        }

        if (text === '!stop bedrock') {
            await sock.sendMessage(from, { text: 'Stopping Bedrock server...' });
            exec(`bash ${path.resolve('./stop_server.sh')}`, (err) => {
                if (err) return sock.sendMessage(from, { text: 'Gagal stop Bedrock' });
                sock.sendMessage(from, { text: 'Bedrock server dihentikan!' });
            });
        }
    }
};
