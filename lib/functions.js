import config from '../config.js';

/**
 * Check if the user is an owner or admin
 */
export function isAdmin(senderNumber, groupAdmins) {
    return config.owner.includes(senderNumber) ||
        config.admin.includes(senderNumber) ||
        groupAdmins.includes(senderNumber);
}

/**
 * Check if the user is immune to system warnings (Owner/Admin)
 */
export function isImmune(senderNumber, groupAdmins) {
    return isAdmin(senderNumber, groupAdmins);
}

/**
 * Format currency/koin
 */
export function formatKoin(amount) {
    return amount.toLocaleString('id-ID');
}
