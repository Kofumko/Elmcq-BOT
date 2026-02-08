import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import config from './config.js';
import warnHandler, { addToxicWarning } from './commands/warnHandler.js';
import { isAdmin, isImmune } from './lib/functions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = './database.json';

const http = require('http');
http.createServer((req, res) => res.end('Bot Online')).listen(8080);


function loadDB() {
    if (!fs.existsSync(DB_FILE)) return {};
    const db = JSON.parse(fs.readFileSync(DB_FILE));

    // Fix Stuck PvP / Pending Games on Startup
    if (db.__pending_confirmations__) db.__pending_confirmations__ = {};

    return db;
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const commands = new Map();
const botMessageKeys = new Map(); // Tracks bot message keys per chat: Map<chatJid, Array<{key}>>

async function loadCommands() {
    const categories = ['admin', 'game', 'utility'];
    for (const category of categories) {
        const commandPath = path.join(__dirname, 'commands', category);
        if (!fs.existsSync(commandPath)) continue;
        const files = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));
        for (const file of files) {
            try {
                const fileUrl = pathToFileURL(path.join(commandPath, file)).href;
                const imported = await import(fileUrl);
                const command = imported.default;

                if (command && command.name) {
                    commands.set(command.name, command);
                } else {
                    console.warn(`[Loader] Command file ${file} lacks a default export with a name.`);
                }
            } catch (err) {
                console.error(`[Loader] Failed to load command ${file}:`, err);
            }
        }
    }
}

async function startBot() {
    await loadCommands();
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    // Optimization: Silent Logger
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
        auth: state,
        // Optimization: QR in Terminal
        printQRInTerminal: true,
        logger,
        // Optimization: Custom Browser ID
        browser: ['SMP 46 Bot', 'Safari', '1.0.0']
    });

    // Auto-Sweep & Message Tracking Wrapper
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
        const sentMsg = await originalSendMessage(jid, content, options);
        if (sentMsg && sentMsg.key && !content.delete) {
            // 1. Track message for !cleanchat
            if (!botMessageKeys.has(jid)) botMessageKeys.set(jid, []);
            const keys = botMessageKeys.get(jid);
            keys.push(sentMsg.key);
            if (keys.length > 100) keys.shift(); // Keep only last 100

            // 2. Global Auto-Sweep (60s)
            const text = content.text || content.caption || '';
            const isImportant = /VIP|PEMBAYARAN|TRANSAKSI|BUKTI|PENGUMUMAN|OWNER|START BEDROCK|STOP BEDROCK|SHUTDOWN|BACKUP|GEMPA|CUACA|INFO|IUB|IUP|TOKO/i.test(text);

            const db = loadDB();
            const pusatGroupId = db.__settings__?.pusatGroupId;

            if (jid !== pusatGroupId && !options.skipSweep && !isImportant) {
                setTimeout(async () => {
                    try {
                        await originalSendMessage(jid, { delete: sentMsg.key });
                        // Remove from tracker once deleted
                        const currentKeys = botMessageKeys.get(jid);
                        if (currentKeys) {
                            botMessageKeys.set(jid, currentKeys.filter(k => k.id !== sentMsg.key.id));
                        }
                    } catch (e) { }
                }, 60000);
            }
        }
        return sentMsg;
    };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        // Optimization: QR is handled by makeWASocket printQRInTerminal: true, 
        // but we keep this log just in case the internal one fails or for clarity.
        if (connection === 'open') {
            console.log('🏁 Bot WhatsApp SMP 46 Project Online!');
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                // Auto-Restart Logic
                startBot();
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            for (const participant of participants) {
                try {
                    await sock.sendMessage(id, {
                        text: `@${participant.split('@')[0]} Selamat datang di SMP 46 Project! 🛡️ Cek !help server untuk info IP.`,
                        mentions: [participant]
                    });
                } catch (e) { }
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || from;
        const senderNumber = sender.split('@')[0];
        const isGroup = from.endsWith('@g.us');

        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const text = body.toLowerCase().trim();
        const args = body.trim().split(/ +/).slice(1);
        const cmd = text.split(' ')[0];

        const db = loadDB();

        // 0. Daily Reset Logic (00:00)
        const today = new Date().toLocaleDateString('id-ID');
        if (db.__settings__.lastResetDate !== today) {
            for (const key in db) {
                if (typeof db[key] === 'object' && db[key].slotLimit !== undefined) {
                    db[key].slotLimit = 0;
                }
            }
            db.__settings__.lastResetDate = today;
            saveDB(db);
            console.log(`[Reset] Daily counters reset for ${today}`);
        }

        // 1. Get Group Admins
        let groupAdmins = [];
        if (isGroup) {
            try {
                const metadata = await sock.groupMetadata(from);
                groupAdmins = metadata.participants
                    .filter(p => p.admin)
                    .map(p => p.id.split('@')[0]);
            } catch (e) { }
        }

        // 2. Profile Init
        if (!db[senderNumber]) {
            db[senderNumber] = { id: sender, role: 'Unset', xp: 0, level: 1, balance: 0, bank_balance: 0, lastClaim: 0, lastRob: 0, shieldUntil: 0, warns: 0, afk: -1, afkReason: '', vip: false, vipExpiry: 0, lastMancing: 0, collection: [] };
        }
        const user = db[senderNumber];
        ['balance', 'bank_balance', 'warns', 'xp', 'level', 'lastClaim', 'lastRob', 'shieldUntil', 'afk', 'vip', 'vipExpiry', 'lastMancing', 'collection'].forEach(field => {
            if (user[field] === undefined) {
                if (field === 'afk') user[field] = -1;
                else if (field === 'vip') user[field] = false;
                else if (field === 'collection') user[field] = [];
                else user[field] = 0;
            }
        });

        // 2b. VIP Auto-Expiry
        if (user.vip && user.vipExpiry !== 0 && Date.now() > user.vipExpiry) {
            user.vip = false;
            user.vipExpiry = 0;
            user.role = 'Unset';
            saveDB(db);
            await sock.sendMessage(from, { text: `🔔 *Masa VIP Kamu Telah Habis!* 🔔\nStatus VIP kamu sekarang kembali ke Member Biasa. Terima kasih telah berlangganan!` }, { quoted: msg });
        }

        // 3. AFK Logic
        // 3a. Auto-Un-AFK
        if (user.afk !== -1) {
            const afkDuration = Date.now() - user.afk;
            const hours = Math.floor(afkDuration / 3600000);
            const minutes = Math.floor((afkDuration % 3600000) / 60000);
            const seconds = Math.floor((afkDuration % 60000) / 1000);

            let durationStr = '';
            if (hours > 0) durationStr += `${hours} jam `;
            if (minutes > 0) durationStr += `${minutes} menit `;
            durationStr += `${seconds} detik`;

            user.afk = -1;
            user.afkReason = '';
            saveDB(db);

            await sock.sendMessage(from, {
                text: `👋 Selamat datang kembali *@${senderNumber}*!\nKamu berhenti AFK setelah: *${durationStr}*`,
                mentions: [sender]
            }, { quoted: msg });
        }

        // 3b. AFK Detection (Mentions)
        const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        for (const jid of mentionedJids) {
            const targetNumber = jid.split('@')[0];
            const target = db[targetNumber];
            if (target && target.afk !== -1) {
                await sock.sendMessage(from, {
                    text: `🤫 *@${targetNumber}* sedang AFK!\n📝 Alasan: *${target.afkReason || 'Tanpa Alasan'}*`,
                    mentions: [jid]
                }, { quoted: msg });
            }
        }

        // 3c. Activity Tracking (Chaos Meter)
        if (!db.__stats__) db.__stats__ = { messageHistory: [], commandHistory: [] };
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        db.__stats__.messageHistory.push(now);
        // Cleanup old stats
        db.__stats__.messageHistory = db.__stats__.messageHistory.filter(t => t > oneHourAgo);
        db.__stats__.commandHistory = db.__stats__.commandHistory.filter(t => t > oneHourAgo);

        if (!text.startsWith('!')) {
            saveDB(db);
            return;
        }

        // Log command activity
        db.__stats__.commandHistory.push(now);
        saveDB(db);

        // 4. Auto-Warn (Spam/Toxic)
        await warnHandler(sock, msg, from, isGroup, groupAdmins, config.owner, db);

        // 5. XP & Profile Logic
        user.xp += 1;
        if (user.xp >= 100) {
            user.xp -= 100;
            user.level += 1;
            await sock.sendMessage(from, { text: `🎉 Selamat @${senderNumber}, kamu naik ke level ${user.level}!`, mentions: [sender] });
        }
        saveDB(db);

        // 6. Silent Mode Logic
        const isSilent = db.__settings__?.silentMode || false;
        const executorIsAdmin = isAdmin(senderNumber, groupAdmins);
        const executorIsOwner = config.owner.includes(senderNumber);

        // 6. Command Execution
        let command = null;

        // Find command by name or aliases if we had any
        if (commands.has(cmd.slice(1))) {
            command = commands.get(cmd.slice(1));
        } else {
            // Check specifically for commands that are bundled in files but don't match the filename
            for (const c of commands.values()) {
                if (c.name === 'economy' && ['!gaji', '!bal', '!dompet', '!transfer', '!shop', '!beli', '!deposit', '!withdraw', '!leaderboard', '!top', '!jual', '!bank', '!listbarang', '!misi', '!dp', '!wd'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'entertainment' && ['!slot', '!rob', '!buy-shield', '!me', '!setrole', '!quote', '!level', '!rank', '!perizinan', '!pool', '!catur', '!duel-live'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'server_info' && ['!ip', '!version', '!status', '!list', '!ping', '!infoserver'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'bedrock' && ['!start', '!stop'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'tr' && ['!tr', '!translate'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'chaos' && ['!chaos', '!chaos-meter'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'calc' && ['!calc', '!hitung'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'weather' && ['!infocuaca', '!cuaca'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'rvo' && ['!rvo', '!readviewonce'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'viptime' && ['!viptime', '!vipstatus'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'mancing' && ['!mancing', '!fishing'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'gacha' && ['!gacha', '!roll'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'gacha-anime' && ['!gacha-anime', '!ganime'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'mycollection' && ['!mycollection', '!koleksi'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'duel' && ['!duel', '!chall', '!terima'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'setkoin' && ['!setkoin'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'cleanchat' && ['!cleanchat', '!clean', '!sweep'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'location' && ['!setpusat', '!setarena', '!location', '!koordinat'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'shutdown' && ['!shutdown', '!off'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'exec' && ['!exec', '!terminal'].includes(cmd)) {
                    command = c;
                    break;
                }
                if (c.name === 'backup' && ['!backup', '!cadangkan'].includes(cmd)) {
                    command = c;
                    break;
                }
            }
        }

        if (command) {
            // Smart Silent Mode Filter
            if (isSilent && !executorIsAdmin) {
                if (command.category === 'game' || command.category === 'economy') {
                    await addToxicWarning(sock, msg, from, isGroup, groupAdmins, config.owner, db);
                    saveDB(db);
                    return sock.sendMessage(from, {
                        text: '🤫 Grup sedang dalam Mode Hening untuk informasi penting! Jangan main game/ekonomi dulu atau kamu kena kick!'
                    }, { quoted: msg });
                }
            }

            // Location-Based Restrictions
            const pusatGroupId = db.__settings__?.pusatGroupId;
            const arenaGroupId = db.__settings__?.arenaGroupId;

            if (from === pusatGroupId && command.category === 'game' && !['!me', '!level', '!rank', '!quote'].includes(cmd)) {
                return sock.sendMessage(from, { text: '❌ Hush! Jangan main di sini, ganggu orang lagi urusan Bank. Sana ke Grup Arena!' });
            }
            if (from === arenaGroupId && (command.category === 'admin' && command.name !== 'location')) {
                return sock.sendMessage(from, { text: '❌ Perintah Admin hanya bisa diakses di Grup Komando (Pusat)!' });
            }
            if (from === arenaGroupId && (command.category === 'utility' || command.name === 'help')) {
                // If help category is 'utility' (Sistem), restrict to Pusat unless it's the help command itself
                if (command.name !== 'help') {
                    return sock.sendMessage(from, { text: '❌ Fitur Sistem hanya bisa diakses di Grup Komando (Pusat)!' });
                }
            }

            try {
                await command.execute(sock, msg, from, args, db, {
                    sender,
                    senderNumber,
                    groupAdmins,
                    saveDB,
                    cmd,
                    text,
                    fullText: body,
                    isAdmin: executorIsAdmin,
                    isOwner: executorIsOwner,
                    config,
                    botMessageKeys: botMessageKeys.get(from) || []
                });
            } catch (error) {
                console.error('Command Error:', error);
                sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat menjalankan perintah.' });
            }
        }
    });
}

startBot();
