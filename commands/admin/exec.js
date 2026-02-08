import config from '../../config.js';
import { exec } from 'child_process';

export default {
    name: 'exec',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, fullText, senderNumber }) => {
        const pusatGroupId = db.__settings__?.pusatGroupId;

        // 1. Location check
        if (from !== pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur terminal hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }

        // 2. Permission check
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses ditolak! Hanya Admin Kerajaan yang bisa mengakses terminal.' });
        }

        const command = fullText.replace('!exec', '').trim();
        if (!command) return sock.sendMessage(from, { text: '⚠️ Masukkan perintah terminal!' });

        exec(command, (error, stdout, stderr) => {
            let output = '';
            if (error) output += `⚠️ Error: ${error.message}\n`;
            if (stderr) output += `⚠️ Stderr: ${stderr}\n`;
            if (stdout) output += `\n${stdout}`;

            if (!output) output = '✅ Command executed (No output)';

            sock.sendMessage(from, { text: output });
        });
    }
};
