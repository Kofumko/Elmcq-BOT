import config from '../../config.js';
import { exec } from 'child_process';

export default {
    name: 'shutdown',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, senderNumber }) => {
        const pusatGroupId = db.__settings__?.pusatGroupId;

        // 1. Location check
        if (from !== pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur shutdown hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }

        // 2. Permission check
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses Ditolak! Hanya Admin Kerajaan yang bisa mematikan server.' });
        }

        await sock.sendMessage(from, { text: 'PC SERVER dimatikan dalam 5 detik...' });

        setTimeout(() => {
            // Updated for Ubuntu/Linux: sudo shutdown -h now
            exec('sudo shutdown -h now', (err) => {
                if (err) sock.sendMessage(from, { text: 'Gagal mematikan PC: ' + err.message });
            });
        }, 5000);
    }
};
