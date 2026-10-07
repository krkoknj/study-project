-- 직접 작성: Prisma 스키마로는 CHECK 제약을 표현할 수 없다.
-- 태그 이름은 앞뒤 공백이 없는 소문자여야 하고 비어 있을 수 없다.
-- "React"와 "react"가 서로 다른 태그로 저장되는 것을 DB 수준에서 막는다.
ALTER TABLE "tags" ADD CONSTRAINT "tags_name_normalized_check"
  CHECK ("name" = lower(btrim("name")) AND "name" <> '');
