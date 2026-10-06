# 트러블슈팅 기록

"문제 → 원인 → 해결 → 결과" 형식으로 남긴다.

## Prisma CLI와 클라이언트의 버전 불일치 (2026-10-06)

- **문제**: `pnpm add -D prisma`를 실행하니 CLI는 `8.0.0-rc.20`, `@prisma/client`는 `7.10.0`으로 설치되었다. 관련 없는 패키지의 peer dependency 경고도 함께 나왔다.
- **원인**: npm에서 `prisma` 패키지의 `latest` 태그가 정식판이 아닌 RC를 가리키고 있었다. `@prisma/client`의 `latest`는 `7.10.0`이었다. 버전을 지정하지 않으면 `latest` 태그를 따라간다.
- **해결**: `pnpm view prisma dist-tags`로 태그를 확인한 뒤, `prisma`, `@prisma/client`, `@prisma/adapter-pg`를 `-E` 옵션으로 `7.10.0`에 정확히 고정했다.
- **결과**: 세 패키지의 버전이 일치하고 peer dependency 경고가 사라졌다. Prisma를 올릴 때는 세 패키지를 함께 올려야 한다.

## pnpm이 Prisma의 설치 스크립트를 실행하지 않음 (2026-10-06)

- **문제**: 설치 후 `Ignored build scripts: @prisma/engines, esbuild, prisma` 경고가 나왔다.
- **원인**: pnpm 10부터 공급망 공격을 막기 위해 의존성의 `postinstall` 스크립트를 기본으로 실행하지 않는다.
- **해결**: `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 세 패키지를 명시하고 `pnpm rebuild`를 실행했다.
- **결과**: Prisma 엔진과 esbuild 바이너리가 정상 설치되었다. 새 패키지가 같은 경고를 내면 스크립트가 꼭 필요한지 확인한 뒤 목록에 추가한다.

## create-next-app 생성물이 기존 CLAUDE.md와 겹침 (2026-10-06)

- **문제**: 프로젝트 폴더에 직접 작성한 `CLAUDE.md`가 이미 있는데, `create-next-app`의 생성물에도 `CLAUDE.md`가 들어 있었다.
- **원인**: `create-next-app` 16은 기본 옵션(`--agents-md`)으로 에이전트용 `AGENTS.md`와, 그것을 불러오는 한 줄짜리 `CLAUDE.md`를 함께 만든다.
- **해결**: 프로젝트 폴더가 아닌 임시 폴더에 생성한 뒤 필요한 파일만 골라 복사했다. 생성된 `CLAUDE.md`, 기본 README, 데모용 SVG는 가져오지 않았다.
- **결과**: 기존 `CLAUDE.md`를 유지한 채 공식 기본 설정을 그대로 받았다.

## Vitest 설정 파일의 ESM 경고 (2026-10-06)

- **문제**: `vitest.config.ts`를 로드할 때 "ESM syntax in a file loaded as CommonJS" 경고가 나왔다. 이후 Vite 메이저 버전에서는 지원하지 않을 예정이라고 했다.
- **원인**: `package.json`에 `"type": "module"`이 없어 `.ts` 설정 파일이 CommonJS로 취급되는데, 파일은 `import` 문법을 쓴다.
- **해결**: 파일명을 `vitest.config.mts`로 바꿔 이 파일만 ESM으로 명시했다. `"type": "module"`은 프로젝트 전체에 영향을 주므로 쓰지 않았다.
- **결과**: 경고 없이 테스트가 실행된다.

## migrate dev 후 Prisma 클라이언트에 모델이 없음 (2026-10-06)

- **문제**: `prisma migrate dev`로 테이블을 만들었는데 `src/generated/prisma/models`가 비어 있어 `prisma.user` 같은 접근이 타입에 없었다.
- **원인**: Prisma 7에서는 `migrate dev`가 클라이언트를 자동으로 다시 생성하지 않는다. 생성 전후 폴더 내용을 비교해 확인했다.
- **해결**: `db:migrate` 스크립트를 `prisma migrate dev && prisma generate`로 바꿨다.
- **결과**: `pnpm db:migrate` 한 번으로 DB와 클라이언트 타입이 함께 갱신된다.

## 테스트 DB에 마이그레이션을 적용할 방법이 없음 (2026-10-06)

- **문제**: `prisma migrate deploy`에는 접속 URL을 지정하는 옵션이 없어 테스트 DB를 대상으로 실행할 수 없었다.
- **원인**: Prisma 7은 접속 URL을 설정 파일(`prisma7.config.ts`)에서만 읽고, 그 파일은 `DATABASE_URL` 환경변수를 참조한다.
- **해결**: Vitest `globalSetup`에서 `DATABASE_URL`을 `TEST_DATABASE_URL` 값으로 바꾼 환경으로 `prisma migrate deploy`를 실행한다. `dotenv`는 이미 설정된 환경변수를 덮어쓰지 않으므로 바꾼 값이 유지된다.
- **결과**: `pnpm test`만 실행해도 테스트 DB가 최신 스키마로 맞춰진다.

## 테스트 DB에서 필수 컬럼 추가 마이그레이션이 실패 (2026-10-06)

- **문제**: `users`에 `password_hash NOT NULL` 컬럼을 추가하는 마이그레이션이 개발 DB에서는 적용됐는데, `pnpm test`에서는 `column "password_hash" of relation "users" contains null values`(P3018)로 실패했다. 이후 테스트가 하나도 실행되지 않았다.
- **원인**: 테스트는 각 테스트 시작 전에만 테이블을 비워서, 직전 실행의 마지막 테스트가 만든 사용자 1건이 테스트 DB에 남아 있었다. 행이 있는 테이블에는 기본값 없는 `NOT NULL` 컬럼을 추가할 수 없다. 개발 DB는 `users`가 비어 있어 통과했다. 또한 Prisma는 실패한 마이그레이션을 `_prisma_migrations`에 기록해 두고, 해결 전까지 이후 마이그레이션을 거부한다.
- **해결**: (1) 테스트 DB의 실패 기록을 `prisma migrate resolve --rolled-back <이름>`으로 되돌림 처리했다. PostgreSQL은 DDL도 트랜잭션으로 처리해서 실패한 `ALTER TABLE`은 아무것도 바꾸지 않았다(컬럼 목록으로 확인). (2) `vitest.global-setup.ts`가 마이그레이션 전에 모든 테이블을 비우도록 바꾸고, DB 이름이 `_test`로 끝나지 않으면 실행을 거부하게 했다.
- **결과**: 테스트 40개가 통과한다. 테스트 DB는 매 실행마다 빈 상태에서 시작한다.
- **배운 점**: 이 마이그레이션은 데이터가 있는 운영 DB에서도 똑같이 실패한다. 운영 중인 테이블에 필수 컬럼을 추가할 때는 "nullable로 추가 → 기존 행 채우기 → NOT NULL로 변경"의 세 단계로 나눠야 한다. 지금은 사용자 데이터가 없는 단계라 한 번에 적용했다.

## Windows에서 줄바꿈 변환 경고 (2026-10-06)

- **문제**: 첫 커밋 때 `LF will be replaced by CRLF` 경고가 나왔다.
- **원인**: Windows용 Git의 기본 설정이 체크아웃 시 줄바꿈을 CRLF로 바꾼다. 컨테이너에 마운트하는 스크립트나 다른 OS와 섞이면 문제가 된다.
- **해결**: `.gitattributes`에 `* text=auto eol=lf`를 추가했다.
- **결과**: OS와 관계없이 저장소와 작업 폴더 모두 LF를 사용한다.
