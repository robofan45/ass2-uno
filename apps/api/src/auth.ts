import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev";

export type JwtClaims = { userId: string; orgId: string; role: string };

export function signJwt(claims: JwtClaims) {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyJwt(token: string): JwtClaims {
  return jwt.verify(token, JWT_SECRET) as JwtClaims;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
