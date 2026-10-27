# CLAUDE.md – 현장 일정 날씨판 작업 규칙

## 프로젝트 개요
- 교육용 프로토타입이다. 무엇을 만들지는 PRD.md를 따른다.
- PRD.md에 없는 기능은 먼저 제안하고, 내가 승인한 뒤에만 구현한다.

## 기술 스택 (변경 금지)
- HTML + CSS + 순수 JavaScript만 사용한다. (React 등 프레임워크, 빌드 도구 사용 금지)
- 일정 조회·추가는 Supabase에 연결하므로 인터넷 연결이 필요하다. 외부 스크립트는 supabase-js 하나만 사용한다.

## 폴더 구조
- index.html : 화면 구조
- style.css  : 디자인
- logic.js   : 판단 규칙만 (화면을 다루는 코드 금지)
- app.js     : 화면 동작 (목록 그리기, 일정 추가)
- PRD.md · CLAUDE.md · README.md : 문서

## 작업 방식
1. 코드를 고치기 전에 계획(수정할 파일과 이유)을 먼저 보여 주고 승인을 받는다.
2. 한 번에 한 가지만 고친다.
3. 끝나면 바꾼 파일, 내가 확인할 방법(T-번호), 남은 문제를 보고한다.

## 보안 · 데이터 규칙
- 일정 데이터는 Supabase public.wx_tasks에 둔다. 조회와 추가 모두 DB를 사용하고 JSON·localStorage로 대체하지 않는다.
- 연결 정보는 config.js 두 줄(프로젝트 URL·공개용 publishable 또는 anon 키)에만 둔다. secret/service_role 키는 사용하지 않는다.
- 표와 지역·구분 제약조건, 공개 조회·추가 RLS 정책은 setup.sql로 관리한다. SQL 실행은 사용자가 SQL Editor에서 한다.
- 기존 data/tasks.json은 가상 데이터 참고용으로만 남긴다. 기존 브라우저 추가 일정은 자동 업로드하지 않는다.
- 가상 데이터만 사용한다. 실제 이름 · 연락처 · 기관 내부 자료를 넣지 않는다.
- 사용자가 입력한 글자는 textContent 로 표시한다.
- 비밀 키는 코드 · 채팅 · GitHub 에 넣지 않는다.
