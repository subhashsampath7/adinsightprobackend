// Generate 6-digit UID
const generateUID = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate 16-character license key
const generateLicenseKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';

    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) {
            key += '-';
        }
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return key;
};

// Generate unique UID (check database)
const generateUniqueUID = async(promisePool) => {
    let uid;
    let isUnique = false;

    while (!isUnique) {
        uid = generateUID();
        const [rows] = await promisePool.query('SELECT id FROM users WHERE uid = ?', [uid]);
        if (rows.length === 0) {
            isUnique = true;
        }
    }

    return uid;
};

// Generate unique license key (check database)
const generateUniqueLicenseKey = async(promisePool) => {
    let key;
    let isUnique = false;

    while (!isUnique) {
        key = generateLicenseKey();
        const [rows] = await promisePool.query('SELECT id FROM licenses WHERE license_key = ?', [key]);
        if (rows.length === 0) {
            isUnique = true;
        }
    }

    return key;
};

// Calculate expiry date
const calculateExpiryDate = (months) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
};

// Calculate days until expiry
const calculateDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

module.exports = {
    generateUID,
    generateLicenseKey,
    generateUniqueUID,
    generateUniqueLicenseKey,
    calculateExpiryDate,
    calculateDaysUntilExpiry
};