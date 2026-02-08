import { evaluate } from 'mathjs';

export default {
    name: 'calc',
    category: 'utility',
    execute: async (sock, msg, from, args, db, { fullText }) => {
        const expression = args.join(' ');

        if (!expression) {
            return sock.sendMessage(from, { text: '⚠️ Masukkan rumus yang ingin dihitung!\nContoh: *!calc 50 * 2 / 5*' }, { quoted: msg });
        }

        // Auto-Cleaner (Preprocessing)
        let processedExpression = expression
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/π/g, 'pi')
            .replace(/e/g, '2.71828')
            .replace(/²/g, '^2')
            .replace(/³/g, '^3')
            .replace(/√(?:\((.*?)\)|(\d+(?:\.\d+)?))/g, (match, p1, p2) => `sqrt(${p1 || p2})`);

        try {
            const result = evaluate(processedExpression);
            // Handle matrices, units, and objects properly
            const resultStr = typeof result === 'object' ? result.toString() : result;

            const response = `───『 TUX-46 MATH 』───\n\n` +
                `� *Soal:* ${expression}\n` +
                `✅ *Hasil:* ${resultStr}`;

            return sock.sendMessage(from, { text: response }, { quoted: msg });
        } catch (error) {
            return sock.sendMessage(from, { text: '❌ Tux bingung, rumusnya terlalu sakti!' }, { quoted: msg });
        }
    }
};
