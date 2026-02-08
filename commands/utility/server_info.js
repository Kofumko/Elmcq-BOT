import config from '../../config.js';
import axios from 'axios';
import os from 'os';

export default {
    name: 'server_info',
    category: 'utility',
    execute: async (sock, msg, from, args, db, { cmd, fullText }) => {
        if (cmd === '!ip') {
            return sock.sendMessage(from, { text: config.server.ip });
        }

        if (cmd === '!version') {
            return sock.sendMessage(from, { text: config.server.version });
        }

        if (cmd === '!status') {
            try {
                const res = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${config.server.ip}`);
                const d = res.data;
                let reply = `Server: ${d.online ? 'ONLINE' : 'OFFLINE'}`;
                if (d.online) {
                    reply += `\nPlayers: ${d.players.online}/${d.players.max}`;
                    reply += `\nVersion: ${d.version}`;
                }
                return sock.sendMessage(from, { text: reply });
            } catch (e) {
                return sock.sendMessage(from, { text: 'Gagal mengecek status server.' });
            }
        }

        if (cmd === '!list') {
            try {
                const res = await axios.get(`https://api.mcsrvstat.us/bedrock/3/${config.server.ip}`);
                const d = res.data;
                if (!d.online) return sock.sendMessage(from, { text: 'Server OFFLINE' });
                const players = d.players.list || [];
                if (players.length === 0) return sock.sendMessage(from, { text: 'Tidak ada pemain online.' });
                return sock.sendMessage(from, { text: `Pemain online (${players.length}):\n- ${players.join('\n- ')}` });
            } catch (e) {
                return sock.sendMessage(from, { text: 'Gagal mengambil daftar pemain.' });
            }
        }

        if (cmd === '!ping') {
            const start = Date.now();
            await sock.sendMessage(from, { text: 'Pinging...' });
            const end = Date.now();
            return sock.sendMessage(from, { text: `Pong! Latency: ${end - start}ms` });
        }

        if (cmd === '!infoserver') {
            const platform = os.platform();
            const cpu = os.cpus()[0].model;
            const ram = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
            const uptime = os.uptime();
            const upHours = Math.floor(uptime / 3600);
            const upMin = Math.floor((uptime % 3600) / 60);

            const infoText = `🖥️ *INFO SERVER HOST* 🖥️\n\n` +
                `💻 *CPU:* ${cpu}\n` +
                `🧠 *RAM:* ${ram} GB (Free: ${freeRam} GB)\n` +
                `📀 *OS:* ${platform}\n` +
                `⏳ *Uptime:* ${upHours} Jam ${upMin} Menit`;
            return sock.sendMessage(from, { text: infoText });
        }
    }
};
