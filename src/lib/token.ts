import crypto from 'crypto';

const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'serch-newsletter-secret-key-default';

export interface TokenPayload {
  email: string;
  action: 'confirm' | 'unsubscribe';
  expiry: number;
}

/**
 * Creates a signed token for a given email and action, valid for 24 hours.
 */
export function signToken(email: string, action: 'confirm' | 'unsubscribe'): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry
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
