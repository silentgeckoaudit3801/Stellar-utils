const { generateKeypair, validateAddress, validateSecretKey } = require('../src');

const pair = generateKeypair();

console.log('Public key:', pair.publicKey);
console.log('Secret key:', pair.secretKey);
console.log('Public key valid:', validateAddress(pair.publicKey));
console.log('Secret key valid:', validateSecretKey(pair.secretKey));
