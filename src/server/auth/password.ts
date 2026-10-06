import { hash, verify } from "@node-rs/argon2";

// Argon2id, OWASP 권장 최소 구성. 라이브러리 기본값과 같지만 의도를 드러내려고 명시한다.
// 결과 문자열에 알고리즘·파라미터·솔트가 함께 들어가므로 나중에 값을 올려도 기존 해시를 검증할 수 있다.
const options = {
  memoryCost: 19456, // KiB (19 MiB)
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    // 저장된 값이 해시 형식이 아닌 경우. 로그인 실패로 취급한다.
    return false;
  }
}
