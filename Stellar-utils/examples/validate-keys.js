const { validateAddress, validateSecretKey } = require('../src');

const publicKey = process.env.STELLAR_ADDRESS || '';
const secretKey = process.env.STELLAR_SECRET_KEY || '';

console.log('Address valid:', validateAddress(publicKey));
console.log('Secret key valid:', validateSecretKey(secretKey));

if (!publicKey || !secretKey) {
  console.log('Set STELLAR_ADDRESS and STELLAR_SECRET_KEY to validate real keys.');
}
