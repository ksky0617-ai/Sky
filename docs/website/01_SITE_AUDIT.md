# OLIBANA WEBSITE AUDIT

**Document:** `01_SITE_AUDIT.md`
**Version:** v1.0
**Date:** 2026-08-15
**Phase:** PHASE 0 — Repository + Specification Audit
**Status:** 분석/설계 단계. 구현 코드 없음.

> 이 문서는 지시서 §80(감사 10단계)과 §89(보고 형식)에 따라 작성되었다.
> 모든 "현재 상태" 기술은 실제 조사 결과이며, 추정한 부분은 명시했다.

---

## 1. 현재 Repository 상태

### 1.1 조사 범위

| 대상 | 방법 | 결과 |
| --- | --- | --- |
| `ksky0617-ai/Sky` | 전체 파일 트리, 전 브랜치, 전 커밋 히스토리 | 조사 완료 |
| `ksky0617-ai/-` | clone 후 전체 트리 | 조사 완료 |
| 계정 내 기타 저장소 | `list_repos` (전체) | 위 2개가 전부 |

### 1.2 `ksky0617-ai/Sky` — 실측

```
커밋 수:        1  (e8b093f, 2026-08-15)
브랜치:         claude/olibana-project-spec-76ivk7  (기본 브랜치 없음 — 최초 커밋)
파일 수:        9  (전부 .md)
총 라인:        509
총 용량:        48 KB
코드:           0 바이트
에셋:           0 바이트
CI/워크플로:    없음
```

| 파일 | 라인 | 성격 |
| --- | --- | --- |
| `README.md` | 96 | 루트 사양 — 비전, 철학, 6대 원칙, Atlas 색인 |
| `Brand_Bible.md` | 41 | 미션, 가치, 약속, 키워드 |
| `Character_Bible.md` | 37 | 페르소나, 보이스, 시각 표현 |
| `River_Atlas.md` | 62 | 연구 가이드 + **빈 데이터 로그** |
| `Stone_Atlas.md` | 62 | 연구 가이드 + **빈 데이터 로그** |
| `Forest_Atlas.md` | 58 | 연구 가이드 + **빈 데이터 로그** |
| `Light_Atlas.md` | 58 | 연구 가이드 + **빈 데이터 로그** |
| `Design_System.md` | 77 | 평가 기준, 검증 체크리스트, 지표, 워크플로 |
| `CHANGELOG.md` | 18 | v1.0 버전 이력 |

### 1.3 `ksky0617-ai/-` — 실측

```
파일:  README.md 1개
내용:  "# -" / "!"  (2줄)
```

**빈 플레이스홀더 저장소다.** Olibana 관련 콘텐츠 없음.

### 1.4 판정

> **이 프로젝트는 완전한 greenfield다.**
> 존재하는 것은 **문서 9개(509줄)뿐**이며, 그 문서들은 오늘 v1.0으로 처음 작성된 것이다.
> 웹사이트, 코드, 디자인 토큰, 에셋, 상품 데이터, 커머스 인프라는 **하나도 존재하지 않는다.**

---

## 2. 기존 Olibana 사양

### 2.1 존재 여부 대조 (지시서 §2 요구 목록)

| 지시서가 찾으라고 한 문서 | 존재 | 실제 파일 | 비고 |
| --- | :---: | --- | --- |
| `README.md` | ✅ | `README.md` | 완비 |
| `Brand_Bible.md` | ✅ | `Brand_Bible.md` | 완비 (단, 시각 정의 없음) |
| `Character_Bible.md` | ✅ | `Character_Bible.md` | 존재하나 얇음 (§3 참조) |
| `Fashion_Specification.*` | ❌ | **없음** | **최대 공백 (§4 참조)** |
| `Design_System.md` | ⚠️ | `Design_System.md` | 존재하나 **UI 시스템이 아님** (§5) |
| `River_Atlas.md` | ⚠️ | `River_Atlas.md` | 방법론 有 / **데이터 無** |
| `Stone_Atlas.md` | ⚠️ | `Stone_Atlas.md` | 방법론 有 / **데이터 無** |
| `Forest_Atlas.md` | ⚠️ | `Forest_Atlas.md` | 방법론 有 / **데이터 無** |
| `Light_Atlas.md` | ⚠️ | `Light_Atlas.md` | 방법론 有 / **데이터 無** |

### 2.2 사양의 성격 — 가장 중요한 발견

기존 9개 문서는 **전부 규범적(normative)이다. 기술적(descriptive) 데이터가 0이다.**

- Atlas는 "무엇을 어떻게 측정할 것인가"를 정의한다. **측정된 값은 한 줄도 없다.**
- Design System은 "어떻게 평가할 것인가"를 정의한다. **평가할 디자인이 없다.**
- Brand Bible은 "무엇을 지향하는가"를 정의한다. **구현된 아이덴티티가 없다.**

이것이 왜 결정적인가:

> 지시서 §3은 "자연을 배경 이미지로만 사용하는 것은 부족하다"고 한다.
> 지시서 §15는 상품마다 실제 Fashion Specification과 연결된 Natural Rule을 요구한다.
> 지시서 §24는 Atlas의 Observation → Measurement → Pattern → Rule → Translation을 인터랙티브하게 보여주라고 한다.
>
> **그러나 Measurement가 존재하지 않는다.** River Atlas의 데이터 로그는 헤더만 있고 행이 0개다.
> 따라서 "곡률 반경 100 m"라는 숫자를 화면에 띄우려면, 그 숫자를 **지어내야 한다.**
> 지시서 §17·§22·§26·§27·§35·§37은 데이터 날조를 명시적으로 금지한다.

**결론:** Atlas 경험(§24)과 Natural Rule(§15)은 **구조는 지금 만들 수 있으나, 진실된 내용으로 채우려면 실측 데이터가 선행되어야 한다.** 이는 코딩 문제가 아니라 **필드 리서치 문제**다.

---

## 3. Character Bible 상태

### 3.1 현재 내용 (37줄, v1.0)

| 섹션 | 내용 | 웹 구현 충분성 |
| --- | --- | --- |
| Persona | Elegant / Quiet / Intelligent / Confident 4속성 | ✅ 카피 톤 통제 가능 |
| Voice in Practice | Do/Don't 5행 대조표 | ✅ 마이크로카피 통제 가능 |
| Visual Expression | muted palette / minimal embellishment / geometric type — **3줄** | ❌ **불충분** |

### 3.2 웹 구현에 필요하나 없는 것

- **포토그래피 디렉션** — 앵글, 크롭, 조명, 배경, 컬러 그레이딩, 그레인 (§47이 요구하는 11개 이미지 유형에 대한 규칙 없음)
- **모델 캐스팅 원칙** — 시선, 포즈, 움직임, 다양성 기준
- **웹 전용 보이스** — 에러 메시지, 로딩, 404, 빈 상태, 결제 확인 (§67·§68·§69가 요구)
- **네이밍** — "Olibana"의 어원/의미. 브랜드 스토리(§23)와 About의 핵심인데 정의된 바 없음
- **파운더/아틀리에 서사** — §26·§37이 요구하나 사실 자체가 없음

### 3.3 지시서 §2와의 관계 — 명시적 확인

> 지시서: *"Character Bible과 Fashion Specification이 이미 존재하는 경우: 새로 작성하지 않는다. 임의로 재해석하지 않는다."*

**Character Bible은 존재한다.** 따라서:

- ✅ 기존 4속성 페르소나·보이스 표는 **그대로 SSOT로 사용한다. 재해석하지 않는다.**
- ⚠️ 위 3.2의 공백은 **재작성이 아니라 가산(additive) 확장**으로만 채운다.
- 🛑 확장분은 **승인 없이 확정하지 않는다.** 특히 브랜드 네이밍 의미와 파운더 서사는 사실 관계이므로 AI가 생성해서는 안 된다.

---

## 4. Fashion Specification 상태

### 4.1 조사 결과

```
검색 대상:  두 저장소 전체 / 전 브랜치 / 전 커밋 / 파일명 변형(fashion, spec, garment, SKU, product)
결과:       존재하지 않음
```

### 4.2 영향도 — **이 프로젝트 최대의 블로커**

Fashion Specification이 없으면 다음이 **전부** 실제 내용 없이 껍데기만 남는다:

| 지시서 요구 | 필요한 입력 | 현 상태 |
| --- | --- | --- |
| §15 Product Page의 Natural Rule (Source→Observation→Translation→Garment) | 의복별 디자인 규칙 명세 | ❌ 없음 |
| §14 Product / Color / Size / Fit / Availability | 상품 마스터 | ❌ 없음 |
| §17 실제 garment measurements, model height/size, material stretch | 실측 치수표 | ❌ 없음 |
| §14 Construction / Material / Details / Care | 봉제·소재 사양 | ❌ 없음 |
| §27 Materials (composition, weight, aging) | 소재 명세 | ❌ 없음 |
| §25 Atlas → Product 연결 | 상품↔Atlas 규칙 매핑 | ❌ 없음 |
| §60 Product lifecycle (Concept→…→Delivered) | 상품 상태 정의 | ❌ 없음 |

### 4.3 판정

> **Fashion Specification의 부재는 "문서를 하나 더 쓰면 되는" 문제가 아니다.**
> 이것은 **판매할 옷이 아직 정의되지 않았다**는 뜻이다.
> 상품이 없으면 커머스는 구조만 만들 수 있고, 진실된 콘텐츠로 채울 수 없다.
>
> 지시서 §17: *"실측값을 사용할 수 없는 경우 만들어내지 않는다."* — 이 규칙을 지키는 한,
> Product Page는 **스키마와 UI는 완성하되 데이터는 비워둔 상태로** 인도되어야 한다.

---

## 5. 기존 디자인 시스템

### 5.1 `Design_System.md`의 실제 성격

파일명은 Design System이지만, 내용은 **디자인 평가 시스템(evaluation system)**이다.

| 포함하는 것 | 포함하지 않는 것 |
| --- | --- |
| 10개 평가 기준 (Originality ~ Global Appeal) | 컬러 값 |
| 5항목 검증 체크리스트 | 타입 스케일 |
| 6개 정량 지표 | 스페이싱 스케일 |
| 7단계 반복 프로세스 | 그리드 / 브레이크포인트 |
| Nature-derived rules 원칙 | 모션 값 / 이징 |
| 비율 일관성 원칙 | 컴포넌트 정의 |

### 5.2 지시서 §44~§46과의 대조

| 지시서 | 요구 | 현 상태 | 판정 |
| --- | --- | --- | --- |
| §44 | Color/Type/Spacing/Radius/Shadow/Motion/Duration/Easing/Grid/Container/Breakpoint/Z-index 토큰 | **전무** | 신규 구축 |
| §45 | 폰트는 Brand Bible → Design System → 라이선스 순으로 확인 | **어느 문서에도 폰트 지정 없음** | 신규 선정 필요 (승인 대상) |
| §46 | *"기존 Olibana palette가 있다면 그것을 우선한다"* | **기존 팔레트 없음** | 신규 도출 필요 (승인 대상) |

### 5.3 팔레트 도출의 정직성 문제

§46은 팔레트를 stone/mineral/mist/water/forest/light 계열에서 도출할 수 있다고 하고,
`Light_Atlas.md`는 색온도(K)·조도(lux)·HSV 측정으로 팔레트를 정의하게 되어 있다.

**그러나 Light Atlas 데이터 로그는 비어 있다.**

따라서 팔레트는 두 가지 방법 중 하나로만 만들 수 있다:

- **(A) 실측 기반** — 실제 촬영/측색 후 도출. 브랜드 철학에 완전히 부합. **선행 작업 필요.**
- **(B) 서술 기반** — Light Atlas에 이미 기술된 정성 관찰("sunrise yields warm pink/orange" 등)에서 도출. 즉시 가능하나, **측정에서 나온 값이 아님을 문서에 명시해야 한다.**

권장: **(B)로 v0 팔레트를 만들되 `provisional: true`로 토큰에 표기하고, 실측 후 (A)로 교체**한다. 토큰 레이어가 있으므로 교체 비용은 낮다.

---

## 6. 기존 기술 Stack

### 6.1 조사 결과

```
package.json / lock 파일:   없음
tsconfig / 빌드 설정:        없음
.ts / .tsx / .js / .html / .css:  0개
프레임워크 흔적:              없음
.github / CI:                없음
```

**기술 스택이 존재하지 않는다. 완전 신규 선정이다.**

지시서 §70의 *"이미 합리적인 stack이 있다면 불필요한 migration을 하지 않는다"* 조항은 **해당 사항 없음**이다. 마이그레이션 리스크는 0이다.

### 6.2 선정 기준 (§70: "최신 기술이 아니라 장기 유지 가능성")

권장안은 §15에서 상술한다. 요약하면:

- **렌더링:** Next.js (App Router) + TypeScript — SEO/구조화 데이터(§55·§65)와 커머스 라우팅이 모두 필요하므로 SSR/ISR이 사실상 필수
- **모션:** **CSS 우선**. 2026년 현재 scroll-driven animations은 Chrome 115+/Safari 26+에서 네이티브 지원되나 **Firefox는 여전히 플래그 뒤**에 있고, cross-document View Transitions는 Chrome 126+/Safari 18.2+ 지원에 Firefox 진행 중이다. → **점진적 향상(progressive enhancement)으로 채택하고, 의존하지 않는다.**
- **WebGL:** 기본 미채택. §71 기준을 통과하는 특정 화면에서만 국소 도입

---

## 7. 기존 Commerce Infrastructure

### 7.1 조사 결과 — 전무

| 요소 | 상태 |
| --- | --- |
| 커머스 백엔드 (Shopify/Medusa/커스텀) | ❌ 없음 |
| 결제 (Stripe/PayPal/국내 PG) | ❌ 없음 |
| 상품 마스터 / SKU 체계 | ❌ 없음 |
| 재고 시스템 | ❌ 없음 |
| 배송사 / 배송비 테이블 | ❌ 없음 |
| 세금 / 관세 처리 | ❌ 없음 |
| 주문 관리 (OMS) | ❌ 없음 |
| 반품 정책 (실제 확정본) | ❌ 없음 |
| 고객 서비스 채널 | ❌ 없음 |
| 사업자 정보 / 법인 실체 | ❌ 없음 |
| 개인정보처리방침 등 법무 검토본 | ❌ 없음 |

### 7.2 지시서 목표와의 간극 — 정면으로 제기함

> 지시서 최상위 목표: *"실제 글로벌 패션EC로서 구매·결제·배송·반품·고객관리까지 완결되는 immersive commerce experience"*

**이 목표는 코드만으로 달성할 수 없다.** 결제 계약, 사업자 등록, 배송 계약, 반품 물류, 법무 검토는 개발 산출물이 아니라 **사업 인프라**다.

동시에 지시서 스스로 다음을 금지한다:

- §22 *"가상의 상태를 보여주지 않는다"* → 실제 fulfillment 연동 없이 주문 추적 화면을 채울 수 없다
- §34 *"실제 정책이 확정되지 않은 부분은 placeholder로 남긴다"*
- §35 *"실제 배송 가능 지역과 배송기간을 확인하지 않은 상태에서 숫자를 만들어내지 않는다"*
- §39 *"법률 문구를 AI가 임의로 확정하지 않는다"*

**따라서 정직한 인도물은 다음과 같다:**

> 결제·배송·반품·주문추적은 **인터페이스와 상태 기계(state machine)를 완성하고, 실 provider 어댑터 자리를 비워둔 채** 인도한다.
> 정책 문구는 `status: DRAFT — REQUIRES LEGAL REVIEW` 배너와 함께 placeholder로 둔다.
> 이는 타협이 아니라 **지시서 §22·§34·§35·§39를 준수하는 유일한 방법**이다.

---

## 8. 현재 Asset 상태

### 8.1 조사 결과

```
이미지 (jpg/png/webp/avif):   0
비디오 (mp4/webm):            0
폰트 (woff/woff2/otf):        0
SVG / 아이콘:                 0
3D 모델 / 텍스처:             0
오디오:                       0
────────────────────────────────
총 미디어 용량:                0 바이트
```

### 8.2 영향도 — **Fashion Spec 다음가는 블로커**

지시서가 요구하는 경험의 거의 전부가 이미지/영상에 의존한다:

| 지시서 | 요구 | 필요 에셋 | 현 상태 |
| --- | --- | --- | --- |
| §9·§11 | Hero: fabric movement, natural light, cinematic motion | 시네마틱 영상 또는 고해상 시퀀스 | ❌ |
| §16 | 상품당 Front/Back/Side/Detail/Texture/Movement/Scale/On-body/Editorial/Material — **10종** | 상품 촬영 | ❌ |
| §29 | Lookbook: full-screen, model movement, hotspot | 에디토리얼 화보 | ❌ |
| §26 | Atelier: pattern/cutting/sewing/finishing macro + slow motion | 공정 촬영 | ❌ |
| §24 | Atlas: 자연 이미지 + geometry overlay | 자연 촬영 + 측정 데이터 | ❌ |
| §45 | Typography | 라이선스 폰트 | ❌ |

### 8.3 판정

> **"웹사이트가 아름답지 않다"의 원인은 대부분 코드가 아니라 에셋이 될 것이다.**
> Olibana의 시각적 성패는 촬영 퀄리티에 좌우되며, 이는 개발 이전의 프로덕션 과제다.
>
> 개발 측 대응: **에셋 슬롯을 정확한 종횡비·용량 예산·포커스 포인트와 함께 정의**하고,
> 개발 중에는 **명시적으로 "PLACEHOLDER"라고 표시된 자산**을 쓴다. 스톡 이미지를 브랜드 이미지처럼 쓰지 않는다.

---

## 9. Website Gap Analysis

### 9.1 3단계 분류

지시서의 모든 요구를 **필요한 입력이 무엇인가**로 분류했다.

#### TIER A — 지금 바로 온전히 만들 수 있는 것 (입력: 없음)

| 항목 | 근거 |
| --- | --- |
| 디자인 토큰 시스템 (§44) | Design System 원칙에서 도출 가능 |
| 모션 언어 + 토큰 (§4·§72) | Atlas의 정성 관찰이 이미 문서화됨 |
| 정보 구조 / 라우팅 (§8) | 지시서에 명시됨 |
| 컴포넌트 아키텍처 | 자체 완결 |
| 레이아웃 / 내비게이션 (§12) | 자체 완결 |
| 접근성 구현 (§42) | 표준 기반 |
| 성능 예산 / 최적화 (§41) | 표준 기반 |
| 상태 설계: Loading/Empty/Error/Offline (§59) | 자체 완결 |
| 404 / 로딩 경험 (§67·§68) | 자체 완결 |
| SEO / 구조화 데이터 **스키마** (§55·§65) | 스키마는 가능, 값은 상품 대기 |
| 애널리틱스 이벤트 정의 (§56) | 자체 완결 |
| i18n 아키텍처 (§64) | 구조는 가능, 번역문은 별도 |
| 데이터 모델 / 레이어 분리 (§61) | 자체 완결 |

#### TIER B — 구조는 만들되 내용은 비워야 하는 것 (입력: 상품·에셋)

| 항목 | 대기 중인 입력 |
| --- | --- |
| Home Hero (§9·§11) | 촬영 에셋 |
| Product Page (§14·§15·§16) | Fashion Spec + 상품 촬영 |
| Size/Fit (§17) | 실측 치수표 |
| Collection Page (§13) | 컬렉션 정의 + 화보 |
| Lookbook (§29) | 에디토리얼 촬영 |
| Atelier (§26) | 공정 촬영 + 실제 공정 사실 |
| Materials (§27) | 소재 명세 + 증빙 |
| Nature Atlas 경험 (§24) | **Atlas 실측 데이터** |
| Atlas → Product 연결 (§25) | 상품 + 매핑 |
| Journal (§28) | 원고 |

#### TIER C — 사업 인프라가 선행되어야 하는 것 (입력: 계약·법무)

| 항목 | 대기 중인 입력 |
| --- | --- |
| Checkout / 결제 (§20) | PG 계약 |
| Shipping (§35) | 배송사 계약, 지역별 요율 |
| Returns (§34) | 확정 정책 |
| Order Tracking (§22) | fulfillment 연동 |
| Account / 주문 이력 (§32) | 인증 + 백엔드 |
| Legal 문서 (§39) | 법무 검토 |
| Wholesale (§36) | B2B 모델 존재 여부 |
| Press (§37) | 실제 보도 이력 |
| Stockists (§38) | 실제 판매처 |

### 9.2 요약

```
TIER A (즉시 완결 가능):     13개 영역 — 전체 경험의 골격 100%
TIER B (구조만, 내용 대기):  10개 영역 — 브랜드 표현의 실체
TIER C (사업 선행):           9개 영역 — 커머스 완결성
```

> **Gap의 본질:** 웹 개발 역량 부족이 아니라 **브랜드 자산과 사업 인프라의 부재**다.
> 지금 코드를 아무리 많이 써도 TIER B/C는 채워지지 않는다.

---

## 10. Brand Experience Direction

### 10.1 번역 명제 (Translation Thesis)

기존 철학 *"Nature is a design system, not mere inspiration"*을 웹으로 옮기는 명제:

> **웹사이트는 "자연을 주제로 한(nature-themed)" 사이트가 아니라, "자연으로 구조화된(nature-structured)" 사이트다.**
>
> 자연 이미지를 배경에 까는 것은 실패다.
> **인터페이스의 거동 자체가 측정된 자연 규칙을 따를 때** 성공이다.

### 10.2 6대 원칙의 웹 번역

| 기존 원칙 | 웹에서의 강제 규칙 (검증 가능한 형태) |
| --- | --- |
| **Structural Logic** | 모든 모션·레이아웃 값은 Atlas 출처를 코드 주석/토큰 메타로 **인용해야 한다.** 출처 없는 값은 리뷰에서 반려. |
| **Simplicity** | 화면당 **1차 액션 1개**. 컴포넌트 variant는 정당화 없이 추가 불가. |
| **Timelessness** | 시대를 각인시키는 기술 서명(유행 이펙트) 금지. 5년 후에도 유효할 CSS 우선. |
| **Precision** | 모든 간격은 스케일 상의 값만 사용. 임의 px 금지. 애니메이션 duration도 토큰만 사용. |
| **Silence** | **정적 예산(silence budget):** 첫 화면 요소 밀도 상한, 동시 진행 모션 1개 제한. |
| **Originality** | §74 금지 목록을 **린트 가능한 체크리스트**로 전환해 QA에 포함. |

### 10.3 Olibana 고유 인터랙션 3안 — 유행 복제가 아닌 발명 (§6)

지시서 §6은 "현재 유행을 복사하지 말고 재해석하라"고 한다. 아래는 Olibana 철학에서만 도출될 수 있는, 다른 브랜드가 가져갈 수 없는 인터랙션 개념이다.

---

#### 안 1. **THE RULE LAYER** — 브랜드-커머스 연결의 핵심 (권장: 채택)

전역에서 켜고 끌 수 있는 **규칙 오버레이**. 내비게이션에 조용한 토글 하나.

```
OFF (기본)  →  옷과 이미지만 보인다. 조용한 커머스.
ON          →  현재 보고 있는 대상 위에 그 대상의 자연 규칙이 겹쳐진다.
                · 코트 실루엣 위에 곡률선과 반경 값
                · 패널 이음선 위에 파단각
                · 니트 패턴 위에 분기 비율
                · 컬러 위에 색온도(K)
```

**왜 이것이 Olibana인가:**
- §25(Atlas→Product 연결)를 **하나의 인터랙션으로** 해결한다. 별도 페이지 이동 없이 철학과 상품이 같은 화면에서 만난다.
- §15의 Natural Rule을 마케팅 문구가 아니라 **도면**으로 보여준다.
- §49("웹사이트가 Olibana의 옷처럼 보여야 한다")를 문자 그대로 실현한다 — 옷의 구성 논리가 UI의 구성 논리다.
- **정직성 내장:** 실측 데이터가 있는 대상에만 렌더된다. 데이터가 없으면 토글이 그 대상에서 비활성화된다. 지어낼 수 없는 구조다.

**의존성:** Atlas 실측 데이터 + Fashion Spec. → 데이터 도착 전에는 **컴포넌트만 구현하고 비활성 상태로 출하.**

---

#### 안 2. **LIGHT AS GLOBAL STATE** — 사이트 전역 조도 시스템

Light Atlas를 장식이 아니라 **시스템 상태**로 만든다. 방문자의 로컬 시각에 따라 사이트 전체의 조도·색온도가 이동한다.

```
dawn      → 낮은 조도, 따뜻한 저채도, 긴 그림자
daylight  → 높은 조도, 중성 색온도, 짧고 선명한 그림자
dusk      → 깊은 금빛, 대비 완화, 부드러운 경계
```

**구현:** CSS custom property 토큰 세트 교체만으로 동작. **JS 거의 불필요, 성능 비용 ≈ 0.**
**제약:** 상품 이미지의 실제 색상 정확도는 절대 훼손하지 않는다 — 조도는 **UI 표면(배경/텍스트/보더)에만** 적용, 상품 사진에는 미적용. 구매 판단을 흐리면 §54 위반이다.
**수동 오버라이드 제공** (접근성/선호).

---

#### 안 3. **BRANCHING NAVIGATION** — Forest Atlas 기반 정보 위계

내비게이션이 계층적으로 **분기 전개**된다. trunk → branch → twig가 곧 nav → category → subcategory.

**제약(중요):** §12는 "정보구조가 불명확해지면 안 된다"고 못박는다. 따라서 분기는 **시각적 전개 방식**일 뿐, 링크는 항상 표준 `<a href>`이고 키보드 순회 순서는 선형이다. 예쁜 메뉴가 접근성을 깨는 순간 폐기한다.

---

### 10.4 UX 모드 (§54 준수)

| 여정 단계 | 모드 | 모션 예산 | 원칙 |
| --- | --- | --- | --- |
| Discovery (Home/Nature/Lookbook) | **Immersive** | 최대 | 세계관 우선 |
| Consideration (Collection/Product) | **Informative** | 중간 | 정보 우선, 모션은 이해를 도울 때만 |
| Purchase (Cart/Checkout) | **Frictionless** | **거의 0** | 신뢰·명료·속도. 실험 금지 (§20) |
| After (Confirm/Track/Care) | **Reassuring** | 낮음 | 정보 먼저, 브랜드 나중 (§21) |

> **강제 규칙:** Checkout 라우트에서는 브랜드 모션 시스템이 **자동으로 비활성화**된다. 코드 레벨에서 강제한다.

---

## 11. Motion Language

### 11.1 모션 토큰 (§44·§72) — 제안값

Atlas의 정성 관찰에서 도출. 실측 데이터 도착 시 값 교체 가능(토큰이므로 저비용).

| 토큰 | Duration | Easing | 변형 축 | Atlas 근거 | 사용처 |
| --- | --- | --- | --- | --- | --- |
| `motion.river` | 900–1400 ms | `cubic-bezier(.22,.61,.36,1)` — 긴 감속 꼬리 | translate, 곡선 경로 | *"continuous contours", "S shapes"* | 페이지 전환, 스크롤 연동 이동, 이미지 시퀀스 |
| `motion.stone` | 1200–2000 ms | `cubic-bezier(.65,0,.35,1)` — 무거운 시작 | clip-path, scale, layered reveal | *"fracture", "strata overlap"* | 섹션 진입, 패널 분할, 컬렉션 전환 |
| `motion.forest` | 400 ms + **stagger 80–120 ms** | `cubic-bezier(.33,1,.68,1)` | opacity + 소량 translateY | *"trunk→branch→twig hierarchy"* | 리스트/그리드 계층 등장, nav 전개 |
| `motion.light` | 1600–3000 ms | `linear` 또는 `ease-in-out` | **opacity / color만** — transform 없음 | *"gradual illumination"* | 조도 전환, 배경, 상태 변화 |
| `motion.wind` | 3000–6000 ms | `ease-in-out`, 무한 | 미세 translate (≤ 8px) | *"fabric drift"* | 히어로 미세 표류 (선택) |

### 11.2 절대 금지 (§5 코드화)

```
❌ overshoot / bounce         → 모든 이징의 출력값 > 1.0 금지 (린트 규칙화 가능)
❌ duration < 300 ms          → "fast UI transition" 금지
❌ 동시 진행 히어로 모션 2개 이상
❌ 목적 없는 parallax
❌ particle / glassmorphism / flashy gradient
❌ 무한 반복 모션 (wind 제외, 그마저 8px 이하)
```

### 11.3 모션 검증 게이트 (§43) — 파이프라인화

모든 모션은 PR 체크리스트를 통과해야 병합된다.

```
1. Atlas 출처를 인용했는가?          (없으면 반려)
2. 세계관을 강화하는가?
3. UX를 개선하는가?
4. 성능 비용이 정당한가?             (측정치 첨부)
5. reduced-motion 대체가 정의됐는가? (없으면 반려)
```

### 11.4 `prefers-reduced-motion` 매핑 (§42 필수)

| 토큰 | reduced 시 거동 |
| --- | --- |
| `motion.river` | 즉시 상태 전환 (transform 제거, opacity 120 ms) |
| `motion.stone` | reveal 제거, 최종 상태 즉시 표시 |
| `motion.forest` | stagger 제거, 동시 표시 |
| `motion.light` | 유지 (opacity/color만이므로 전정 자극 없음) — **단 duration 300 ms로 축소** |
| `motion.wind` | **완전 제거** |

---

## 12. Information Architecture

### 12.1 3층 구조 (§78)

```
LAYER 1 — WORLD      Home · Nature Atlas · Philosophy · Story
LAYER 2 — DESIGN     Collections · Design Language · Craft · Materials · Atelier · Journal · Lookbook
LAYER 3 — COMMERCE   Shop · Product · Fit&Size · Cart · Checkout · Order · Account · Support
```

### 12.2 IA 평가 — 지시서 제안 구조에 대한 의견

지시서 §8의 IA는 **40+ 라우트**다. 이에 대한 판단:

| 판단 | 대상 | 근거 |
| --- | --- | --- |
| **유지** | Home, Shop, Collections, Product, Olibana, Nature, Journal, Lookbook, Fit&Size, Care, Shipping, Returns, FAQ, Contact, Account, Cart, Checkout, Order*, Search, Wishlist, Legal 일체 | 커머스 완결에 필수 |
| **축소 권고** | Shop 하위 카테고리 9개 (Outerwear/Tops/Bottoms/Dresses/Knitwear/Accessories/Objects) | **상품이 0개**인 상태에서 9개 카테고리 라우트는 전부 빈 페이지가 된다. → **필터 파라미터로 구현**하고, 카테고리당 상품이 실제로 생기면 정적 라우트로 승격 |
| **보류 (미구현)** | Wholesale (§36), Press (§37), Stockists (§38) | 지시서 스스로 *"실제 model이 없는 경우 활성화하지 않는다"*, *"보도/수상을 만들어내지 않는다"*, *"실제 판매처가 생겼을 때"*라고 명시. **사업 사실이 없으므로 라우트를 만들지 않는다.** 데이터 모델만 확장 가능하게 열어둔다. |

> 지시서 §8: *"필요 없는 페이지는 임의로 구현하지 말고 실제 사업모델에 맞춰 판단한다."* — 위 판단은 이 지시에 근거한다.

---

## 13. 전체 페이지 목록

| # | 라우트 | Layer | UX 모드 | Phase | 상태 | 차단 요인 |
| --- | --- | --- | --- | :---: | --- | --- |
| 1 | `/` | WORLD | Immersive | 4 | 구조 가능 | 히어로 에셋 |
| 2 | `/shop` | COMMERCE | Informative | 5 | 구조 가능 | 상품 |
| 3 | `/shop?category=…` | COMMERCE | Informative | 5 | 구조 가능 | 상품 |
| 4 | `/collections` | DESIGN | Informative | 5 | 구조 가능 | 컬렉션 |
| 5 | `/collections/[slug]` | DESIGN | Immersive→Informative | 5 | 구조 가능 | 화보 |
| 6 | `/products/[slug]` | COMMERCE | Informative | 6 | 구조 가능 | **Fashion Spec + 촬영** |
| 7 | `/cart` + drawer | COMMERCE | Frictionless | 7 | 가능 | — |
| 8 | `/checkout` | COMMERCE | Frictionless | 7 | **차단** | **PG 계약** |
| 9 | `/order/confirmation` | COMMERCE | Reassuring | 7 | 구조 가능 | 주문 백엔드 |
| 10 | `/order/tracking` | COMMERCE | Reassuring | 7 | **차단** | **fulfillment 연동** |
| 11 | `/olibana/philosophy` | WORLD | Immersive | 8 | **가능** | — (문서 존재) |
| 12 | `/olibana/story` | WORLD | Immersive | 8 | 차단 | **사실 부재** |
| 13 | `/olibana/design-language` | DESIGN | Informative | 8 | **가능** | — (문서 존재) |
| 14 | `/olibana/craft` | DESIGN | Immersive | 8 | 차단 | 공정 사실 + 촬영 |
| 15 | `/olibana/materials` | DESIGN | Informative | 8 | 차단 | 소재 명세 |
| 16 | `/olibana/atelier` | DESIGN | Immersive | 8 | 차단 | 공정 사실 + 촬영 |
| 17 | `/nature` | WORLD | Immersive | 8 | 구조 가능 | — |
| 18 | `/nature/river` `/stone` `/forest` `/light` | WORLD | Immersive | 8 | 구조 가능 | **Atlas 실측** |
| 19 | `/journal` + `/journal/[slug]` | DESIGN | Informative | 9 | 구조 가능 | 원고 |
| 20 | `/lookbook` | DESIGN | Immersive | 9 | 구조 가능 | 화보 |
| 21 | `/fit-size` (guide/measurement/fit) | COMMERCE | Informative | 6 | 구조 가능 | **실측 치수** |
| 22 | `/care` | COMMERCE | Informative | 11 | 구조 가능 | 소재 정보 |
| 23 | `/shipping` | COMMERCE | Informative | 11 | 구조 가능 | **배송 계약** |
| 24 | `/returns` | COMMERCE | Informative | 11 | 구조 가능 | **정책 확정** |
| 25 | `/faq` | COMMERCE | Informative | 11 | 구조 가능 | 정책 |
| 26 | `/contact` | COMMERCE | Informative | 11 | 가능 | CS 채널 |
| 27 | `/account/*` (profile/orders/wishlist/addresses) | COMMERCE | Informative | 10 | 구조 가능 | 인증 백엔드 |
| 28 | `/wishlist` | COMMERCE | Informative | 10 | 가능 (로컬 우선) | — |
| 29 | `/search` | COMMERCE | Informative | 5 | 구조 가능 | 상품 |
| 30 | `/legal/*` (privacy/terms/cookie/accessibility/company) | — | Informative | 11 | **placeholder만** | **법무 검토** |
| 31 | `/404`, error, offline | — | — | 3 | **가능** | — |
| — | ~~`/wholesale`~~ ~~`/press`~~ ~~`/stockists`~~ | — | — | — | **미구현** | 사업 사실 부재 |

```
즉시 완결 가능:        6 라우트군
구조 구현 + 내용 대기:  18 라우트군
사업 인프라 차단:       5 라우트군
미구현 결정:            3 라우트군
```

---

## 14. Commerce Flow

### 14.1 여정과 모드

```
Discovery      Home / Nature / Lookbook / Journal          [Immersive]
    ↓
Understanding  Philosophy / Design Language / Atlas        [Immersive]
    ↓
Collection     Collection Intro → Grammar → Lookbook → Grid [Immersive→Informative]
    ↓
Product        Visual → Price → Size → Natural Rule → Spec  [Informative]
    ↓
Fit Confidence Measurements / Model / Size Guide (모달)      [Informative]  ★최대 이탈 지점
    ↓
Cart           Drawer (페이지 이탈 없음)                      [Frictionless]
    ↓
Checkout       Contact → Shipping → Payment → Review        [Frictionless] ★모션 OFF
    ↓
Confirmation   Order# → Product → ETA → Address → Tracking  [Reassuring]
    ↓
Fulfillment    Order → Craft → Preparation → Shipment → Journey → Arrival
    ↓
Aftercare      Care / Returns / Support                     [Reassuring]
    ↓
Loop           Journal / New Collection                      [Immersive]
```

### 14.2 전환 저해 요인 우선순위 (패션 EC 기준)

| 순위 | 불확실성 | 대응 | 필요 입력 |
| --- | --- | --- | --- |
| 1 | **사이즈** | 상품 페이지 내 실측표 + 모델 정보 + 즉시 열리는 가이드 (§17) | 실측 치수 |
| 2 | **배송/관세** | 국가 선택 시 조기 총액 표시 (§20) | 요율 테이블 |
| 3 | **반품** | 상품 페이지에서 직접 접근 (§33) | 확정 정책 |
| 4 | **실물 인상** | Movement/Scale/On-body 이미지 (§16) | 촬영 |
| 5 | **신뢰** | 회사 정보, CS 채널, 결제 뱃지 | 사업자 정보 |

> 이 5개 중 **4개가 개발이 아니라 데이터/사업 입력에 막혀 있다.** 커머스 성패의 대부분이 여기 있다.

### 14.3 §22 주문 상태 — 정직성 조건

지시서의 `ORDER → CRAFT → PREPARATION → SHIPMENT → JOURNEY → ARRIVAL` 표현은 아름답고 §60의 lifecycle과도 정합한다. **단, 각 단계는 실제 fulfillment 이벤트에 1:1 매핑되어야 한다.** 매핑되지 않는 단계는 **표시하지 않는다.** (§22)

---

## 15. Technical Architecture

### 15.1 스택 권고 (§70 기준: 장기 유지 가능성)

| 레이어 | 권고 | 이유 |
| --- | --- | --- |
| 프레임워크 | **Next.js (App Router) + TypeScript** | 구조화 데이터·SEO(§55·§65)와 커머스 라우팅에 SSR/ISR 필수. 생태계 수명이 길다. |
| 스타일 | **CSS Custom Properties 기반 토큰 + Tailwind(선택)** | §44 토큰이 1순위. 토큰을 CSS 변수로 두면 §10.3 안2(조도 상태)가 거의 무비용으로 동작. |
| 모션 | **CSS 우선 → 필요 시 JS** | 상세: 15.2 |
| 3D | **기본 미채택** | §71. 도입 시 국소 lazy-load |
| CMS | **헤드리스 CMS** (Sanity 또는 Payload) | §63 하드코딩 금지. Atlas/Journal/Lookbook/Policy 관리 |
| 커머스 | **미결정 — 승인 필요** | 15.4 |
| 애널리틱스 | 이벤트 스키마 우선, 벤더 후결정 | §56 |

### 15.2 모션 구현 전략 — 2026년 브라우저 현실 반영

조사 결과(2026-08 기준):

- **Scroll-driven animations:** Chrome/Edge 115+ 지원, Safari 26+ 지원, **Firefox는 152(2026-06)까지도 stable에서 플래그 뒤**
- **Cross-document View Transitions:** Chrome 126+, Safari 18.2+, **Firefox 진행 중**

**따라서 결론:**

```
1순위  CSS scroll-driven animations + View Transitions
       → 컴포지터에서 실행, JS 0 KB, 성능 최적
       → 단, 반드시 progressive enhancement. 미지원 브라우저는 정적 최종 상태로 정상 동작.
2순위  JS 모션 라이브러리 (Motion 등)
       → CSS로 표현 불가능한 경우에만. 특히 Firefox 대상 핵심 경험.
3순위  GSAP / ScrollTrigger
       → 복잡한 타임라인이 실제로 필요한 화면 1~2개에 한정
```

**핵심 원칙:** 브랜드 경험이 특정 브라우저의 실험적 기능에 **의존해서는 안 된다.** 모션이 없어도 사이트는 완전히 사용 가능해야 한다 — 이는 §42(reduced motion)와 동일한 요구다.

### 15.3 데이터 레이어 분리 (§61) — 필수 아키텍처

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  BRAND / DESIGN LAYER       │    │  COMMERCE LAYER             │
│  (CMS, 저빈도 변경)          │    │  (커머스 백엔드, 고빈도)      │
├─────────────────────────────┤    ├─────────────────────────────┤
│  Atlas (observation,        │    │  SKU                        │
│         measurement, rule)  │    │  Price / Currency           │
│  Natural Rule               │    │  Variant / Size / Color     │
│  Design Logic               │◄──►│  Inventory status           │
│  Fashion Spec               │ ID │  Production status          │
│  Visual Direction           │매핑 │  Fulfillment / Shipping     │
│  Editorial (Journal/Look)   │    │  Order                      │
└─────────────────────────────┘    └─────────────────────────────┘
         느리게 변한다                    빠르게 변한다
         브랜드가 소유한다                 시스템이 소유한다
```

**연결은 오직 안정적 ID로만.** 브랜드 레이어가 가격/재고를 알지 못하고, 커머스 레이어가 자연 규칙을 알지 못한다. 이 분리가 §62(AI 상품 생성)와 §60(재고 0 판매)의 전제 조건이다.

### 15.4 커머스 백엔드 — **승인 필요 결정**

| 옵션 | 장점 | 단점 | 적합성 |
| --- | --- | --- | --- |
| **Shopify (Headless / Storefront API)** | 결제·세금·배송·주문·관리자 즉시 확보. 글로벌 다통화. 운영 인력 최소 | 월 비용. 체크아웃 커스터마이징 제한 | §20이 체크아웃 실험을 금지하므로 **제약이 오히려 부합**. 1인 브랜드에 현실적 |
| **Medusa / 자체 구축** | 완전한 제어, §60 재고 0 lifecycle 자유롭게 모델링 | 결제·세금·컴플라이언스를 직접 책임. 유지 부담 큼 | 팀이 있을 때만 |
| **Stripe 직접 연동** | 가볍고 저렴 | OMS·재고·반품을 직접 만들어야 함 | 상품 수가 매우 적을 때 |

**권고: Shopify Headless.** 근거 — §70의 판단 기준이 "최신 기술"이 아니라 "장기 유지 가능성"이며, §20이 체크아웃의 독창성을 명시적으로 금지하므로, 커스텀 체크아웃을 만들 이유가 없다. 브랜드 차별화는 Layer 1–2에 투자하고, Layer 3는 검증된 인프라에 위임하는 것이 지시서의 우선순위(§7)와 정확히 일치한다.

### 15.5 성능 예산 (§41)

| 지표 | 목표 | 강제 방법 |
| --- | --- | --- |
| LCP (모바일 4G) | ≤ 2.5 s | 히어로는 **정적 이미지 우선 렌더**, 모션/영상은 LCP 이후 로드 |
| INP | ≤ 200 ms | 스크롤 핸들러 금지(CSS 우선), 메인 스레드 애니메이션 금지 |
| CLS | ≤ 0.1 | 모든 미디어에 종횡비 고정 |
| 초기 JS | ≤ 150 KB gzip | 라우트 분할, 모션 라이브러리 lazy |
| 히어로 초기 로드 | ≤ 400 KB | §11 *"첫 화면에서 무거운 asset을 무제한 로딩하지 않는다"* |

> **강제 규칙 (§41):** 히어로 애니메이션 때문에 LCP가 악화되는 구조는 허용하지 않는다.
> → 히어로의 첫 프레임은 **반드시 정적 이미지**이고, 모션은 그 위에 덧입혀진다.

---

## 16. 구현 우선순위

지시서 §83의 15 Phase를 유지하되, **차단 요인을 반영해 재배열**했다.

| Phase | 내용 | 차단 여부 | 산출물 |
| :---: | --- | :---: | --- |
| **0** | Repository + Spec Audit | — | **본 문서 ✅** |
| **1** | 설계 문서 20종 (§81) | 없음 | `02`–`20` 문서 |
| **2** | Design Language — 토큰, 타이포, 팔레트 | 폰트/팔레트 **승인 필요** | 토큰 시스템 |
| **3** | Motion System — 토큰, 프리셋, reduced-motion | 없음 | 모션 아키텍처 |
| **4** | Core Layout / Navigation / 전 상태(§59) | 없음 | 셸 + 404/error/loading |
| **5** | Homepage | 히어로 에셋 | 구조 완성, 에셋 슬롯 |
| **6** | Collection / Shop / Search | 상품 | 구조 완성 |
| **7** | **Product Page** | **Fashion Spec + 촬영** | 구조 완성, 데이터 비움 |
| **8** | Cart | 없음 | 완성 가능 |
| **9** | Checkout | **PG 계약** | 어댑터 인터페이스만 |
| **10** | Nature Atlas + Philosophy + Design Language | **Atlas 실측** | 구조 완성 |
| **11** | Journal / Lookbook | 원고/화보 | 구조 완성 |
| **12** | Account / Wishlist / Orders | 인증 백엔드 | Wishlist는 로컬로 선출시 가능 |
| **13** | Support (Shipping/Returns/FAQ/Care/Contact) | 정책 확정 | placeholder + 검토 배너 |
| **14** | SEO / Analytics / Accessibility | 없음 | 완성 가능 |
| **15** | Performance / Cross-device QA / E2E | 상위 의존 | 검증 리포트 |

**Phase 1–4, 8, 14는 외부 입력 없이 100% 완결 가능하다.** 여기에 먼저 집중한다.

---

## 17. 주요 리스크

| # | 리스크 | 확률 | 영향 | 완화 |
| --- | --- | :---: | :---: | --- |
| R1 | **콘텐츠 부채** — 상품/Atlas 데이터가 영영 채워지지 않아 화려한 빈 껍데기가 됨 | **높음** | **치명적** | Phase 1에서 데이터 요구사항을 스키마로 확정하고, 채워지지 않은 영역은 **출시 범위에서 제외**한다. 빈 페이지를 공개하지 않는다. |
| R2 | **에셋 부채** — 촬영 없이는 시각적 완성도가 불가능 | **높음** | **치명적** | 에셋 슬롯 사양(종횡비·용량·포커스)을 먼저 확정해 촬영 브리프로 전달. 스톡 이미지를 브랜드 이미지로 쓰지 않는다. |
| R3 | **정직성 위반** — 측정값/배송기간/공정/보도를 지어내고 싶은 압력 | 높음 | 치명적 (브랜드 신뢰) | 데이터 없는 필드는 **렌더 자체를 하지 않는** 컴포넌트 계약. 문서 §17·§22·§26·§27·§34·§35·§37·§39를 QA 체크리스트로 강제. |
| R4 | **모션 vs 성능** — 몰입 경험이 LCP/INP를 파괴 | 중간 | 높음 | §15.5 예산을 CI에서 강제. 히어로 첫 프레임 정적화. |
| R5 | **브라우저 파편화** — Firefox의 scroll-driven 미지원 | 확정 | 중간 | 100% progressive enhancement. 모션 없이도 완전 동작. |
| R6 | **범위 과대** — 40+ 라우트 × 1인 유지 | **높음** | 높음 | §19 MVP 경계 준수. Wholesale/Press/Stockists 미구현. 카테고리는 필터로. |
| R7 | **법무 리스크** — 개인정보/전자상거래/국가별 소비자법 | 중간 | **치명적** | AI가 법률 문구를 확정하지 않는다. placeholder + `REQUIRES LEGAL REVIEW` 배너. 실 결제 개시 전 검토 필수. |
| R8 | **커머스 전환 희생** — 예술성이 구매를 방해 | 중간 | 높음 | §54 UX 모드를 코드로 강제(체크아웃 모션 자동 OFF). §56 이벤트로 실측. |
| R9 | **Character Bible 확장 시 재해석 위험** | 중간 | 중간 | §2 준수 — 기존 내용 불변, 가산만. 사실 관계(네이밍/파운더)는 사용자만 확정. |

---

## 18. Acceptance Criteria

### 18.1 전역 합격 기준 (§85)

**Brand**
- [ ] 로고 없이도 Olibana로 식별 가능한 시각 언어가 존재한다
- [ ] Brand Bible·Character Bible과 충돌하는 표현이 없다
- [ ] 모든 모션 토큰이 Atlas 출처를 인용한다
- [ ] §74 금지 목록(일본 클리셰, 럭셔리 템플릿, 특정 브랜드 모방) 위반 0건

**Experience**
- [ ] 첫 화면 3초 내에 "일반 쇼핑몰이 아니다"가 전달된다
- [ ] 페이지 간 continuity가 존재한다
- [ ] 스크롤 하이재킹 없음. 네이티브 스크롤 우선

**Commerce**
- [ ] §77의 10개 질문에 상품 페이지만으로 전부 답할 수 있다
- [ ] 사이즈 가이드가 상품 페이지에서 이탈 없이 열린다
- [ ] 총액(배송·세금 포함)이 결제 이전에 표시된다
- [ ] 반품 조건이 상품 페이지에서 접근 가능하다
- [ ] 게스트 체크아웃이 가능하다

**Technical**
- [ ] LCP ≤ 2.5 s / INP ≤ 200 ms / CLS ≤ 0.1 (모바일 4G)
- [ ] 키보드만으로 발견→구매 전 과정 완주 가능
- [ ] `prefers-reduced-motion`에서 완전 동작
- [ ] 모션 미지원 브라우저에서 완전 동작
- [ ] 모든 주요 라우트에 Loading/Empty/Error/Offline 상태 존재 (§59)
- [ ] 구조화 데이터가 상품/컬렉션/기사에 적용됨

**Honesty (Olibana 고유 기준)**
- [ ] 실측되지 않은 수치가 화면에 없다
- [ ] 확정되지 않은 정책이 확정된 것처럼 표시되지 않는다
- [ ] 존재하지 않는 공정/보도/판매처가 표현되지 않는다

### 18.2 페이지별 기준 템플릿 (§82)

각 페이지는 `08_PAGE_SPECIFICATIONS.md`에서 다음 15항목을 정의한다:

```
Purpose / Primary User / Primary CTA / Secondary CTA / Content /
Interaction / Motion (토큰 인용) / Responsive / Accessibility /
SEO / Analytics / Error / Loading / Empty / Commerce Dependency
```

---

## 19. MVP Boundary

### 19.1 원칙

> **빈 페이지를 공개하지 않는다.**
> 상품이 없는 상점, 데이터가 없는 Atlas, 정책이 없는 반품 페이지는 브랜드를 훼손한다.
> 지시서 §76은 홈페이지가 "무엇을 팔고 있는지 명확"해야 한다고 했다. 팔 것이 없으면 그 기준을 충족할 수 없다.

### 19.2 두 개의 출시 경계

#### **MVP-0 — BRAND WORLD (상품 없이 출시 가능)**

| 포함 | 제외 |
| --- | --- |
| Home (히어로 + 세계관 스크롤) | Shop / Product |
| Nature Atlas (구조 + 도착한 데이터만) | Cart / Checkout |
| Philosophy / Design Language | Account / Orders |
| Journal (기사 있을 때) | Shipping / Returns 수치 |
| 뉴스레터 등록 | Wholesale / Press / Stockists |
| 404 / 전 상태 / 접근성 / SEO | |

**목적:** 브랜드 존재 선언, 검색 인덱싱 시작, 관심 수집.
**필요 입력:** 히어로 에셋 1세트 + 팔레트/폰트 승인. **그것뿐이다.**
**이것이 현실적인 첫 출시다.**

#### **MVP-1 — COMMERCE (상품 확보 후)**

추가: Shop, Collection, **Product Page(§14·§15·§16 전체)**, Fit&Size, Cart, Checkout, Order Confirmation, Shipping/Returns/FAQ, Wishlist, Search.

**필요 입력 (전부 필수):**
```
1. Fashion Specification        — 상품별 디자인 규칙 + 구성
2. 실측 치수표                   — 사이즈별 garment measurements
3. 상품 촬영                     — 상품당 최소 Front/Back/Detail/On-body
4. 소재 명세                     — composition, weight, care
5. 가격 / 통화 / 판매 지역
6. 결제 provider 계약
7. 배송사 + 지역별 요율/기간
8. 확정된 반품 정책
9. 사업자 정보 + 법무 검토된 정책 문서
```

**MVP-1은 위 9개가 갖춰지기 전에는 출시할 수 없다** — 기술적 한계가 아니라, 지시서가 금지한 날조 없이는 화면을 채울 수 없기 때문이다.

### 19.3 Atlas 데이터 최소 요건

Rule Layer(§10.3 안1)와 Nature 경험(§24)이 의미를 가지려면:

```
Atlas당 최소 3회 현장 기록  ×  4개 Atlas  =  12개 데이터 행
```

이것이 없으면 Nature 페이지는 "측정 방법 설명서"에 그친다. **12행이 Olibana 세계관의 최소 자본이다.**

---

## 20. 다음 구현 단계

### 20.1 즉시 착수 (승인 불필요, 외부 입력 불필요)

지시서 §81의 20개 문서 중 지금 바로 작성 가능한 것:

| 문서 | 상태 |
| --- | --- |
| `01_SITE_AUDIT.md` | ✅ **본 문서** |
| `03_INFORMATION_ARCHITECTURE.md` | 착수 가능 |
| `04_MOTION_LANGUAGE.md` | 착수 가능 (§11이 초안) |
| `09_COMPONENT_ARCHITECTURE.md` | 착수 가능 |
| `11_DATA_MODEL.md` | 착수 가능 (§15.3이 골격) |
| `12_ANALYTICS_SPEC.md` | 착수 가능 |
| `13_SEO_GEO_SPEC.md` | 착수 가능 |
| `14_ACCESSIBILITY_SPEC.md` | 착수 가능 |
| `15_PERFORMANCE_SPEC.md` | 착수 가능 (§15.5가 초안) |
| `16_INTERNATIONALIZATION.md` | 착수 가능 |
| `18_QA_PLAN.md` | 착수 가능 |
| `19_BUILD_PLAN.md` | 착수 가능 |
| `20_ACCEPTANCE_CRITERIA.md` | 착수 가능 (§18이 초안) |

### 20.2 승인 후 착수

| 문서 | 필요한 결정 |
| --- | --- |
| `02_BRAND_EXPERIENCE_SYSTEM.md` | §10.3 인터랙션 3안 채택 여부 |
| `05_VISUAL_SYSTEM.md` | **팔레트 방식(A/B) + 폰트 선정** |
| `06_COMMERCE_UX.md` | **커머스 백엔드 결정** |
| `10_TECH_ARCHITECTURE.md` | 스택 확정 |
| `17_COMMERCE_INTEGRATION.md` | provider 확정 |

### 20.3 외부 입력 대기

| 문서 | 대기 중인 입력 |
| --- | --- |
| `07_PRODUCT_PAGE_SPEC.md` | **Fashion Specification** |
| `08_PAGE_SPECIFICATIONS.md` | 위 결정들 (부분 착수 가능) |

### 20.4 사용자 결정이 필요한 사항 — 요약

```
D1. 실제 상품이 존재하는가?
    (Fashion Spec / 실측 치수 / 촬영본이 저장소 밖에 있는가?)
    → MVP-0로 갈지 MVP-1을 목표할지가 여기서 갈린다.

D2. 커머스 백엔드 — Shopify Headless 권고. 승인?

D3. 시각 시스템 — 팔레트를 (A) 실측 후 도출 / (B) 잠정 도출 후 교체 중 무엇으로?
    폰트 라이선스 예산은?

D4. Character Bible 확장 — 포토그래피 디렉션과 웹 보이스를 가산 확장해도 되는가?
    (기존 내용은 불변)

D5. Nature Atlas 실측 — 12행 데이터를 누가 언제 수집하는가?
    이것이 Rule Layer의 전제다.
```

---

## 부록 A. 조사 방법 및 출처

**저장소 조사:** 전체 파일 트리 열거, 전 브랜치/커밋 히스토리, 키워드 검색(fashion/spec/SKU/garment/measurement/palette/font), 빌드·설정·에셋 파일 패턴 검색, 계정 내 전체 저장소 목록 확인 후 2번째 저장소 clone 및 내용 확인.

**웹 리서치 (§80 STEP 9):** 2026년 이머시브 커머스 패턴 및 브라우저 지원 현황.

- [View Transitions API and CSS Scroll-Driven Animations: The Browser Wins of 2026 — Frontend Horizon](https://www.frontendhorizon.com/blog/view-transitions-api-and-css-scroll-driven-animations-the-browser-wins-of-2026)
- [Cross-Document View Transitions: The Gotchas Nobody Mentions — CSS-Tricks](https://css-tricks.com/cross-document-view-transitions-part-1/)
- [Cross-Document View Transitions Are Finally Cross-Browser: A Practical Guide for 2026](https://trade-assistance.com/blog/cross-document-view-transitions-mpa-2026/)
- [Top Web Design Trends for 2026 — Figma](https://www.figma.com/resource-library/web-design-trends/)
- [Ecommerce Design Trends 2026 — Design Studio](https://www.designstudiouiux.com/blog/ecommerce-web-design-trends/)

**§6·§74 준수 확인:** 위 트렌드 조사는 *기술적 가용성 판단*에만 사용했다. 특정 브랜드의 디자인·인터랙션을 참조하거나 복제하지 않았다. §10.3의 인터랙션 3안은 Olibana의 기존 Atlas 문서에서 도출한 것이다.

---

## 부록 B. 지시서 준수 확인

| 지시서 조항 | 본 문서에서의 준수 |
| --- | --- |
| §80 (10단계 감사) | STEP 1–10 전부 수행 |
| §89 (20섹션 보고 형식) | 형식 준수 |
| §89 (구현하지 말 것) | **코드 0줄. 설계·분석만.** |
| §2 (기존 문서 재작성 금지) | Character Bible 불변 확인, 가산 확장만 제안 |
| §17·§22·§26·§27·§34·§35·§37·§39 (날조 금지) | 없는 데이터를 만들지 않았고, 부재를 부재로 보고함 |
| §8 (불필요 페이지 미구현) | Wholesale/Press/Stockists 미구현 권고 |
| §74 (금지 목록) | 클리셰·템플릿·특정 브랜드 모방 없음 |
