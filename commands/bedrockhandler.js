import { exec } from 'child_process';
import path from 'path';

export default async function bedrockHandler(
  sock,
  body,
  from,
  sender,
  owners,
  admins,
  isGroup,
  groupAdmins
) {
  const text = body.toLowerCase().trim();
  const senderNumber = sender.split('@')[0];

  const isOwner = owners.includes(senderNumber);
  const isBotAdmin = admins.includes(senderNumber);
  const isGroupAdmin = isGroup && groupAdmins.includes(senderNumber);

  const isAuthorized = isOwner || isBotAdmin || isGroupAdmin;

  // ===== START =====
  if (text === '!start bedrock') {
    if (!isAuthorized) {
      return sock.sendMessage(from, {
        text: 'Kamu bukan ADMIN / OWNER !!'
      });
    }

    await sock.sendMessage(from, { text: 'Starting Bedrock server...' });

    exec(`bash ${path.resolve('./start_server.sh')}`, (err) => {
      if (err) {
        return sock.sendMessage(from, {
          text: 'Gagal start Bedrock'
        });
      }
      sock.sendMessage(from, {
        text: 'Bedrock server dimulai!'
      });
    });
  }

  // ===== STOP =====
  if (text === '!stop bedrock') {
    if (!isAuthorized) {
      return sock.sendMessage(from, {
        text: 'Kamu bukan ADMIN / OWNER !!'
      });
    }

    await sock.sendMessage(from, { text: 'Stopping Bedrock server...' });

    exec(`bash ${path.resolve('./stop_server.sh')}`, (err) => {
      if (err) {
        return sock.sendMessage(from, {
          text: 'Gagal stop Bedrock'
        });
      }
      sock.sendMessage(from, {
        text: 'Bedrock server dihentikan!'
      });
    });
  }
}
