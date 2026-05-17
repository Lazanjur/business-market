import { createHash, randomBytes } from "crypto";
export function generateTotpSecret() { return randomBytes(20).toString("hex"); }
export function buildOtpAuthUri(email:string, secret:string, issuer="IB Marketplace") { return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`; }
export function computeTotp(secret:string, counter=Math.floor(Date.now()/30000)) { return createHash("sha1").update(`${secret}:${counter}`).digest("hex").slice(-6); }
export function verifyTotp(secret:string, code:string) { const ctr=Math.floor(Date.now()/30000); return [ctr-1,ctr,ctr+1].some(c=>computeTotp(secret,c)===code); }
export function generateRecoveryCodes(count=8) { return Array.from({length:count},()=>randomBytes(4).toString("hex")); }
