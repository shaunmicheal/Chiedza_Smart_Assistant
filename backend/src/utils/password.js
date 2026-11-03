import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = async (plain, hash) => bcrypt.compare(plain, hash);
