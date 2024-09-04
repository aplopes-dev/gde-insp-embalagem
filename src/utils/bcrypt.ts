const bcrypt = require("bcrypt");

export async function hashPass(pass: string) {
  return bcrypt.hash(pass, 10) as Promise<string>;
}

export async function isSamePass(unHashPass: string, hashPass: string) {
  return bcrypt.compare(unHashPass, hashPass) as Promise<boolean>;
}
