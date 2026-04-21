import { webcrypto } from 'node:crypto';

Deno.serve(async (req) => {
  try {
    // Generate VAPID key pair
    const keyPair = await webcrypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify']
    );

    // Export keys
    const publicKeyJwk = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Convert to URL-safe Base64
    function base64UrlEncode(buf) {
      return Buffer.from(buf)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }

    function jwkToUrlSafeBase64(jwk) {
      // Extract x and y coordinates and convert to base64url
      const x = Uint8Array.from(atob(jwk.x), c => c.charCodeAt(0));
      const y = Uint8Array.from(atob(jwk.y), c => c.charCodeAt(0));
      
      // Concatenate x and y for public key
      const publicKeyBytes = new Uint8Array(65);
      publicKeyBytes[0] = 0x04; // Uncompressed point format
      publicKeyBytes.set(x, 1);
      publicKeyBytes.set(y, 33);
      
      return base64UrlEncode(publicKeyBytes);
    }

    const publicKeyBase64Url = jwkToUrlSafeBase64(publicKeyJwk);
    
    // For private key, use the 'd' parameter
    const privateKeyBase64Url = privateKeyJwk.d;

    return Response.json({
      publicKey: publicKeyBase64Url,
      privateKey: privateKeyBase64Url,
      message: 'Copy these values to Dashboard → Settings → Environment Variables'
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});