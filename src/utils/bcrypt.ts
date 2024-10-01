const bcrypt = require("bcrypt");

export async function hashPass(unHashPass: string) {
  return bcrypt.hash(unHashPass, 10) as Promise<string>;
}

export async function isSamePass(unHashPass: string, hashPass: string) {
  return bcrypt.compare(unHashPass, hashPass) as Promise<boolean>;
}
