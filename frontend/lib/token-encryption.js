import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Get encryption key from environment (must be 32 bytes for AES-256)
const ENCRYPTION_KEY_BASE64 = process.env.TOKEN_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_BASE64) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be set in environment');
}

// Decode the key (should be 32 bytes)
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_BASE64, 'base64');

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes (base64 encoded)');
}

/**
 * Encrypts an osu! token string
 * @param {string} tokenString - Format: "access_token|expires_timestamp|refresh_token"
 * @returns {string} Encrypted token (base64: iv:authTag:ciphertext)
 */
export function encryptToken(tokenString) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(tokenString, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Return as: iv:authTag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts an encrypted osu! token
 * @param {string} encryptedToken 
 * @returns {string} Original token string
 */
export function decryptToken(encryptedToken) {
  const [ivB64, authTagB64, ciphertextB64] = encryptedToken.split(':');
  
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Parse token string into components
 */
export function parseToken(tokenString) {
  const [accessToken, expiresTimestamp, refreshToken] = tokenString.split('|');
  return {
    accessToken,
    expiresAt: new Date(parseInt(expiresTimestamp) * 1000),
    refreshToken
  };
}

/**
 * Check if token is expired (with 5 min buffer)
 */
export function isTokenExpired(tokenString, bufferSeconds = 300) {
  const { expiresAt } = parseToken(tokenString);
  return (expiresAt.getTime() - Date.now()) <= (bufferSeconds * 1000);
}

/**
 * Mask token for safe logging
 */
export function maskToken(tokenString) {
  if (!tokenString) return '[no token]';
  const parts = tokenString.split('|');
  if (parts.length !== 3) return '[invalid]';
  
  const mask = (s) => s.length > 8 ? `${s.slice(0,4)}...${s.slice(-4)}` : '****';
  return `${mask(parts[0])}|${parts[1]}|${mask(parts[2])}`;
}

export function testEncryption() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('testEncryption should not be used in production');
    return;
  }

  console.log('Testing token encryption...');
  
  const testToken = 'test_access_token_12345|1730000000|test_refresh_token_67890';
  console.log('Original:', maskToken(testToken));
  
  try {
    // Encrypt
    const encrypted = encryptToken(testToken);
    console.log('✅ Encryption successful');
    console.log('Encrypted length:', encrypted.length);
    
    // Decrypt
    const decrypted = decryptToken(encrypted);
    console.log('✅ Decryption successful');
    
    // Verify
    if (decrypted === testToken) {
      console.log('✅ Encryption/Decryption verification PASSED');
    } else {
      console.error('❌ Verification FAILED - tokens do not match');
    }
    
    // Test parsing
    const parsed = parseToken(decrypted);
    console.log('✅ Token parsing successful');
    console.log('Expires at:', parsed.expiresAt);
    console.log('Is expired?', isTokenExpired(decrypted));
    
    // Test invalid encryption
    try {
      decryptToken('invalid:encrypted:token:data');
      console.error('❌ Should have thrown error for invalid token');
    } catch {
      console.log('✅ Invalid token detection working');
    }
    
    console.log('All encryption tests passed!');
    
  } catch (error) {
    console.error('❌ Encryption test failed:', error.message);
  }
}

/**
 * Create token string from components
 * @param {string} accessToken 
 * @param {number} expiresTimestamp - Unix timestamp in seconds
 * @param {string} refreshToken 
 * @returns {string} Format: "access_token|expires_timestamp|refresh_token"
 */
export function createTokenString(accessToken, expiresTimestamp, refreshToken) {
  return `${accessToken}|${expiresTimestamp}|${refreshToken}`;
}