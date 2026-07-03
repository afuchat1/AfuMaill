import * as Crypto from "expo-crypto";

function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(byteLength: number): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64ToBase64Url(base64);
}

export function generateCodeVerifier(): string {
  return randomBase64Url(64);
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const digestBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return base64ToBase64Url(digestBase64);
}

export function generateState(): string {
  return randomBase64Url(16);
}
