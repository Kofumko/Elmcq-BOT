export default {
    name: 'entertainment',
    category: 'game',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, cmd, saveDB, text, isAdmin, isOwner }) => {
        try {
            const user = db[senderNumber];

            // !pool and !catur implementation below

            if (cmd === '!pool') {
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Format: !pool @lawan [jumlah_taruhan]' });

                const targetJid = mentioned[0];
                const targetNumber = targetJid.split('@')[0];
                const bet = parseInt(args[1]);

                if (targetNumber === senderNumber) return sock.sendMessage(from, { text: '🎱 Main sendiri? Latihan sana di pojokan.' });
                if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ Lawan belum terdaftar!' });
                if (isNaN(bet) || bet <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah taruhan yang valid!' });

                // Balances Check
                if ((user.balance || 0) < bet) return sock.sendMessage(from, { text: '❌ Saldo kamu tidak cukup!' });
                if ((db[targetNumber].balance || 0) < bet) return sock.sendMessage(from, { text: '❌ Saldo lawan tidak cukup!' });

                // Initialize Skill if not exists
                if (!user.poolSkill) user.poolSkill = 1;
                if (!db[targetNumber].poolSkill) db[targetNumber].poolSkill = 1;

                // Probability Calculation
                // P1 Chance = P1_Skill / (P1_Skill + P2_Skill)
                const totalSkill = user.poolSkill + db[targetNumber].poolSkill;
                const p1Chance = user.poolSkill / totalSkill;

                const rng = Math.random();
                const isP1Win = rng < p1Chance;

                let txt = `🎱 *BILLIARD MATCH* 🎱\n\n`;
                txt += `👤 ${sender.split('@')[0]} (Skill: ${user.poolSkill.toFixed(1)})\n`;
                txt += `🆚\n`;
                txt += `👤 ${targetNumber} (Skill: ${db[targetNumber].poolSkill.toFixed(1)})\n\n`;
                txt += `💰 Taruhan: *${bet.toLocaleString()}*\n`;
                txt += `📊 Win Rate Kamu: *${(p1Chance * 100).toFixed(1)}%*\n\n`;

                if (isP1Win) {
                    user.balance += bet;
                    db[targetNumber].balance -= bet;
                    user.poolSkill += 0.5; // Winner gains skill
                    db[targetNumber].poolSkill += 0.1; // Loser gains exp
                    txt += `🎉 *KAMU MENANG!* 🎉\nBola 9 masuk dengan mulus! Kamu dapat *${bet.toLocaleString()}* koin.\n📈 Skill +0.5`;
                } else {
                    user.balance -= bet;
                    db[targetNumber].balance += bet;
                    db[targetNumber].poolSkill += 0.5;
                    user.poolSkill += 0.1;
                    txt += `💀 *KAMU KALAH!* 💀\nLawanmu melakukan trick shot gila! Kamu rugi *${bet.toLocaleString()}* koin.\n📈 Skill +0.1`;
                }

                saveDB(db);
                return sock.sendMessage(from, { text: txt, mentions: [sender, targetJid] });
            }

            if (cmd === '!catur') {
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Format: !catur @lawan [jumlah_taruhan]' });

                const targetJid = mentioned[0];
                const targetNumber = targetJid.split('@')[0];
                const bet = parseInt(args[1]);

                if (targetNumber === senderNumber) return sock.sendMessage(from, { text: '🏁 Main catur sendiri? Gabut banget.' });
                if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ Lawan belum terdaftar!' });
                if (isNaN(bet) || bet <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah taruhan yang valid!' });

                if ((user.balance || 0) < bet) return sock.sendMessage(from, { text: '❌ Saldo kamu tidak cukup!' });
                if ((db[targetNumber].balance || 0) < bet) return sock.sendMessage(from, { text: '❌ Saldo lawan tidak cukup!' });

                const chessMsg = `♟️ *ARENA CATUR DIMULAI!* ♟️\n\n` +
                    `👤 @${senderNumber} tantang @${targetNumber}\n` +
                    `💰 Taruhan: *${bet.toLocaleString()}* Koin\n\n` +
                    `👉 *Klik Link untuk Membuat Room:*\n` +
                    `https://lichess.org/\n\n` +
                    `ℹ️ *CARA MAIN:*\n` +
                    `Klik link, pilih 'Play with a friend', lalu kirimkan link room yang muncul ke lawanmu!`;

                return sock.sendMessage(from, { text: chessMsg, mentions: [sender, targetJid] });
            }

            if (cmd === '!rob') {
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Tag orang yang ingin dirampok! (Contoh: !rob @user)' });
                const targetJid = mentioned[0];
                const targetNumber = targetJid.split('@')[0];
                if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ User belum terdaftar di database.' });
                if (targetNumber === senderNumber) return sock.sendMessage(from, { text: '😂 Mana bisa rampok diri sendiri!' });
                const now = Date.now();
                if (now - (user.lastRob || 0) < 3600000) {
                    const wait = Math.ceil((3600000 - (now - (user.lastRob || 0))) / 60000);
                    return sock.sendMessage(from, { text: `⏳ *CAPEK BOSS!* ⏳\nKamu harus istirahat dulu selama *${wait} menit* sebelum mulai merampok lagi.` });
                }
                if ((db[targetNumber].shieldUntil || 0) > now) {
                    user.balance = Math.max(0, user.balance - 500);
                    user.lastRob = now;
                    saveDB(db);
                    return sock.sendMessage(from, { text: `🛡️ *TAMENG AKTIF!* 🛡️\n@${targetNumber} dilindungi tameng Sultan! Kamu gagal dan didenda *500 koin*.`, mentions: [targetJid] });
                }
                if ((db[targetNumber].balance || 0) < 200) return sock.sendMessage(from, { text: '❌ User tersebut terlalu miskin untuk dirampok.' });
                const success = Math.random() > 0.6;
                user.lastRob = now;
                if (success) {
                    const amount = Math.floor(Math.random() * (db[targetNumber].balance * 0.3));
                    db[targetNumber].balance -= amount;
                    user.balance += amount;
                    saveDB(db);
                    return sock.sendMessage(from, { text: `🥷 *RAMPOK BERHASIL!* 🥷\nKamu berhasil mencuri *${amount} koin* dari @${targetNumber}!`, mentions: [targetJid] });
                } else {
                    const fine = 250;
                    user.balance = Math.max(0, user.balance - fine);
                    saveDB(db);
                    return sock.sendMessage(from, { text: `🚓 *TERCIDUK!* 🚓\nKamu gagal merampok and didenda *${fine} koin*.` });
                }
            }

            if (cmd === '!buy-shield') {
                const price = 1500;
                if ((user.balance || 0) < price) return sock.sendMessage(from, { text: `❌ Saldo tidak cukup! Harga tameng adalah ${price} koin.` });
                user.balance -= price;
                user.shieldUntil = Date.now() + 86400000;
                saveDB(db);
                return sock.sendMessage(from, { text: `🛡️ *SECURITY SHIELD* 🛡️\nBerhasil membeli tameng anti rampok selama 24 jam!` });
            }

            if (cmd === '!me') {
                // Initialize & Migrate
                if (!user.licenses) user.licenses = [];
                if (user.iubStatus === 'Aktif' && !user.licenses.includes('IUB')) user.licenses.push('IUB');
                if (user.iupStatus === 'Aktif' && !user.licenses.includes('IUP')) user.licenses.push('IUP');
                if (user.iubStatus === 'Aktif' && !user.licenses.includes('IUB')) user.licenses.push('IUB');
                if (user.iupStatus === 'Aktif' && !user.licenses.includes('IUP')) user.licenses.push('IUP');

                const izinDisplay = user.licenses.length > 0 ? user.licenses.map(l => `[${l}]`).join(', ') : 'Warga Sipil (Pengangguran)';
                const bankName = (user.licenses.includes('IUB') && user.registeredBankName) ? user.registeredBankName : 'Belum Terdaftar';
                const totalWealth = (user.balance || 0) + (user.bank_balance || 0);

                const profile = `👤 *PROFIL WARGA SMP 46* 👤\n\n` +
                    `ID: @${senderNumber}\n` +
                    `Role: *${user.role || 'Unset'}*\n` +
                    `Level: *${user.level || 1}* (${user.xp || 0}/100 XP)\n` +
                    `🏢 Bank: *${bankName}*\n` +
                    `📜 Izin: *${izinDisplay}*\n` +
                    `💰 Koin: *${(user.balance || 0).toLocaleString('id-ID')}*\n` +
                    `🏦 Tabungan: *${(user.bank_balance || 0).toLocaleString('id-ID')}*\n` +
                    `💎 *TOTAL KEKAYAAN: ${(totalWealth).toLocaleString('id-ID')}*\n\n` +
                    `VIP: *${user.vip ? 'Aktif ✅' : 'Tidak ❌'}*`;
                return sock.sendMessage(from, { text: profile, mentions: [sender] });
            }

            if (cmd === '!perizinan') {
                if (!user.licenses) user.licenses = [];
                const statusIUB = user.licenses.includes('IUB') ? '✅ AKTIF (Berlisensi)' : '❌ TIDAK ADA';
                const statusIUP = user.licenses.includes('IUP') ? '✅ AKTIF (Berlisensi)' : '❌ TIDAK ADA';

                const msgPerizinan = `📜 *STATUS PERIZINAN WARGA* 📜\n\n` +
                    `👤 ID: @${senderNumber}\n\n` +
                    `1. 📜 *Izin Usaha Bank (IUB)*\n` +
                    `Status: *${statusIUB}*\n\n` +
                    `2. 📦 *Izin Usaha Perdagangan (IUP)*\n` +
                    `Status: *${statusIUP}*\n\n` +
                    `*Info:* Gunakan !beli-iub (7.5k) atau !beli-iup (5k) untuk mengurus perizinan resmi.`;
                return sock.sendMessage(from, { text: msgPerizinan, mentions: [sender] });
            }

            if (cmd === '!level' || cmd === '!rank') {
                if (!user.xp || user.xp === 0) {
                    return sock.sendMessage(from, { text: '❌ Kamu belum memiliki XP, yuk aktif chat dulu!' });
                }

                const users = Object.keys(db)
                    .filter(k => k.endsWith('@s.whatsapp.net') || k.endsWith('@lid'))
                    .map(k => ({
                        number: k,
                        level: Number(db[k].level) || 1,
                        xp: Number(db[k].xp) || 0
                    }));

                users.sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
                const rank = users.findIndex(u => u.number === senderNumber) + 1;

                if (cmd === '!level') {
                    return sock.sendMessage(from, { text: `🆙 *LEVEL @${senderNumber}* 🆙\n\nLevel Saat Ini: *${user.level || 1}*\nProgress XP: *${user.xp || 0}/100*\n\nKeep active to level up!`, mentions: [sender] });
                } else {
                    return sock.sendMessage(from, { text: `🏆 *RANKING @${senderNumber}* 🏆\n\nKamu berada di peringkat *#${rank}* dari *${users.length}* member.\nSemangat tingkatkan levelmu!`, mentions: [sender] });
                }
            }

            if (cmd === '!setrole') {
                const newRole = text.split(' ').slice(1).join(' ');
                if (!newRole) return sock.sendMessage(from, { text: '⚠️ Masukkan nama role! Contoh: !setrole Miner' });
                user.role = newRole;
                saveDB(db);
                return sock.sendMessage(from, { text: `✅ Role kamu berhasil diubah menjadi: *${newRole}*` });
            }

            if (cmd === '!quote') {
                const quoteText = text.replace('!quote', '').trim();
                if (!quoteText) return sock.sendMessage(from, { text: '⚠️ Format: !quote [teks]' });

                const name = msg.pushName || `@${senderNumber}`;
                const formattedQuote = `💬 *KATA-KATA HARI INI*\n` +
                    `—————————————————\n` +
                    `_"${quoteText}"_\n` +
                    `—————————————————\n` +
                    `✍️ Oleh: *${name}*`;

                return sock.sendMessage(from, { text: formattedQuote, mentions: [sender] });
            }

            if (cmd === '!duel-live') {
                // Parsing Users and Weapons
                // Expected formats:
                // 1. !duel-live @User1 [Weapon1] vs @User2 [Weapon2]
                // 2. !duel-live @User2 [MyWeapon] (Sender vs User2)

                let p1, p2, p1WeaponName, p2WeaponName;
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];

                if (mentioned.length >= 2) {
                    p1 = mentioned[0];
                    p2 = mentioned[1];
                    // Attempt to parse weapons from text
                    // Remove command and mentions to isolate weapons
                    let cleanText = text.replace('!duel-live', '').replace(/@\d+/g, '').trim();
                    const parts = cleanText.split(/vs/i);
                    p1WeaponName = parts[0]?.trim() || 'Tangan Kosong';
                    p2WeaponName = parts[1]?.trim() || 'Tangan Kosong';
                } else if (mentioned.length === 1) {
                    p1 = senderNumber + '@s.whatsapp.net';
                    p2 = mentioned[0];
                    // Attempt to parse: !duel-live @User2 [MyWeapon] vs [TheirWeapon] ?? 
                    // Or more likely: !duel-live @User2 [MyWeapon] (Simpler)
                    // Let's assume standard format: !duel-live @User2 [MyWeapon]
                    // Actually user requested: !duel-live [User1] [Senjata1] vs [User2] [Senjata2]
                    // If only 1 mention, assume Sender vs Mentioned.
                    // Splitting by 'vs' might still work if user typed: !duel-live [MyWeapon] vs @User2 [TheirWeapon]

                    let cleanText = text.replace('!duel-live', '').trim();
                    if (cleanText.toLowerCase().includes('vs')) {
                        const parts = cleanText.split(/vs/i);
                        // This is tricky because the mention could be on either side.
                        // Let's rely on the user following the "vs" structure for weapons.
                        // Simple fallback:
                        p1WeaponName = parts[0].replace(/@\d+/g, '').trim() || 'Tangan Kosong';
                        p2WeaponName = parts[1]?.replace(/@\d+/g, '').trim() || 'Tangan Kosong';
                    } else {
                        p1WeaponName = 'Tangan Kosong';
                        p2WeaponName = 'Tangan Kosong';
                    }
                } else {
                    return sock.sendMessage(from, { text: '⚠️ Format Salah! Gunakan: `!duel-live @Lawan [Senjatamu] vs [SenjataLawan]` atau `!duel-live @P1 [S1] vs @P2 [S2]`' });
                }

                if (p1 === p2) return sock.sendMessage(from, { text: '😂 Jangan gelut sama diri sendiri bang, sedih liatnya.' });

                // Weapon Tier Logic
                const getWeaponTier = (weapon) => {
                    const w = weapon.toLowerCase();
                    if (w.includes('netherite')) return 5;
                    if (w.includes('diamond') || w.includes('berlian')) return 4;
                    if (w.includes('iron') || w.includes('besi')) return 3;
                    if (w.includes('stone') || w.includes('batu')) return 2;
                    if (w.includes('gold') || w.includes('emas') || w.includes('wood') || w.includes('kayu')) return 1;
                    return 0; // Hands or unknown
                };

                const tier1 = getWeaponTier(p1WeaponName);
                const tier2 = getWeaponTier(p2WeaponName);

                // Determine Winner (Tier dominant, but minimal chance for upset)
                // Score = (Tier * 10) + Random(0-15)
                const score1 = (tier1 * 10) + Math.floor(Math.random() * 15);
                const score2 = (tier2 * 10) + Math.floor(Math.random() * 15);
                const winner = score1 >= score2 ? p1 : p2;
                const loser = score1 >= score2 ? p2 : p1;
                const winWeapon = score1 >= score2 ? p1WeaponName : p2WeaponName;

                // WWE Commentary Style
                let commentary = `🎙️ *LIVE MATCH: ARENA SMP 46* 🎙️\n`;
                commentary += `🔴 *SUDAH DIMULAI!!* 🔴\n\n`;
                commentary += `🤼‍♂️ *${p1WeaponName}* 🆚 *${p2WeaponName}*\n`;
                commentary += `-------------------------------------------\n\n`;

                // Round 1
                commentary += `🔔 *ROUND 1*\n`;
                commentary += `Keduaya langsung maju! @${p1.split('@')[0]} mencoba menyerang agresif, tapi @${p2.split('@')[0]} melakukan manuver menghindar yang lincah! Penonton bersorak riuh!\n\n`;

                // Round 2
                commentary += `🔔 *ROUND 2*\n`;
                if (tier1 > tier2) {
                    commentary += `Waduh!! ${p1WeaponName} milik @${p1.split('@')[0]} kelihatan jauh lebih keras! @${p2.split('@')[0]} mulai kewalahan menahan serangannya!\n\n`;
                } else if (tier2 > tier1) {
                    commentary += `Gilaa!! ${p2WeaponName} milik @${p2.split('@')[0]} mendominasi pertarungan! @${p1.split('@')[0]} terpojok ke pinggir arena!\n\n`;
                } else {
                    commentary += `Sengit banget Bung! Keduanya saling baku hantam tanpa ampun! Darah mulai bercucuran di lantai arena!\n\n`;
                }

                // Round 3
                commentary += `🔔 *ROUND 3 (FINAL)*\n`;
                commentary += `INI DIA MOMEN PENENTUAN!! @${winner.split('@')[0]} mengeluarkan jurus pamungkas dengan ${winWeapon}-nya!!\n`;
                commentary += `DUAARRR!!! @${loser.split('@')[0]} terpental jauh sampai menabrak dinding penonton!!\n\n`;

                // Result
                commentary += `🛑 *KO! PERTARUNGAN SELESAI!* 🛑\n`;
                commentary += `🏆 Pemenang: *@${winner.split('@')[0]}* 🏆\n`;
                commentary += `_Penonton menggila melihat aksi brutal barusan!_`;

                return sock.sendMessage(from, { text: commentary, mentions: [p1, p2] });
            }
        } catch (e) {
            console.error('Entertainment Error:', e);
            return sock.sendMessage(from, { text: '😵 *Aduh Boss, otaknya lagi muter. Coba lagi bentar ya!*' });
        }
    }
};
