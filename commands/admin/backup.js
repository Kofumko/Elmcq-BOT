import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import config from '../../config.js';

export default {
    name: 'backup',
    category: 'admin',
    execute: async (sock, msg, from, args, db, { isAdmin, senderNumber }) => {
        const pusatGroupId = db.__settings__?.pusatGroupId;
        const isOwner = config.owner.includes(senderNumber);
        const canManage = isAdmin || isOwner;

        // 1. Location check
        if (from !== pusatGroupId) {
            return sock.sendMessage(from, { text: '❌ Fitur backup hanya bisa diakses di Grup Pusat (Grup 1)!' });
        }

        // 2. Permission check
        if (!canManage) {
            return sock.sendMessage(from, { text: '❌ Akses Ditolak! Hanya Admin Kerajaan yang bisa mencadangkan data.' });
        }

        // 3. Execution
        await sock.sendMessage(from, { text: '📥 *BACKUP PROCESS STARTING...* 📥\nSedang menjalankan skrip backup, mohon tunggu sebentar.' });

        // User suggested path: bash /path/ke/gas_backup.sh
        // We will try running 'bash gas_backup.sh' assuming it's in the PATH or local dir
        // Adjust the command as needed.
        const backupScriptPath = './gas_backup.sh';
        const zipFilePath = path.resolve('./uploads/backup_SMP_terbaru.zip');

        exec(`bash ${backupScriptPath}`, async (error, stdout, stderr) => {
            if (error) {
                console.error('Backup Script Error:', error);
                return sock.sendMessage(from, { text: `❌ *BACKUP GAGAL!* ❌\nTerjadi kesalahan saat menjalankan skrip.\nLog: ${error.message}` });
            }

            // check if file exists
            if (!fs.existsSync(zipFilePath)) {
                return sock.sendMessage(from, { text: '❌ *FILE TIDAK DITEMUKAN!* ❌\nSkrip selesai tapi file `backup_SMP_terbaru.zip` tidak ada di folder uploads.' });
            }

            // 4. Send Document
            await sock.sendMessage(from, {
                document: fs.readFileSync(zipFilePath),
                fileName: 'backup_SMP_terbaru.zip',
                mimetype: 'application/zip',
                caption: `✅ *BACKUP COMPLETED!* ✅\nFile: _backup_SMP_terbaru.zip_\nGenerated locally by system.`
            }, { skipSweep: true }); // No auto-vanish for backup files in Pusat!
        });
    }
};
