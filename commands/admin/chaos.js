export default {
    name: 'chaos',
    category: 'admin',
    execute: async (sock, msg, from, args, db) => {
        if (!db.__stats__) db.__stats__ = { messageHistory: [], commandHistory: [] };

        const now = Date.now();
        const oneMinAgo = now - 60000;
        const oneHourAgo = now - 3600000;

        // Filter data
        const msgsLastMin = db.__stats__.messageHistory.filter(t => t > oneMinAgo).length;
        const cmdsLastHour = db.__stats__.commandHistory.filter(t => t > oneHourAgo).length;

        // Calculation: 
        // PPM: max 30 msgs/min for 60% weight
        // Commands: max 200 cmds/hour for 40% weight
        const ppmScore = Math.min(msgsLastMin / 30, 1) * 60;
        const cmdScore = Math.min(cmdsLastHour / 200, 1) * 40;
        const chaosLevel = Math.round(ppmScore + cmdScore);

        // Progress Bar [████░░░░░░]
        const barLength = 10;
        const filledBars = Math.round((chaosLevel / 100) * barLength);
        const emptyBars = barLength - filledBars;
        const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

        let status = '';
        let comment = '';
        let emoji = '';

        if (chaosLevel <= 30) {
            status = 'LOW';
            emoji = '🟢';
            comment = 'Grup tenang, chat santai. Kayak server baru beres maintenance.';
        } else if (chaosLevel <= 60) {
            status = 'MEDIUM';
            emoji = '🟡';
            comment = 'Mulai ramai, banyak yang pakai command. Keep it cool, guys!';
        } else if (chaosLevel <= 85) {
            status = 'HIGH';
            emoji = '🟠';
            comment = 'Spam terdeteksi! Chat mengalir cepat! CPU Ubuntu saya mulai anget nih!';
        } else {
            status = 'CHAOS';
            emoji = '🔴';
            comment = 'KEKACAUAN TOTAL! Woy, jangan spam! CPU Ubuntu saya panas nih! Bisa meleduk nih mesin!';
        }

        const response = `📊 *CHAOS METER: SMP 46* 📊\n` +
            `--------------------------------\n` +
            `${emoji} *Status:* ${status}\n` +
            `📈 *Intensity:* [${progressBar}] ${chaosLevel}%\n` +
            `--------------------------------\n` +
            `📧 *Msgs/Min:* ${msgsLastMin}\n` +
            `🤖 *Cmds/Hour:* ${cmdsLastHour}\n` +
            `--------------------------------\n` +
            `💬 *Tux-46 Says:*\n_"${comment}"_`;

        return sock.sendMessage(from, { text: response }, { quoted: msg });
    }
};
