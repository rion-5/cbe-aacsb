# API 개발 요청서

## 1. 문서 정보
- **제목**: 대학 교내정보시스템 API 개발 요청 (AACSB 인증 데이터 연동용)
- **작성일**: 2025년 8월 20일
- **작성자**: 경상대학 행정팀 이상근
- **수신자**: 정보통신처 정보개발팀
- **목적**: 기존 엑셀 다운로드 방식의 데이터 수집을 API 연동으로 전환하여 효율성을 높이기 위한 API 개발 요청

## 2. 배경 및 필요성
경상대학은 AACSB(국제경영대학발전협의회) 국제경영교육인증을 유지하기 위해 교원 정보, 연구 성과, 교과목 정보, 수업 정보(시수 포함) 등을 지속적으로 수집하고 관리해야 합니다. 현재는 대학 내부 정보시스템(예: 교무시스템, 연구관리시스템 등)에서 해당 데이터를 엑셀로 다운로드하여 별도 PostgreSQL 데이터베이스에 반입하는 방식으로 운영되고 있습니다. 그러나 이 과정은 수동적이며, 데이터 업데이트 지연, 오류 발생 가능성, 보안 문제 등이 있어 효율적이지 않습니다.

이를 개선하기 위해 API를 통해 실시간 또는 주기적으로 데이터를 직접 연동하고자 합니다. API 연동 시, 데이터 수집 자동화가 가능해져 CIR(Continuous Improvement Review) 보고서 작성(특히 Table 3-1, 3-2, 8-1)에 필요한 데이터를 더 정확하고 신속하게 관리할 수 있습니다. 이는 AACSB 인증 유지의 핵심 업무를 지원하며, 전체 시스템의 안정성과 확장성을 높일 것입니다.

## 3. 요청 범위
API는 RESTful 스타일로 개발하며, JSON 형식의 응답을 반환하도록 합니다. 각 엔드포인트는 인증(예: API 키 또는 OAuth)을 통해 접근을 제한하고, HTTPS 프로토콜을 사용합니다. 데이터는 읽기 전용(GET)으로 한정하며, 쓰기 기능은 불필요합니다.

### 3.1. 필요한 엔드포인트
아래는 주요 데이터 카테고리에 따른 엔드포인트 예시입니다. 각 엔드포인트는 쿼리 파라미터를 지원하여 필터링(예: 연도, ID)을 가능하게 합니다.

1. **교원 정보 API**
   - **엔드포인트**: GET /api/faculty
   - **설명**: 교원 목록 또는 특정 교원 정보를 조회.
   - **파라미터**:
     - user_id (string, optional): 특정 교원 ID (예: '123456').
     - name (string, optional): 교원 이름 (부분 일치 검색 지원).
     - department (string, optional): 학과 필터.
     - limit (integer, default: 100): 반환 레코드 수 제한.
     - offset (integer, default: 0): 페이징 오프셋.
   - **응답 형식** (JSON 배열 또는 객체):
     ```
     [
       {
         "user_id": "123456",
         "name": "홍길동",
         "college": "경상대학",
         "department": "경영학과",
         "job_type": "전임교원",
         "job_rank": "교수",
         "highest_degree": "박사",
         "bachelor_degree_year": 1990,
         "master_degree_year": 1995,
         "doctoral_degree_year": 2000
       }
     ]
     ```
   - **예상 데이터 규모**: 약 200명 (경상대학 교원 기준).

2. **연구 성과 API**
   - **엔드포인트**: GET /api/research_outputs
   - **설명**: 특정 교원의 연구 성과 목록 조회.
   - **파라미터**:
     - fac_nip (string, required): 교원 ID (user_id와 동일).
     - year (integer, optional): 출판 연도 필터 (예: 2024).
     - type (string, optional): 유형 필터 (논문, 저서, 학술발표, 연구비수혜, 기타).
     - limit (integer, default: 50): 반환 레코드 수 제한.
     - offset (integer, default: 0): 페이징 오프셋.
   - **응답 형식** (JSON 배열):
     ```
     [
       {
         "research_id": 1,
         "fac_nip": "123456",
         "title": "연구 제목",
         "english_title": "English Title",
         "journal_name": "저널명",
         "english_journal": "English Journal",
         "publisher": "출판사",
         "english_publisher": "English Publisher",
         "published_at": "2024-01-01",
         "type": "논문",
         "doi": "10.1234/example"
       }
     ]
     ```
   - **예상 데이터 규모**: 교원당 연간 5~10건.

3. **교과목 정보 API**
   - **엔드포인트**: GET /api/courses
   - **설명**: 교과목 목록 조회 (AACSB 관련 프로그램 중심).
   - **파라미터**:
     - department (string, optional): 학과 필터.
     - year (integer, optional): 개설 연도.
     - semester (string, optional): 학기 (1 or 2).
     - limit (integer, default: 100): 반환 레코드 수 제한.
     - offset (integer, default: 0): 페이징 오프셋.
   - **응답 형식** (JSON 배열):
     ```
     [
       {
         "course_id": "BUS101",
         "course_name": "경영학개론",
         "english_name": "Introduction to Business",
         "credits": 3,
         "department": "경영학과",
         "learning_objectives": ["LO1: 기본 경영 이론 이해", "LO2: 실무 적용"]
       }
     ]
     ```

4. **수업 정보 API (시수 포함)**
   - **엔드포인트**: GET /api/teaching_info
   - **설명**: 특정 교원의 수업 정보 및 시수 조회 (Table 3-2용).
   - **파라미터**:
     - fac_nip (string, required): 교원 ID.
     - year (integer, optional): 연도 필터.
     - semester (string, optional): 학기 필터.
   - **응답 형식** (JSON 배열):
     ```
     [
       {
         "fac_nip": "123456",
         "course_id": "BUS101",
         "semester": "2024-1",
         "teaching_hours": 3,
         "student_count": 50
       }
     ]
     ```
   - **예상 데이터 규모**: 교원당 학기당 2~4건.

### 3.2. 공통 요구사항
- **인증 및 보안**: API 키 기반 인증 (각 API 호출 시 헤더에 포함). IP 제한 또는 OAuth 고려. 데이터는 개인정보 보호법 준수 (예: 이름 마스킹 옵션).
- **에러 처리**: 표준 HTTP 상태 코드 사용 (200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error). 에러 응답에 메시지 포함.
- **성능**: 응답 시간 1초 이내 목표. 대량 데이터 시 페이징 지원.
- **문서화**: Swagger 또는 Postman 컬렉션으로 API 문서 제공.
- **테스트 데이터**: 개발 후 샘플 데이터로 테스트 지원.

## 4. 일정 및 절차
- **개발 기간**: 요청 접수 후 4~6주 (설계 1주, 개발 3주, 테스트 1~2주).
- **절차**:
  1. 요청서 검토 및 회신 (1주 이내).
  2. 요구사항 세부 논의 미팅.
  3. 개발 및 테스트.
  4. 배포 및 연동 지원.
- **예산**: [예산 추정 필요 시 별도 논의, 예: 내부 개발 시 무상].

## 5. 연락처
- **요청자 연락처**: [이메일 또는 전화, 예: aacsb@university.ac.kr / 02-123-4567]
- **기타 문의**: 추가 데이터 필드나 기능이 필요할 경우 즉시 논의.

이 요청서는 AACSB 인증 유지의 필수 요소이니, 신속한 개발을 부탁드립니다. 추가 질문이 있으시면 언제든 연락 주시기 바랍니다.