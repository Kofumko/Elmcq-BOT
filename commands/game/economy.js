export default {
    name: 'economy',
    category: 'economy',
    execute: async (sock, msg, from, args, db, { senderNumber, sender, cmd, saveDB, text, isAdmin, isOwner }) => {
        const user = db[senderNumber];

        // --- Confirmation System (Y/N for > 10,000 Koin) ---
        if (!db.__pending_confirmations__) db.__pending_confirmations__ = {};
        const pending = db.__pending_confirmations__[senderNumber];

        if (pending && (cmd === 'y' || cmd === 'n')) {
            if (cmd === 'y') {
                delete db.__pending_confirmations__[senderNumber];
                // Resolve the pending action by re-executing it with a bypass flag
                return this.execute(sock, msg, from, pending.args, db, { ...arguments[5], cmd: pending.cmd, bypassConfirm: true });
            } else {
                delete db.__pending_confirmations__[senderNumber];
                saveDB(db);
                return sock.sendMessage(from, { text: '❌ Transaksi dibatalkan.' });
            }
        }

        const checkConfirm = (amount, customCmd, customArgs) => {
            if (amount > 10000 && !arguments[5].bypassConfirm) {
                db.__pending_confirmations__[senderNumber] = { cmd: customCmd, args: customArgs, amount };
                saveDB(db);
                sock.sendMessage(from, { text: `⚠️ *KONFIRMASI TRANSAKSI BESAR* ⚠️\n\nAnda akan melakukan transaksi sebesar *${amount.toLocaleString('id-ID')}* Koin.\n\nKetik *Y* untuk lanjut atau *N* untuk batal.` });
                return true;
            }
            return false;
        };


        if (cmd === '!gaji') {
            const daily = 86400000;
            const nowTime = Date.now();
            const lastClaim = user.lastClaim || 0;
            if (nowTime - lastClaim < daily) {
                const remaining = daily - (nowTime - lastClaim);
                const remHours = Math.floor(remaining / 3600000);
                const remMin = Math.floor((remaining % 3600000) / 60000);
                return sock.sendMessage(from, { text: `❌ Kamu sudah mengambil gaji! Tunggu *${remHours} jam ${remMin} menit* lagi.` });
            }
            user.balance = (user.balance || 0) + 150;
            user.lastClaim = nowTime;
            saveDB(db);
            return sock.sendMessage(from, { text: `💰 *GAJI CAIR!* 💰\nSelamat @${senderNumber}, kamu mendapatkan *150 koin* upah harian!\nSaldo: *${user.balance} koin*`, mentions: [sender] });
        }

        if (cmd === '!bal' || cmd === '!dompet') {
            const wallet = user.balance || 0;
            const bank = user.bank_balance || 0;
            const total = wallet + bank;
            return sock.sendMessage(from, { text: `💰 *SALDO KEKAYAAN* 💰\n\n💵 Dompet: *${wallet.toLocaleString('id-ID')}*\n🏦 Bank: *${bank.toLocaleString('id-ID')}*\n💎 *Total: ${total.toLocaleString('id-ID')}*\n\nGunakan !deposit untuk menabung!` });
        }

        if (cmd === '!transfer') {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length === 0) return sock.sendMessage(from, { text: '⚠️ Tag orang yang ingin dikirim koin! Contoh: !transfer @user 100' });
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah koin yang valid!' });
            if ((user.balance || 0) < amount) return sock.sendMessage(from, { text: '❌ Saldo dompet tidak cukup! Withdraw dulu dari bank jika perlu.' });
            const targetJid = mentioned[0];
            const targetNumber = targetJid.split('@')[0];
            if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ Orang tersebut belum terdaftar di database!' });
            user.balance -= amount;
            db[targetNumber].balance = (db[targetNumber].balance || 0) + amount;
            saveDB(db);
            return sock.sendMessage(from, { text: `✅ *TRANSFER BERHASIL!* ✅\n\n👤 Dari: @${senderNumber}\n👤 Ke: @${targetNumber}\n💰 Jumlah: *${amount}* Koin`, mentions: [sender, targetJid] });
        }

        if (cmd === '!shop') {
            const subArg = args[0]?.toLowerCase();

            if (subArg === 'izin') {
                const permits = `📜 *BIRO PERIZINAN KOTA* 📜\n\n` +
                    `1. *Izin Usaha Bank (IUB)*\n` +
                    `   Harga: 7.500 Koin\n` +
                    `   Manfaat: Buka bank, terima setoran, & tarik fee.\n` +
                    `   Cara Beli: *!beli-iub*\n\n` +
                    `2. *Izin Usaha Perdagangan (IUP)*\n` +
                    `   Harga: 5.000 Koin\n` +
                    `   Manfaat: Jual barang di pasar & gadai.\n` +
                    `   Cara Beli: *!beli-iup*`;
                return sock.sendMessage(from, { text: permits });

            } else if (subArg === 'pancing') {
                const shopMsg = `🎣 *TOKO PANCING PAK KUMIS* 🎣\n\n` +
                    `1. *Bamboo Rod* (500 Koin)\n   Durability: 20x | Use: Pemula\n\n` +
                    `2. *Carbon Rod* (2.500 Koin)\n   Durability: 50x | Use: Pro\n\n` +
                    `3. *Lucky Rod* (7.500 Koin)\n   Durability: 100x | Use: Sultan (Hoki++)\n\n` +
                    `Cara beli: *!beli pancing [tipe]*\nContoh: !beli pancing bamboo rod`;
                return sock.sendMessage(from, { text: shopMsg });

            } else if (subArg === 'pasar') {
                // Alias for !listbarang / !bank
                return this.execute(sock, msg, from, ['listbarang'], db, { ...arguments[5], cmd: '!bank' });

            } else {
                const shopMenu = `🏢 *ADMINISTRASI KOTA SMP 46* 🏢\n\n` +
                    `Selamat datang di layanan publik satu pintu.\n` +
                    `Silakan pilih layanan yang Anda butuhkan:\n\n` +
                    `📜 *!shop izin* - Daftar Lisensi Resmi (IUB/IUP).\n` +
                    `🎣 *!shop pancing* - Katalog Alat Pancing.\n` +
                    `📢 *!shop pasar* - Lihat Pasar Warga (Marketplace).\n` +
                    `_Gunakan perintah di atas untuk bertransaksi._`;
                return sock.sendMessage(from, { text: shopMenu });
            }
        }

        if (cmd === '!buy') {
            return sock.sendMessage(from, { text: '⚠️ Perintah *!buy* sudah usang. Gunakan *!beli [ID]* untuk membeli barang di Pasar Warga.' });
        }

        if (cmd === '!deposit' || cmd === '!dp') {
            let depAmount = args[0];
            const currentWallet = user.balance || 0;

            if (depAmount?.toLowerCase() === 'all') {
                depAmount = currentWallet;
            } else {
                depAmount = parseInt(depAmount);
            }

            if (currentWallet === 0 && (args[0]?.toLowerCase() === 'all' || depAmount === 0)) {
                return sock.sendMessage(from, { text: '❌ Gak ada koin yang bisa dipindahkan, Boss!' });
            }

            if (isNaN(depAmount) || depAmount <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah koin yang valid! Contoh: !deposit 100' });
            if (currentWallet < depAmount) return sock.sendMessage(from, { text: '❌ Uang di dompet tidak cukup!' });

            user.balance -= depAmount;
            user.bank_balance = (user.bank_balance || 0) + depAmount;
            saveDB(db);

            return sock.sendMessage(from, { text: `🏦 *BANK: SETOR KILAT!* 🏦\nBerhasil mengamankan *${depAmount.toLocaleString('id-ID')}* koin ke Brankas.\nAman dari copet!` });
        }

        if (cmd === '!withdraw' || cmd === '!wd') {
            let witAmount = args[0];
            const currentBank = user.bank_balance || 0;

            if (witAmount?.toLowerCase() === 'all') {
                witAmount = currentBank;
            } else {
                witAmount = parseInt(witAmount);
            }

            if (currentBank === 0 && (args[0]?.toLowerCase() === 'all' || witAmount === 0)) {
                return sock.sendMessage(from, { text: '❌ Gak ada koin di bank yang bisa ditarik, Boss!' });
            }

            if (isNaN(witAmount) || witAmount <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah koin yang valid! Contoh: !withdraw 100' });
            if (currentBank < witAmount) return sock.sendMessage(from, { text: '❌ Saldo bank kamu tidak cukup!' });

            user.bank_balance -= witAmount;
            user.balance = (user.balance || 0) + witAmount;
            saveDB(db);

            return sock.sendMessage(from, { text: `💵 *ATM: TARIK TUNAI!* 💵\nBerhasil menarik *${witAmount.toLocaleString('id-ID')}* dari ATM.\nJangan sampai dicopet ya!` });
        }

        if (cmd === '!leaderboard' || cmd === '!top') {
            try {
                const subArg = args[0]?.toLowerCase();

                if (subArg === 'player') {
                    const usersArr = Object.keys(db)
                        .filter(k => k !== '__settings__' && k !== '__stats__' && k !== '__marketplace__' && db[k].id && db[k].level !== undefined)
                        .map(userId => ({
                            id: db[userId].id,
                            name: db[userId].id.split('@')[0],
                            level: Number(db[userId].level) || 1,
                            xp: Number(db[userId].xp) || 0
                        }));

                    if (usersArr.length === 0) return sock.sendMessage(from, { text: '📭 Belum ada data pemain!' });

                    // Sort by Level (Primary) then XP (Secondary)
                    usersArr.sort((a, b) => (b.level - a.level) || (b.xp - a.xp));

                    const topUsers = usersArr.slice(0, 10);
                    let leaderMsg = `🏆 *HALL OF FAME: PEMAIN TERGIGIH* 🏆\n\n`;
                    topUsers.forEach((u, index) => {
                        leaderMsg += `${index + 1}. @${u.name} - *Lvl ${u.level}* (${u.xp} XP)\n`;
                    });

                    return sock.sendMessage(from, { text: leaderMsg, mentions: topUsers.map(u => u.id) });

                } else if (subArg === 'sultan') {
                    const usersArr = Object.keys(db)
                        .filter(k => k !== '__settings__' && k !== '__stats__' && k !== '__marketplace__' && db[k].id && db[k].balance !== undefined)
                        .map(userId => ({
                            id: db[userId].id,
                            name: db[userId].id.split('@')[0],
                            balance: Number(db[userId].balance) || 0
                        }));

                    if (usersArr.length === 0) return sock.sendMessage(from, { text: '📭 Belum ada data Sultan!' });

                    // Sort by Balance
                    usersArr.sort((a, b) => b.balance - a.balance);

                    const topUsers = usersArr.slice(0, 10);
                    let leaderMsg = `💰 *THE SULTANS: ORANG TERKAYA* 💰\n\n`;
                    topUsers.forEach((u, index) => {
                        leaderMsg += `${index + 1}. @${u.name} - *${u.balance.toLocaleString('id-ID')}* Koin\n`;
                    });

                    return sock.sendMessage(from, { text: leaderMsg, mentions: topUsers.map(u => u.id) });

                } else {
                    return sock.sendMessage(from, { text: '⚠️ *FORMAT SALAH!* ⚠️\nGunakan salah satu perintah berikut:\n\n1. !top player (XP / Level)\n2. !top sultan (Koin)' });
                }

            } catch (error) {
                console.error('Leaderboard Error at economy.js:', error);
                return sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat memuat leaderboard. Data sedang disinkronisasi.' });
            }
        }

        // --- Bank Marketplace System ---
        if (!db.__marketplace__) db.__marketplace__ = [];

        if (cmd === '!jual') {
            if (!user.licenses || !user.licenses.includes('IUB')) {
                return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Bank (IUB) resmi. Hubungi Admin untuk pendaftaran.' });
            }

            const input = text.slice(cmd.length).trim();
            if (!input.includes('|')) return sock.sendMessage(from, { text: '⚠️ Format salah! Gunakan: *!jual [Nama Barang] | [Harga]*\nContoh: !jual Pedang Bintang | 5000' });

            const [itemName, priceRaw] = input.split('|').map(s => s.trim());
            const price = parseInt(priceRaw);

            if (!itemName || isNaN(price) || price <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan nama barang dan harga yang valid!' });

            const itemId = Math.random().toString(36).substring(2, 7).toUpperCase();
            db.__marketplace__.push({
                id: itemId,
                itemName,
                price,
                sellerId: sender,
                sellerNumber: senderNumber,
                timestamp: Date.now()
            });
            saveDB(db);

            return sock.sendMessage(from, { text: `✅ *TITIPAN BERHASIL!* ✅\n\n📦 Barang: *${itemName}*\n💰 Harga: *${price.toLocaleString('id-ID')}* Koin\n🆔 ID: *${itemId}*\n\nBarang sudah masuk daftar titipan Bank! Siap dibeli siapa saja.` });
        }

        if (cmd === '!bank' || cmd === '!listbarang') {
            if (!user.licenses || !user.licenses.includes('IUB')) {
                return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Bank (IUB) resmi. Hubungi Admin untuk pendaftaran.' });
            }

            if (db.__marketplace__.length === 0) return sock.sendMessage(from, { text: '🏦 *BANK MARKETPLACE* 🏦\n\nSaat ini sedang tidak ada barang titipan (Kosong).' });

            let listMsg = `🏦 *BANK MARKETPLACE: READY STOCK* 🏦\nℹ️ _Patokan Harga Diamond: 50 Koin_\n--------------------------------\n`;
            db.__marketplace__.forEach((item, index) => {
                listMsg += `${index + 1}. *${item.itemName}*\n   💰 Harga: *${item.price.toLocaleString('id-ID')}*\n   🆔 ID: *${item.id}*\n   👤 Penjual: @${item.sellerNumber}\n\n`;
            });
            listMsg += `--------------------------------\nKetik: *!beli [ID_Barang]* untuk membeli.`;

            return sock.sendMessage(from, { text: listMsg, mentions: db.__marketplace__.map(i => i.sellerId) });
        }

        if (cmd === '!beli') {
            // !beli pancing [tipe]
            if (args[0]?.toLowerCase() === 'pancing') {
                const itemType = args.slice(1).join(' ').toLowerCase();

                let price = 0;
                let rodName = '';
                let durability = 0;
                let type = '';

                if (itemType.includes('bamboo')) {
                    price = 500; rodName = 'Bamboo Rod'; durability = 20; type = 'bamboo';
                } else if (itemType.includes('carbon')) {
                    price = 2500; rodName = 'Carbon Rod'; durability = 50; type = 'carbon';
                } else if (itemType.includes('lucky')) {
                    price = 7500; rodName = 'Lucky Rod'; durability = 100; type = 'lucky';
                } else {
                    return sock.sendMessage(from, { text: '❌ Jenis pancingan tidak ditemukan! Cek *!shop pancing*.' });
                }

                if ((user.balance || 0) < price) {
                    return sock.sendMessage(from, { text: `❌ Saldo tidak cukup! Harga ${rodName} adalah ${price.toLocaleString()} koin.` });
                }

                // Check existing rod
                if (user.rod && user.rod.durability > 0) {
                    return sock.sendMessage(from, { text: `❌ Pancinganmu masih ada! Patahkan dulu baru beli lagi.\nSisa Durability: ${user.rod.durability}` });
                }

                user.balance -= price;
                user.rod = { name: rodName, type: type, durability: durability, maxDurability: durability };
                saveDB(db);

                return sock.sendMessage(from, { text: `✅ *PEMBELIAN BERHASIL!*\n\n🎣 Item: *${rodName}*\n💪 Durability: *${durability}*\n💰 Harga: *${price.toLocaleString()}*\n\nSelamat memancing!` });
            }

            if (!user.licenses || !user.licenses.includes('IUB')) {
                return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Bank (IUB) resmi. Hubungi Admin untuk pendaftaran.' });
            }

            const itemId = args[0]?.toUpperCase();
            if (!itemId) return sock.sendMessage(from, { text: '⚠️ Masukkan ID Barang yang ingin dibeli! Contoh: !beli ABC12' });

            const itemIndex = db.__marketplace__.findIndex(i => i.id === itemId);
            if (itemIndex === -1) return sock.sendMessage(from, { text: '❌ ID Barang tidak ditemukan atau sudah laku!' });

            const item = db.__marketplace__[itemIndex];
            if (item.sellerNumber === senderNumber) return sock.sendMessage(from, { text: '❌ Kamu tidak bisa membeli barang milikmu sendiri!' });

            if ((user.balance || 0) < item.price) return sock.sendMessage(from, { text: `❌ Saldo kamu tidak cukup! Harga barang ini adalah *${item.price.toLocaleString('id-ID')}* koin.` });

            // Transaction logic
            const tax = Math.floor(item.price * 0.05);
            const sellerProfit = item.price - tax;

            // Buyer
            user.balance -= item.price;

            // Seller
            if (!db[item.sellerNumber]) db[item.sellerNumber] = { balance: 0 }; // Just in case
            db[item.sellerNumber].balance = (db[item.sellerNumber].balance || 0) + sellerProfit;

            // Optional: Owner Tax (Admin/Owner balance increase if tracked)
            // For now, it just disappears into the system as fee.

            // Remove from marketplace
            db.__marketplace__.splice(itemIndex, 1);
            saveDB(db);

            const successMsg = `💰 *TRANSAKSI SUKSES!* 💰\n\n👤 Pembeli: @${senderNumber}\n👤 Penjual: @${item.sellerNumber}\n📦 Barang: *${item.itemName}*\n💵 Harga: *${item.price.toLocaleString('id-ID')}* Koin\n\nSilakan ambil barangnya di koordinat Bank/Chest! Terima kasih atas kerjasamanya.`;

            return sock.sendMessage(from, { text: successMsg, mentions: [sender, item.sellerId] });
        }



        // --- Mission System ---
        if (!db.__missions__) db.__missions__ = [];

        if (cmd === '!misi') {
            const subCmd = args[0]?.toLowerCase();

            if (subCmd === 'tambah') {
                const input = text.slice(text.indexOf('tambah') + 6).trim();
                if (!input.includes('|')) return sock.sendMessage(from, { text: '⚠️ Format salah! Gunakan: *!misi tambah [Judul] | [Hadiah]*\nContoh: !misi tambah Bantu gali lubang | 1000' });

                const [title, rewardRaw] = input.split('|').map(s => s.trim());
                const reward = parseInt(rewardRaw);

                if (!title || isNaN(reward) || reward <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan judul misi dan hadiah yang valid!' });
                if ((user.balance || 0) < reward) return sock.sendMessage(from, { text: `❌ Saldo kamu tidak cukup! Kamu butuh *${reward.toLocaleString('id-ID')}* koin sebagai jaminan hadiah.` });

                // Escrow: Deduct from creator immediately
                user.balance -= reward;

                const missionId = 'M-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                db.__missions__.push({
                    id: missionId,
                    title,
                    reward,
                    creatorId: sender,
                    creatorNumber: senderNumber,
                    status: 'available',
                    takerId: null,
                    takerNumber: null
                });
                saveDB(db);

                return sock.sendMessage(from, { text: `✅ *MISI DITAMBAHKAN!* ✅\n\n📝 Judul: *${title}*\n💰 Hadiah: *${reward.toLocaleString('id-ID')}* Koin\n🆔 ID: *${missionId}*\n\nBot telah memotong koinmu sebagai jaminan hadiah. Misi siap diambil!` });

            } else if (subCmd === 'info') {
                const availableMissions = db.__missions__.filter(m => m.status === 'available');
                if (availableMissions.length === 0) return sock.sendMessage(from, { text: '📋 *MISI TERBUKA* 📋\n\nSaat ini sedang tidak ada misi yang tersedia.' });

                let listMsg = `📋 *DAFTAR MISI TERBUKA* 📋\n--------------------------------\n`;
                availableMissions.forEach((m, index) => {
                    listMsg += `${index + 1}. *${m.title}*\n   💰 Hadiah: *${m.reward.toLocaleString('id-ID')}*\n   🆔 ID: *${m.id}*\n   👤 Pembuat: @${m.creatorNumber}\n\n`;
                });
                listMsg += `--------------------------------\nKetik: *!misi ambil [ID]* untuk mengambil.`;

                return sock.sendMessage(from, { text: listMsg, mentions: availableMissions.map(m => m.creatorId) });

            } else if (subCmd === 'ambil') {
                const missionId = args[1]?.toUpperCase();
                if (!missionId) return sock.sendMessage(from, { text: '⚠️ Masukkan ID Misi yang ingin diambil! Contoh: !misi ambil M-ABC1' });

                const mIndex = db.__missions__.findIndex(m => m.id === missionId && m.status === 'available');
                if (mIndex === -1) return sock.sendMessage(from, { text: '❌ Misi tidak ditemukan, sudah diambil, atau ID salah!' });

                const mission = db.__missions__[mIndex];
                if (mission.creatorNumber === senderNumber) return sock.sendMessage(from, { text: '❌ Kamu tidak bisa mengambil misimu sendiri!' });

                // Update mission status
                mission.status = 'taken';
                mission.takerId = sender;
                mission.takerNumber = senderNumber;
                saveDB(db);

                return sock.sendMessage(from, {
                    text: `✅ *MISI DIAMBIL!* ✅\n\n👤 @${senderNumber} berhasil mengambil misi dari @${mission.creatorNumber}!\n📝 Misi: *${mission.title}*\n\nSilakan DM/Chat pembuat misi untuk koordinasi penyelesaian. Misi telah dihapus dari daftar Board.`,
                    mentions: [sender, mission.creatorId]
                });

            } else if (subCmd === 'selesai') {
                const missionId = args[1]?.toUpperCase();
                if (!missionId) return sock.sendMessage(from, { text: '⚠️ Masukkan ID Misi yang sudah selesai! Contoh: !misi selesai M-ABC1' });

                const mIndex = db.__missions__.findIndex(m => m.id === missionId);
                if (mIndex === -1) return sock.sendMessage(from, { text: '❌ ID Misi tidak ditemukan!' });

                const mission = db.__missions__[mIndex];
                if (mission.creatorNumber !== senderNumber) return sock.sendMessage(from, { text: '❌ Hanya pembuat misi yang bisa mencairkan hadiah!' });
                if (mission.status !== 'taken') return sock.sendMessage(from, { text: '❌ Misi ini belum ada yang mengambil!' });

                // Distribute reward
                if (!db[mission.takerNumber]) db[mission.takerNumber] = { balance: 0 };
                db[mission.takerNumber].balance = (db[mission.takerNumber].balance || 0) + mission.reward;

                // Remove mission
                db.__missions__.splice(mIndex, 1);
                saveDB(db);

                return sock.sendMessage(from, {
                    text: `💰 *MISI SELESAI & DICAIRKAN!* 💰\n\n👤 Penerima: @${mission.takerNumber}\n👤 Pembuat: @${senderNumber}\n📝 Misi: *${mission.title}*\n💵 Hadiah: *${mission.reward.toLocaleString('id-ID')}* Koin\n\nTerima kasih atas bantuannya!`,
                    mentions: [sender, mission.takerId]
                });

            } else {
                return sock.sendMessage(from, { text: '💬 *PANDUAN MISI* 💬\n\n1. !misi (Daftar tugas)\n2. !misi tambah [Judul] | [Hadiah]\n3. !ambil-misi [ID]\n4. !setor-misi [ID]' });
            }
        }

        if (cmd === '!ambil-misi') return this.execute(sock, msg, from, ['ambil', ...args], db, { ...arguments[5], cmd: '!misi' });
        if (cmd === '!setor-misi') return this.execute(sock, msg, from, ['selesai', ...args], db, { ...arguments[5], cmd: '!misi' });

        // --- Private Bank & Diamond Exchange System ---
        const KURS_DIAMOND = 15;
        if (!db.__pending_deposits__) db.__pending_deposits__ = {};
        if (!db.__private_banks__) db.__private_banks__ = {};
        if (db.__server_treasury__ === undefined) db.__server_treasury__ = 0;

        if (cmd === '!daftarbank') {
            const bankName = args.join(' ');
            if (!bankName) return sock.sendMessage(from, { text: '⚠️ Masukkan nama bank kamu! Contoh: !daftarbank Bank Mamat' });

            if (db.__private_banks__[senderNumber]) return sock.sendMessage(from, { text: `❌ Kamu sudah memiliki bank bernama *${db.__private_banks__[senderNumber].name}*!` });

            if ((user.balance || 0) < 50000) return sock.sendMessage(from, { text: '❌ Saldo kamu tidak cukup! Biaya pendaftaran bank adalah *50.000 koin*.' });

            // License fee goes to Server Owner
            const ownerNum = config.owner[0];
            if (db[ownerNum]) {
                db[ownerNum].balance = (db[ownerNum].balance || 0) + 50000;
            }

            user.balance -= 50000;
            db.__private_banks__[senderNumber] = {
                name: bankName,
                ownerId: sender,
                totalFeesEarned: 0,
                totalLicensePaid: 0,
                timestamp: Date.now()
            };
            saveDB(db);

            // Notify Grup Pusat (Admin Notification)
            const pusatGroupId = db.__settings__?.pusatGroupId;
            if (pusatGroupId) {
                await sock.sendMessage(pusatGroupId, {
                    text: `📜 *[INFO] Warga @${senderNumber} baru saja menerbitkan Izin Usaha Bank baru!*`,
                    mentions: [sender]
                }, { skipSweep: true });
            }

            return sock.sendMessage(from, { text: `🏦 *PENDAFTARAN BANK BERHASIL!* 🏦\n\nSelamat @${senderNumber}, Bank *${bankName}* resmi terdaftar. Biaya lisensi 50k telah disetor ke Server Owner.\n\nKamu sekarang resmi menjadi Owner Bank!`, mentions: [sender, ownerNum + '@s.whatsapp.net'] });
        }

        if (cmd === '!bank' && args[0] === 'list') {
            const banks = Object.keys(db.__private_banks__);
            let listMsg = `🏦 *DAFTAR BANK SWASTA KERAJAAN* 🏦\n--------------------------------\n1. *Bank Kerajaan* (Pusat)\n   Owner: Kerajaan SMP 46\n\n`;

            banks.forEach((ownerNum, index) => {
                const b = db.__private_banks__[ownerNum];
                listMsg += `${index + 2}. *${b.name}*\n   Owner: @${ownerNum}\n\n`;
            });
            listMsg += `--------------------------------\nCara setor: *!setor [Jumlah] [NamaBank/Owner]*`;

            return sock.sendMessage(from, { text: listMsg, mentions: banks.map(n => n + '@s.whatsapp.net') });
        }

        if (cmd === '!setor') {
            if (!user.licenses || !user.licenses.includes('IUB')) {
                return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Bank (IUB) resmi. Hubungi Admin untuk pendaftaran.' });
            }

            const amount = parseInt(args[0]);
            const targetBank = args.slice(1).join(' ').toLowerCase();

            if (isNaN(amount) || amount <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah Diamond yang ingin disetor! Contoh: !setor 5' });

            // Admin Fee Check (1 Coin)
            if ((user.balance || 0) < 1) return sock.sendMessage(from, { text: '❌ Saldo kamu tidak cukup untuk membayar biaya administrasi (1 koin)!' });

            // Determine Bank Owner
            let bankOwnerNum = 'system';
            let bankName = 'Bank Kerajaan';

            if (targetBank) {
                // Find bank by owner number or name
                const foundOwnerNum = Object.keys(db.__private_banks__).find(num =>
                    num === targetBank || db.__private_banks__[num].name.toLowerCase().includes(targetBank)
                );

                if (foundOwnerNum) {
                    bankOwnerNum = foundOwnerNum;
                    bankName = db.__private_banks__[foundOwnerNum].name;
                } else if (targetBank !== 'pusat' && targetBank !== 'kerajaan') {
                    return sock.sendMessage(from, { text: `❌ Bank/Owner *${targetBank}* tidak ditemukan! Gunakan !bank list untuk melihat daftar bank.` });
                }
            }

            // Fee Spliting (0.5 to Server Owner, 0.5 to Bank Owner)
            user.balance -= 1;
            const svOwnerNum = config.owner[0];
            if (db[svOwnerNum]) db[svOwnerNum].balance = (db[svOwnerNum].balance || 0) + 0.5;

            if (bankOwnerNum !== 'system') {
                db.__private_banks__[bankOwnerNum].totalFeesEarned += 0.5;
                db.__private_banks__[bankOwnerNum].totalLicensePaid += 0.5;
                if (db[bankOwnerNum]) db[bankOwnerNum].balance = (db[bankOwnerNum].balance || 0) + 0.5;
            }

            const depositId = Math.random().toString(36).substring(2, 7).toUpperCase();
            db.__pending_deposits__[depositId] = {
                id: depositId,
                userNumber: senderNumber,
                userId: sender,
                amount: amount,
                bankOwner: bankOwnerNum,
                bankName: bankName,
                timestamp: Date.now()
            };
            saveDB(db);

            const pusatGroupId = db.__settings__?.pusatGroupId;
            if (pusatGroupId) {
                const processorMention = bankOwnerNum === 'system' ? 'Owner' : `@${bankOwnerNum}`;
                await sock.sendMessage(pusatGroupId, {
                    text: `🏦 *NOTIFIKASI SETORAN BANK* 🏦\n\n👤 Member: @${senderNumber}\n💎 Diamond: *${amount}*\n🏦 Bank Tujuan: *${bankName}*\n🆔 ID: *${depositId}*\n\n${processorMention}, silakan cek Chest. Ketik *!acc_bank ${depositId}* atau *!tolak_bank ${depositId}*.`,
                    mentions: [sender, bankOwnerNum + '@s.whatsapp.net']
                }, { skipSweep: true });
            }

            return sock.sendMessage(from, { text: `✅ *LAPORAN TERKIRIM!* ✅ (Admin Fee: 1 Koin)\n\nLaporan setor *${amount} Diamond* ke *${bankName}* telah diterima.\n\n🆔 ID Laporan: *${depositId}*` });
        }

        if (cmd === '!acc_bank' || cmd === '!tolak_bank') {
            const depositId = args[0]?.toUpperCase();
            if (!depositId) return sock.sendMessage(from, { text: `⚠️ Masukkan ID Laporan! Contoh: !${cmd.slice(1)} ABC12` });

            const deposit = db.__pending_deposits__[depositId];
            if (!deposit) return sock.sendMessage(from, { text: '❌ ID Laporan tidak ditemukan atau sudah diproses!' });

            // Authority Check
            const isBankOwner = (deposit.bankOwner === senderNumber);
            const isAdm = isAdmin || isOwner;

            if (!isAdm && !isBankOwner) return sock.sendMessage(from, { text: '⚖️ *Mohon maaf, transaksi ditolak.* Anda belum terdaftar sebagai pemegang Izin Usaha Bank (IUB) resmi SMP 46. Silakan hubungi kantor Admin untuk pengurusan izin.' });

            if (cmd === '!tolak_bank') {
                delete db.__pending_deposits__[depositId];
                saveDB(db);
                return sock.sendMessage(from, { text: `❌ *SETORAN DITOLAK!* ❌\n\nLaporan @${deposit.userNumber} (ID: ${depositId}) telah ditolak oleh Owner Bank.`, mentions: [deposit.userId] });
            }

            const coinReward = deposit.amount * KURS_DIAMOND;

            // Update balance
            if (!db[deposit.userNumber]) db[deposit.userNumber] = { balance: 0 };
            db[deposit.userNumber].balance = (db[deposit.userNumber].balance || 0) + coinReward;

            // Remove from pending
            delete db.__pending_deposits__[depositId];
            saveDB(db);

            const receipt = `✅ *TRANSAKSI SUKSES!* ✅\n\n👤 Member: @${deposit.userNumber}\n🏦 Bank: *${deposit.bankName}*\n💎 Diamond: *${deposit.amount}*\n💰 Koin Diterima: *${coinReward.toLocaleString('id-ID')}*\n✅ Saldo Sekarang: *${db[deposit.userNumber].balance.toLocaleString('id-ID')}* Koin\n\nTerima kasih telah menabung di Bank Kerajaan!`;

            return sock.sendMessage(from, { text: receipt, mentions: [deposit.userId] });
        }

        if (cmd === '!tarik') {
            if (!user.licenses || !user.licenses.includes('IUB')) {
                return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Bank (IUB) resmi. Hubungi Admin untuk pendaftaran.' });
            }

            const diamondAmount = parseInt(args[0]);
            const targetBank = args.slice(1).join(' ').toLowerCase() || 'pusat';

            if (isNaN(diamondAmount) || diamondAmount <= 0) return sock.sendMessage(from, { text: '⚠️ Masukkan jumlah Diamond yang ingin ditarik! Contoh: !tarik 2' });

            const totalCost = (diamondAmount * KURS_DIAMOND) + 1; // Price + 1 Coin Admin Fee

            if ((user.balance || 0) < totalCost) return sock.sendMessage(from, { text: `❌ Saldo koin kamu tidak cukup! Untuk menarik *${diamondAmount} Diamond*, kamu butuh *${totalCost.toLocaleString('id-ID')}* koin (termasuk 1 koin biaya admin).` });

            // Execution
            user.balance -= totalCost;
            const svOwnerNum = config.owner[0];
            if (db[svOwnerNum]) db[svOwnerNum].balance = (db[svOwnerNum].balance || 0) + 0.5;

            let bankOwnerNum = 'system';
            let bankName = 'Bank Kerajaan';

            const foundOwnerNum = Object.keys(db.__private_banks__).find(num =>
                num === targetBank || db.__private_banks__[num].name.toLowerCase().includes(targetBank)
            );

            if (foundOwnerNum) {
                bankOwnerNum = foundOwnerNum;
                bankName = db.__private_banks__[foundOwnerNum].name;
                db.__private_banks__[bankOwnerNum].totalFeesEarned += 0.5;
                db.__private_banks__[bankOwnerNum].totalLicensePaid += 0.5;
                if (db[foundOwnerNum]) db[foundOwnerNum].balance = (db[foundOwnerNum].balance || 0) + 0.5;
            }

            saveDB(db);

            const pusatGroupId = db.__settings__?.pusatGroupId;
            if (pusatGroupId) {
                const processorMention = bankOwnerNum === 'system' ? 'Owner' : `@${bankOwnerNum}`;
                await sock.sendMessage(pusatGroupId, {
                    text: `🚨 *[PENARIKAN DIAMOND]* 🚨 (Admin Fee: 1 Koin)\n\n👤 Member: @${senderNumber}\n🏦 Bank: *${bankName}*\n💎 Item: *${diamondAmount}* Diamond\n💰 Koin Dipotong: *${(diamondAmount * KURS_DIAMOND).toLocaleString('id-ID')}*\n\n${processorMention}, silakan letakkan Diamond tersebut di Chest Bank untuk @${senderNumber}.`,
                    mentions: [sender, bankOwnerNum + '@s.whatsapp.net']
                }, { skipSweep: true });
            }

            return sock.sendMessage(from, { text: `✅ *PENARIKAN BERHASIL!* ✅\n\nKamu telah menarik *${diamondAmount} Diamond* dari *${bankName}*.\n💰 Koin dipotong: *${totalCost.toLocaleString('id-ID')}* (Sudah termasuk biaya admin).\n\nSilakan ambil Diamond kamu di Chest Bank!` });
        }

        if (cmd === '!cekbank') {
            if (!isOwner) return sock.sendMessage(from, { text: '❌ Akses ditolak! Hanya Server Owner yang bisa memantau bank swasta.' });

            const target = args.join(' ').toLowerCase();
            if (!target) return sock.sendMessage(from, { text: '⚠️ Masukkan nama bank atau nomor owner! Contoh: !cekbank Bank Mamat' });

            const ownerNum = Object.keys(db.__private_banks__).find(num =>
                num === target || db.__private_banks__[num].name.toLowerCase().includes(target)
            );

            if (!ownerNum) return sock.sendMessage(from, { text: '❌ Bank tidak ditemukan!' });

            const bank = db.__private_banks__[ownerNum];
            const pendingCount = Object.values(db.__pending_deposits__).filter(d => d.bankOwner === ownerNum).length;

            const cekMsg = `🔍 *PENGAWASAN BANK SWASTA* 🔍\n\n🏦 Nama Bank: *${bank.name}*\n👤 Owner: @${ownerNum}\n\n📊 Statistik:\n- Transaksi Pending: *${pendingCount}*\n- Total Proffit Owner Bank: *${bank.totalFeesEarned}* Koin\n- Total Upeti ke Server: *${bank.totalLicensePaid || 0}* Koin\n\nStatus: *TERDAFTAR & DIAWASI*`;

            return sock.sendMessage(from, { text: cekMsg, mentions: [ownerNum + '@s.whatsapp.net'] });
        }

        if (cmd === '!beli-iub') {
            if (!user.licenses) user.licenses = [];
            if (user.licenses.includes('IUB')) return sock.sendMessage(from, { text: '✅ Anda sudah memiliki Izin Usaha Bank (IUB) resmi.' });

            // Pending Check
            if (user.licenseRequest) {
                return sock.sendMessage(from, { text: `⛔ *ANTRE DONG!* ⛔\n\nPermohonan izin *${user.licenseRequest}* mu yang sebelumnya saja belum di-ACC sama Admin/Walikota.\n\nSelesaikan itu dulu atau minta @${config.owner[0]} ACC!`, mentions: [config.owner[0] + '@s.whatsapp.net'] });
            }

            if ((user.balance || 0) < 7500) return sock.sendMessage(from, { text: '❌ Saldo tidak cukup! Harga IUB adalah *7.500 koin*.' });

            if (checkConfirm(7500, cmd, args)) return;

            user.balance -= 7500;
            user.licenseRequest = 'IUB'; // Set Pending
            saveDB(db);

            const pusatGroupId = db.__settings__?.pusatGroupId;
            if (pusatGroupId) {
                await sock.sendMessage(pusatGroupId, {
                    text: `📜 *[PENDING] Warga @${senderNumber} mengajukan Izin Usaha Bank (IUB).*\nKetik *!acc-iub @${senderNumber}* atau *!tolak @${senderNumber}*`,
                    mentions: [sender]
                }, { skipSweep: true });
            }

            return sock.sendMessage(from, { text: '📝 *PERMOHONAN DIKIRIM!* 📝\n\nBiaya 7.500 koin telah dibayar. Izin IUB Anda sedang menunggu persetujuan (ACC) dari Admin/Walikota.\n\nMohon bersabar!.' });
        }

        if (cmd === '!beli-iup') {
            if (!user.licenses) user.licenses = [];
            if (user.licenses.includes('IUP')) return sock.sendMessage(from, { text: '✅ Anda sudah memiliki Izin Usaha Perdagangan (IUP) resmi.' });

            // Pending Check
            if (user.licenseRequest) {
                return sock.sendMessage(from, { text: `⛔ *ANTRE DONG!* ⛔\n\nPermohonan izin *${user.licenseRequest}* mu yang sebelumnya saja belum di-ACC sama Admin/Walikota.\n\nSelesaikan itu dulu atau minta @${config.owner[0]} ACC!`, mentions: [config.owner[0] + '@s.whatsapp.net'] });
            }

            if ((user.balance || 0) < 5000) return sock.sendMessage(from, { text: '❌ Saldo tidak cukup! Harga IUP adalah *5.000 koin*.' });

            if (checkConfirm(5000, cmd, args)) return;

            user.balance -= 5000;
            user.licenseRequest = 'IUP'; // Set Pending
            saveDB(db);

            const pusatGroupId = db.__settings__?.pusatGroupId;
            if (pusatGroupId) {
                await sock.sendMessage(pusatGroupId, {
                    text: `📦 *[PENDING] Warga @${senderNumber} mengajukan Izin Usaha Perdagangan (IUP).*\nKetik *!acc-iup @${senderNumber}* atau *!tolak @${senderNumber}*`,
                    mentions: [sender]
                }, { skipSweep: true });
            }

            return sock.sendMessage(from, { text: '📝 *PERMOHONAN DIKIRIM!* 📝\n\nBiaya 5.000 koin telah dibayar. Izin IUP Anda sedang menunggu persetujuan (ACC) dari Admin/Walikota.\n\nMohon bersabar!.' });
        }

        // --- IUP Commands (Gated) ---
        if (['!buka-toko', '!tambah-stok', '!atur-harga', '!gadai'].includes(cmd)) {
            if (!user.licenses || !user.licenses.includes('IUP')) return sock.sendMessage(from, { text: '⚠️ Transaksi Ditolak. Anda tidak memiliki Izin Usaha Perdagangan (IUP) resmi. Hubungi Admin untuk pendaftaran.' });
            return sock.sendMessage(from, { text: `📦 *TOKO/PERDAGANGAN* 📦\nFitur *${cmd}* akan segera hadir di update selanjutnya! IUP Anda sudah terverifikasi.` });
        }

        // --- Brankas Commands (Public Services) ---
        if (['!simpan', '!tarik-barang', '!cek-brankas'].includes(cmd)) {
            return sock.sendMessage(from, { text: `🔐 *BRANKAS BARANG* 🔐\nLayanan *${cmd}* sedang dalam pemeliharaan (Maintenance) oleh Tim Pengembang IUP.` });
        }

        if (cmd === '!acc-iub' || cmd === '!acc-iup' || cmd === '!tolak' || cmd === '!cabut-izin') {
            if (!isAdmin && !isOwner) return sock.sendMessage(from, { text: '❌ Perintah ini hanya untuk Admin/Owner.' });

            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length === 0) return sock.sendMessage(from, { text: `⚠️ Tag warga yang ingin diproses!` });

            const targetJid = mentioned[0];
            const targetNumber = targetJid.split('@')[0];
            if (!db[targetNumber]) return sock.sendMessage(from, { text: '❌ Warga tidak ditemukan di database!' });

            const pusatGroupId = db.__settings__?.pusatGroupId;

            if (cmd === '!tolak') {
                const reqType = db[targetNumber].licenseRequest;
                if (!reqType) return sock.sendMessage(from, { text: '❌ User ini tidak memiliki permohonan izin pending.' });

                // Refund Logic
                let refund = 0;
                if (reqType === 'IUB') refund = 7500;
                if (reqType === 'IUP') refund = 5000;

                db[targetNumber].balance = (db[targetNumber].balance || 0) + refund;
                delete db[targetNumber].licenseRequest;
                saveDB(db);

                if (pusatGroupId) {
                    await sock.sendMessage(pusatGroupId, {
                        text: `🚫 *[TOLAK] Permohonan ${reqType} @${targetNumber} ditolak! Dana ${refund} dikembalikan.*`,
                        mentions: [targetJid]
                    }, { skipSweep: true });
                }
                return sock.sendMessage(from, { text: `🚫 Permohonan *${reqType}* @${targetNumber} DITOLAK. Dana *${refund}* koin telah direfund.`, mentions: [targetJid] });
            }

            if (cmd === '!acc-iub') {
                if (!db[targetNumber].licenses) db[targetNumber].licenses = [];
                // Check if User requested/Using Direct ACC override? 
                // Let's allow Direct ACC even without request for owner convenience, 
                // BUT clear request if exists.

                if (!db[targetNumber].licenses.includes('IUB')) {
                    db[targetNumber].licenses.push('IUB');
                    if (db[targetNumber].licenseRequest === 'IUB') delete db[targetNumber].licenseRequest; // Clear pending
                    saveDB(db);
                    if (pusatGroupId) {
                        await sock.sendMessage(pusatGroupId, {
                            text: `📜 *[ACC] Admin @${senderNumber} menyetujui Izin Usaha Bank (IUB) untuk @${targetNumber}!*`,
                            mentions: [sender, targetJid]
                        }, { skipSweep: true });
                    }
                    return sock.sendMessage(from, { text: `✅ Berhasil ACC IUB untuk @${targetNumber}.`, mentions: [targetJid] });
                } else {
                    return sock.sendMessage(from, { text: `⚠️ User @${targetNumber} sudah punya IUB!`, mentions: [targetJid] });
                }
            }

            if (cmd === '!acc-iup') {
                if (!db[targetNumber].licenses) db[targetNumber].licenses = [];
                if (!db[targetNumber].licenses.includes('IUP')) {
                    db[targetNumber].licenses.push('IUP');
                    if (db[targetNumber].licenseRequest === 'IUP') delete db[targetNumber].licenseRequest;
                    saveDB(db);
                    if (pusatGroupId) {
                        await sock.sendMessage(pusatGroupId, {
                            text: `📦 *[ACC] Admin @${senderNumber} menyetujui Izin Usaha Perdagangan (IUP) untuk @${targetNumber}!*`,
                            mentions: [sender, targetJid]
                        }, { skipSweep: true });
                    }
                }
            }

            if (cmd === '!cabut-izin') {
                const type = args[1]?.toUpperCase();
                if (!['IUB', 'IUP'].includes(type)) return sock.sendMessage(from, { text: '⚠️ Tentukan jenis izin! Contoh: !cabut-izin @user IUB' });

                if (db[targetNumber].licenses && db[targetNumber].licenses.includes(type)) {
                    db[targetNumber].licenses = db[targetNumber].licenses.filter(l => l !== type);
                    saveDB(db);
                    if (pusatGroupId) {
                        await sock.sendMessage(pusatGroupId, {
                            text: `🚫 *[CABUT] Admin @${senderNumber} mencabut izin ${type} dari @${targetNumber}!*`,
                            mentions: [sender, targetJid]
                        }, { skipSweep: true });
                    }
                    return sock.sendMessage(from, { text: `🚫 Berhasil mencabut ${type} dari @${targetNumber}.`, mentions: [targetJid] });
                } else {
                    return sock.sendMessage(from, { text: `⚠️ User @${targetNumber} tidak punya izin ${type}!`, mentions: [targetJid] });
                }
            }
        }

        if (cmd === '!daftar-bank') {
            if (!user.licenses || !user.licenses.includes('IUB')) return sock.sendMessage(from, { text: '❌ Akses Ditolak. Perintah ini hanya untuk pemegang Izin Usaha Bank (IUB) resmi.' });

            const bankName = args.join(' ');
            if (!bankName) return sock.sendMessage(from, { text: '⚠️ Masukkan nama bank yang ingin didaftarkan! Contoh: !daftar-bank Bank Mamat' });

            if ((user.balance || 0) < 10000) return sock.sendMessage(from, { text: '❌ Saldo tidak cukup! Biaya pendaftaran nama bank adalah *10.000 koin*.' });

            user.balance -= 10000;
            user.registeredBankName = bankName;
            saveDB(db);

            return sock.sendMessage(from, { text: `✅ *Selamat! Bank Anda resmi terdaftar dengan nama: ${bankName}!*` });
        }
    }
};
