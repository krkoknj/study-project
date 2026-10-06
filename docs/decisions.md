# 설계 결정 기록

기능 하나가 끝날 때마다 "결정 사항 / 이유 / 대안"을 남긴다.

## 1단계: 프로젝트 세팅 (2026-10-06)

### 패키지 매니저: pnpm

- **결정**: pnpm 10을 사용하고 `packageManager` 필드로 버전을 고정한다.
- **이유**: 설치가 빠르고, `package.json`에 선언하지 않은 패키지를 import할 수 없어 의존성 누락을 일찍 발견한다.
- **대안**: npm. 추가 설정이 필요 없지만 느리고, 선언하지 않은 의존성도 우연히 동작한다.
- **주의**: pnpm 10은 설치 스크립트를 기본 차단한다. Prisma와 esbuild는 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 명시해 허용했다.

### lint / format: ESLint + Prettier

- **결정**: ESLint는 버그 가능성, Prettier는 코드 모양만 담당한다. `eslint-config-prettier`로 겹치는 규칙을 끈다.
- **이유**: Next.js 공식 ESLint 규칙과 Tailwind 클래스 정렬 플러그인을 그대로 쓸 수 있다.
- **대안**: Biome. 하나의 도구로 빠르게 처리하지만 Next.js 전용 규칙 지원이 부분적이다.

### 로컬 DB: Docker Compose + PostgreSQL 17

- **결정**: 이미지 메이저 버전을 `postgres:17`로 고정하고, 포트는 `127.0.0.1`에만 바인딩한다.
- **이유**: `latest`는 메이저 버전이 바뀌면 기존 볼륨과 호환되지 않는다. 로컬 개발 DB를 같은 네트워크에 노출할 이유가 없다.
- **대안**: PC에 PostgreSQL 직접 설치. 컨테이너가 필요 없지만 버전과 설정이 개발 환경마다 달라진다.

### 테스트 DB: 같은 컨테이너에 별도 데이터베이스

- **결정**: `studygroup_test` DB를 컨테이너 최초 기동 때 만들고, Vitest가 `DATABASE_URL`을 `TEST_DATABASE_URL`로 바꿔 넣는다.
- **이유**: 동시성 테스트(9단계)는 실제 PostgreSQL의 잠금·격리 수준 동작이 필요해 모킹으로 대체할 수 없다. 테스트가 개발 데이터를 지우는 사고도 막는다.
- **대안**: Testcontainers(테스트마다 새 컨테이너, 격리는 완벽하지만 느리고 설정이 무겁다), SQLite 인메모리(빠르지만 PostgreSQL과 잠금 동작이 달라 이 프로젝트의 목적에 맞지 않는다).

### Prisma 7: 드라이버 어댑터와 버전 고정

- **결정**: `prisma`, `@prisma/client`, `@prisma/adapter-pg`를 모두 `7.10.0`으로 정확히 고정한다. 클라이언트는 `src/generated/prisma`에 생성하고 커밋하지 않는다.
- **이유**: 세 패키지는 버전이 같아야 한다. 생성 코드는 `prisma generate`로 언제든 다시 만들 수 있어 `postinstall`에서 자동 생성한다.
- **대안**: `^` 범위 지정. 설치 시점에 따라 패키지끼리 버전이 어긋날 수 있다(실제로 겪음, `troubleshooting.md` 참고).

### 환경변수: Zod 검증

- **결정**: `src/env.ts`에서 환경변수를 Zod로 검증하고, 코드에서는 `process.env` 대신 `env`를 import한다.
- **이유**: 값이 빠졌을 때 첫 쿼리 시점이 아니라 모듈 로드 시점에, 어떤 변수가 문제인지 알려 주며 실패한다.
- **대안**: `process.env`를 직접 사용. 간단하지만 타입이 `string | undefined`이고 오류가 늦게 드러난다.

### 테스트 환경: Vitest node 환경

- **결정**: jsdom과 Testing Library 없이 node 환경으로만 구성한다.
- **이유**: 이 프로젝트의 테스트 대상은 상태 전이·권한·동시성 같은 서버 로직이다.
- **대안**: 컴포넌트 테스트 도구 포함. 필요해지는 시점에 추가한다.
