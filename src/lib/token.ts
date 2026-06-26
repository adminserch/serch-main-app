import crypto from 'crypto';

const SECRET = process.env.NEWSLETTER_TOKEN_SECRET;

const CONFIRM_TTL = 24 * 60 * 60 * 1000; // 24 hours
const UNSUBSCRIBE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface TokenPayload {
  email: string;
  action: 'confirm' | 'unsubscribe';
  expiry: number;
}

/**
 * Creates a signed token for a given email and action, valid for the action's TTL.
 */
export function signToken(email: string, action: 'confirm' | 'unsubscribe'): string {
  if (!SECRET) {
    throw new Error('NEWSLETTER_TOKEN_SECRET environment variable is not defined.');
  }
  const ttl = action === 'confirm' ? CONFIRM_TTL : UNSUBSCRIBE_TTL;
  const expiry = Date.now() + ttl;
  const data = JSON.stringify({ email, action, expiry });
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64url');
}

/**
 * Verifies a token's signature, expiry, and action, returning the email if valid.
 */
export function verifyToken(token: string, action: 'confirm' | 'unsubscribe'): string | null {
  if (!SECRET) {
    console.error('NEWSLETTER_TOKEN_SECRET environment variable is not defined.');
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { data, signature } = payload;
    
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const parsedData: TokenPayload = JSON.parse(data);
    if (parsedData.action !== action) {
      return null;
    }
    
    if (Date.now() > parsedData.expiry) {
      return null; // Expired
    }
    
    return parsedData.email;
  } catch {
    return null;
  }
}
