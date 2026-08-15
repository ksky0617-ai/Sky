# FIRST GARMENT — EXECUTION PACK

**Version:** v1.0 · **Date:** 2026-08-15
**Scope:** MVP =「한 벌 완주」. Pre-order. 첫 판매를 지탱하는 최소 설계만.
**LOCKED:** `Character_Bible.md`, `Design_System.md` — 변경 금지
**Deferred:** AI Loop Engineering은 성장 시스템으로 분리 (본 문서 대상 아님)

---

# Part 1. 공급자 견적 질문 리스트

## 1.1 최소 구성의 정의

견적을 요청할 때 **범위가 모호하면 견적도 모호하게 돌아온다.** 「한 벌 완주」에 필요한 최소 구성은 다음과 같이 고정한다.

```
품목      1 스타일
색상      1 컬러
사이즈    3 사이즈 (예: S / M / L)
샘플      1점 + 수정 2회까지
양산      수량 미확정 → 단계별 단가로 요청
포함      패턴 · 그레이딩 · 부자재 · 라벨 · 개별 포장
```

### 왜 수량을 확정하지 않고 묻는가 — 이것이 이 견적의 핵심이다

pre-order는 **판매가 끝나야 수량을 안다.** 그런데 가격은 **판매 시작 전에** 정해야 한다. 순서가 거꾸로다.

따라서 단일 수량 견적은 쓸모가 없다. 반드시 **수량 구간별 단가**를 받아야 하고, 그래야 다음 두 가지를 계산할 수 있다.

```
① 판매가를 얼마로 정할 것인가
② pre-order가 최소 몇 장 모여야 생산에 들어갈 수 있는가  ← 손익분기 수량
```

②가 없으면 pre-order를 열 수 없다. 주문이 미달일 때 어떻게 할지 정할 수 없기 때문이다. 이것이 견적 요청에서 가장 중요한 항목이다.

**요청할 수량 구간:** 10 / 20 / 30 / 50 / 100장

### 반드시 확인해야 하는 숨은 제약

| 항목 | 왜 |
| --- | --- |
| **원단 최소 구매 단위** | 봉제 MOQ가 10장이어도 **원단은 반(反) 단위**가 최소인 경우가 흔하다. 원단 MOQ가 실질 MOQ를 결정한다. |
| **리드타임 총합** | ADR-003에 따라 **결제 전에 납기를 명시**해야 한다. 리드타임을 모르면 상품 페이지를 만들 수 없다. |
| **재생산 가능 여부** | 한 번만 만들 수 있는 구조면 첫 판매 이후가 없다. |
| **법정 표시 라벨** | 조성·취급 표시는 **법적 의무**다. 누가 작성·부착하는지 반드시 확정. |

---

## 1.2 日本語版 — 공급자 발송용

> 件名: OEM生産に関するお見積り・生産条件のご確認

はじめまして。アパレルブランドの立ち上げにあたり、少量からの生産をご相談させていただきたくご連絡いたしました。

現在、**1型・1色・3サイズ**での初回生産を検討しております。数量は事前予約（受注）の結果によって決まるため、**数量帯ごとの単価**をご提示いただけますと幸いです。

お手数ですが、以下についてご回答いただけますでしょうか。

**1. 対応可否**
- ご対応可能な品目カテゴリーをお教えください
- 弊方が想定している品目：〔　　　　〕
- 10〜50枚程度の小ロット生産にご対応いただけますか

**2. 最小ロット（MOQ）**
- 1型あたりの最小生産枚数
- 1色あたりの最小枚数
- 3サイズ展開に伴う制約の有無
- **生地の最小手配単位（反単位・m単位）** ※重要

**3. 価格**
- **工賃のみ（CMT）** と **生地込み（フルパッケージ）** の両方でお願いいたします
- 数量帯別の単価：**10 / 20 / 30 / 50 / 100枚**
- 表示通貨およびお見積りの有効期限

**4. サンプル**
- サンプル代
- 制作期間
- 修正可能回数と追加費用
- 量産前の最終確認サンプルの有無

**5. リードタイム**
- サンプル完成までの期間
- 量産開始から完成までの期間
- **発注確定から出荷までの合計期間** ※販売ページに記載するため必須

**6. 生産キャパシティ**
- 月間の対応可能枚数
- 繁忙期・閑散期の時期

**7. パターン**
- パターンメイキングのご対応可否と費用
- グレーディングのご対応可否
- 弊方から支給する場合の対応形式（紙／DXF等）

**8. 生地・副資材**
- 生地の手配をお願いできるか、または支給が必要か
- 副資材（ボタン、ファスナー、芯地、糸等）の手配可否
- 生地のロス率の目安

**9. 品質管理**
- 検品基準
- 不良品が発生した場合のご対応
- 想定される不良率

**10. 表示ラベル**
- **品質表示（組成・洗濯表示）の作成対応**
- ブランドネーム、下げ札の取り付け
- 法令表示に関する責任範囲

**11. 梱包・出荷**
- 個包装へのご対応
- 出荷形態
- 指定住所への直送可否

**12. お支払い条件**
- 前払いの比率
- お支払い方法および通貨
- 追加生産時の条件

**13. 再生産**
- 同一仕様での追加生産の可否
- その際のMOQとリードタイム

**14. 納期遅延**
- 遅延が生じた場合のご連絡方法とご対応

**15. 契約・権利**
- デザインおよびパターンの権利の取り扱い
- 第三者への転用について
- 秘密保持契約の締結可否

お忙しいところ恐れ入りますが、ご確認のほどよろしくお願いいたします。

---

## 1.3 한국어판 — 공급자 발송용

> 제목: OEM 생산 견적 및 생산 조건 확인 요청

안녕하세요. 어패럴 브랜드 런칭을 준비하며 소량 생산 상담을 드리고자 연락드립니다.

현재 **1스타일 · 1컬러 · 3사이즈**로 초도 생산을 검토하고 있습니다. 수량은 사전 예약(수주) 결과에 따라 결정되므로, **수량 구간별 단가**로 제시해 주시면 감사하겠습니다.

번거로우시겠지만 아래 항목에 대해 회신 부탁드립니다.

**1. 대응 가능 여부**
- 대응 가능한 품목 카테고리
- 저희가 검토 중인 품목: 〔　　　　〕
- 10~50장 수준의 소량 생산 가능 여부

**2. 최소 수량 (MOQ)**
- 스타일당 최소 생산 수량
- 컬러당 최소 수량
- 3사이즈 전개에 따른 제약 유무
- **원단 최소 구매 단위 (롤/야드/미터)** ※중요

**3. 단가**
- **임가공(CMT)** 과 **원단 포함(풀패키지)** 두 가지 모두
- 수량 구간별 단가: **10 / 20 / 30 / 50 / 100장**
- 표시 통화 및 견적 유효기간

**4. 샘플**
- 샘플 비용
- 제작 기간
- 수정 가능 횟수 및 추가 비용
- 양산 전 최종 확인 샘플 유무

**5. 리드타임**
- 샘플 완성까지의 기간
- 양산 시작부터 완성까지의 기간
- **발주 확정부터 출고까지의 총 기간** ※판매 페이지 고지에 필수

**6. 생산 캐파**
- 월 대응 가능 수량
- 성수기 · 비수기 시기

**7. 패턴**
- 패턴 제작 대응 가능 여부 및 비용
- 그레이딩 대응 가능 여부
- 저희가 지급할 경우 요구 형식 (종이 / DXF 등)

**8. 원단 · 부자재**
- 원단 수배 가능 여부, 또는 지급 필요 여부
- 부자재(단추, 지퍼, 심지, 실 등) 수배 가능 여부
- 원단 로스율 기준

**9. 품질 관리**
- 검품 기준
- 불량 발생 시 대응
- 예상 불량률

**10. 라벨**
- **품질 표시(혼용률 · 취급 표시) 제작 대응**
- 브랜드 네임, 행택 부착
- 법정 표시에 대한 책임 범위

**11. 포장 · 출고**
- 개별 포장 대응 가능 여부
- 출고 형태
- 지정 주소 직배송 가능 여부

**12. 결제 조건**
- 선금 비율
- 결제 수단 및 통화
- 추가 생산 시 조건

**13. 재생산**
- 동일 사양 추가 생산 가능 여부
- 그 경우의 MOQ 및 리드타임

**14. 납기 지연**
- 지연 발생 시 통보 방법 및 대응

**15. 계약 · 권리**
- 디자인 및 패턴의 권리 귀속
- 제3자 전용(轉用) 관련
- 비밀유지계약 체결 가능 여부

확인 부탁드립니다. 감사합니다.

---

## 1.4 견적 결과를 데이터 모델에 반영하는 방침

**원칙: 견적은 원본 그대로 보존하고, 파생값은 계산한다.**

```
SupplierQuote  (받은 그대로 · 불변 · 증거)
      │
      ├─ 수량 구간별 단가 → PriceTier
      │
      ▼
UnitEconomics  (계산 결과 · 재계산 가능)
      │
      ├─ 판매가 결정
      └─ 손익분기 수량 → PreorderRun.minimum_quantity
```

**반영 규칙 4가지**

1. **견적 원문은 수정하지 않는다.** `SupplierQuote`는 append-only. 재견적은 새 레코드이고, 기존 레코드는 남긴다. 가격 근거를 나중에 추적할 수 없으면 마진이 왜 그렇게 됐는지 알 수 없다.
2. **단가는 상품이 아니라 수량 구간에 붙는다.** `Product`에 원가 필드를 두지 않는다. 원가는 `PriceTier(quantity, unit_cost)`이며, 실제 원가는 pre-order 마감 후 확정된다.
3. **`UNKNOWN`은 `0`이 아니다.** 미회신 항목은 null로 두고, 그 상태에서 마진 계산은 **계산 불가**를 반환한다. 0으로 채우면 손해 나는 상품이 이익 나는 상품처럼 보인다.
4. **손익분기 수량이 pre-order의 최소 수량이 된다.** 이 값이 상태 머신의 `PREORDER_CLOSED` 분기를 결정한다. 견적이 없으면 pre-order를 열 수 없다.

**받자마자 계산할 것**

```
각 수량 구간 t 에 대해:
   원가(t)   = 임가공(t) + 원단(t) + 부자재(t) + 라벨 + 포장
   총고정비   = 패턴 + 그레이딩 + 샘플            ← 수량으로 나눠 배분
   실원가(t) = 원가(t) + 총고정비 / t
   기여이익(t) = 판매가 − 실원가(t) − 결제수수료(2.9% + $0.30) − 배송보조
   
   손익분기 수량 = 기여이익(t) > 0 이 되는 최소 t
```

---

# Part 2. 데이터 모델 설계

**원칙: 첫 한 벌을 지탱하는 것만. 카탈로그·계정·위시리스트·재고는 만들지 않는다.**

## 2.1 엔티티

```
Product ──< Variant ──< OrderItem >── Order ──> Customer
   │                                    │
   │                                    ├──> Payment
   │                                    └──> Shipment
   │
   └──< PreorderRun ──> SupplierQuote ──< PriceTier

Event  (모든 엔티티를 가로지르는 추적 로그)
```

## 2.2 필수 필드만

### Product — 디자인 레이어
```
id                 PRD_xxx
code               OLB-CT-001          공개 식별자
name
category
status             DRAFT | READY | PUBLISHED | CLOSED | ARCHIVED
natural_rule       { atlas, observation, translation }   ← 실측 있을 때만
fashion_spec_ref   Fashion Specification 문서 참조
published_at
```
> 가격 · 재고 · 원가는 **여기에 두지 않는다.** 디자인 레이어와 커머스 레이어의 분리.

### Variant — 판매 단위
```
id                 VAR_xxx
product_id
sku                OLB-CT-001-STN-M
size               S | M | L
colour_code        STN
measurements       { 실측 치수 }        ← 없으면 null. 지어내지 않는다.
price_amount       정수 (최소 통화 단위)
price_currency
status             AVAILABLE | CLOSED
```

### PreorderRun — pre-order의 핵심 엔티티
```
id                 RUN_xxx
product_id
opens_at
closes_at
minimum_quantity   ← 손익분기 수량. 견적에서 나온다.
target_quantity
committed_quantity
production_lead_days
promised_ship_by   ← 결제 전 고지 의무 (ADR-003)
status             OPEN | CLOSED_REACHED | CLOSED_UNDERSUBSCRIBED | IN_PRODUCTION | SHIPPED
supplier_quote_id
```

### Order
```
id                 ORD_xxx
number             OLB-2608-0001       고객 노출용
customer_id
preorder_run_id
status             (Part 3 상태 머신)
subtotal / shipping / tax / total  + currency
shipping_address   { }
promised_ship_by   주문 시점에 고지한 날짜를 복사 보관 ← 나중에 Run이 바뀌어도 약속은 불변
placed_at
idempotency_key    UNIQUE             중복 웹훅 방지
```

### OrderItem
```
id · order_id · variant_id · quantity
unit_price_amount        주문 시점 가격을 복사 보관
sku_snapshot             주문 시점 SKU 문자열
```
> **가격과 SKU를 복사해 저장하는 이유:** 참조만 하면 나중에 가격이 바뀌었을 때 과거 주문 금액이 소급 변경된다. 영수증과 주문 내역이 달라지는 것은 데이터 무결성 실패다.

### Customer
```
id                 CUS_xxx (UUID)
email              UNIQUE
name
created_at
```
> 계정·비밀번호 없음. 게스트 체크아웃만. 첫 한 벌에 인증 시스템은 불필요하다.

### Payment
```
id · order_id
provider           stripe
provider_ref       Stripe session/intent ID
amount / currency
status             PENDING | SUCCEEDED | FAILED | REFUNDED | PARTIALLY_REFUNDED
captured_at
```
> 카드 정보는 저장하지 않는다. 참조만 보관.

### Shipment
```
id · order_id
carrier · tracking_number · tracking_url
shipped_at · delivered_at
```

### SupplierQuote / PriceTier
```
SupplierQuote:  id · supplier_name · received_at · currency
                lead_days_sample · lead_days_production
                fabric_moq · pattern_cost · sample_cost
                raw_document_ref          원문 보존
                (append-only)

PriceTier:      id · quote_id · quantity · cmt_cost · fabric_cost
                trims_cost · packaging_cost
```

### Event — 추적성 (사후 소급 불가, 그래서 지금 만든다)
```
id · occurred_at
type               order.paid | run.closed | shipment.delivered ...
subject_type / subject_id
actor              customer | system | operator:{name}
payload            { }
session_id · signal_id       유입 추적 (있을 때만)
```

## 2.3 만들지 않는 것

```
✗ Inventory       pre-order는 재고를 갖지 않는다
✗ Cart            단일 상품 · 단일 variant. Stripe 세션이 대신한다
✗ Account         게스트 체크아웃만
✗ Wishlist / Review / Coupon / Collection / Category
✗ Return          첫 반품이 발생할 때 만든다. 정책은 문서로 먼저 존재
```

---

# Part 3. 주문 상태 머신 (pre-order 전제)

## 3.1 상태 전이도

```
                    CREATED
                       │ 결제 성공
                       ▼
                     PAID
                       │ 자동
                       ▼
              ┌─ PREORDER_HELD ─┐          ← 예약 기간 동안 대기
              │                 │
    Run 마감: 최소 수량      Run 마감: 최소 수량
       달성                    미달
              │                 │
              ▼                 ▼
      PRODUCTION_PENDING   UNDERSUBSCRIBED
              │                 │ 전액 환불
              ▼                 ▼
        IN_PRODUCTION       REFUNDED ●
              │
              ▼
             QC
              │
              ▼
           PACKING
              │
              ▼
           SHIPPED
              │
              ▼
          IN_TRANSIT
              │
              ▼
          DELIVERED ●

측면 상태:
  PAYMENT_FAILED ●      CREATED에서만 진입
  CANCELLED ●           PAID · PREORDER_HELD · PRODUCTION_PENDING 에서만 진입
  PRODUCTION_FAILED     IN_PRODUCTION · QC 에서 진입 → 재생산 또는 환불
  REFUNDED ●            terminal

●  = terminal (더 이상 전이 없음)
```

## 3.2 허용되는 전이

| From | To | 조건 |
| --- | --- | --- |
| `CREATED` | `PAID` | 결제 성공 웹훅 |
| `CREATED` | `PAYMENT_FAILED` | 결제 실패 |
| `PAID` | `PREORDER_HELD` | 자동 |
| `PREORDER_HELD` | `PRODUCTION_PENDING` | Run 마감 && committed ≥ minimum |
| `PREORDER_HELD` | `UNDERSUBSCRIBED` | Run 마감 && committed < minimum |
| `UNDERSUBSCRIBED` | `REFUNDED` | 전액 환불 실행 (자동, 예외 없음) |
| `PRODUCTION_PENDING` | `IN_PRODUCTION` | 생산 지시 발행 |
| `IN_PRODUCTION` | `QC` | 생산 완료 |
| `QC` | `PACKING` | 검품 합격 |
| `QC` | `PRODUCTION_FAILED` | 검품 불합격 |
| `IN_PRODUCTION` | `PRODUCTION_FAILED` | 생산 실패 |
| `PRODUCTION_FAILED` | `IN_PRODUCTION` | 재생산 결정 |
| `PRODUCTION_FAILED` | `REFUNDED` | 환불 결정 |
| `PACKING` | `SHIPPED` | 송장 발행 |
| `SHIPPED` | `IN_TRANSIT` | 캐리어 최초 스캔 |
| `IN_TRANSIT` | `DELIVERED` | 배송 완료 |
| `PAID` · `PREORDER_HELD` · `PRODUCTION_PENDING` | `CANCELLED` | 고객 요청 |
| `CANCELLED` | `REFUNDED` | 환불 실행 |

## 3.3 금지되는 전이 — 시도 시 거부하고 기록한다

| 금지 | 이유 |
| --- | --- |
| `CREATED` → 결제 이후 모든 상태 | 결제 없이 생산은 pre-order의 존재 이유를 부정 |
| `IN_PRODUCTION` → `CANCELLED` | **원단이 이미 재단됐다.** 취소는 생산 착수 전까지만 |
| `QC` 이후 → `CANCELLED` | 동일 |
| 임의 상태 → `DELIVERED` | 배송 완료는 캐리어 이벤트로만 |
| `DELIVERED` → 이전 상태 | terminal |
| `REFUNDED` → 모든 상태 | terminal. 재활성은 새 주문 |
| `PREORDER_HELD` → `IN_PRODUCTION` | `PRODUCTION_PENDING`을 건너뛸 수 없음 |
| `UNDERSUBSCRIBED` → `PRODUCTION_PENDING` | 미달인데 생산하면 손실 확정 |
| 상태 역행 전반 | 로그로 남기고 거부 |

## 3.4 실행 규칙

**멱등성**
- 모든 전이는 `(order_id, from_status, to_status, idempotency_key)`로 중복 차단
- 동일 웹훅 재수신 → no-op, 에러 아님
- **생산 지시는 주문당 1건**, DB unique 제약으로 강제 — 웹훅이 한 번만 오기를 기대하지 않는다

**기록**
- 모든 전이는 `Event`에 actor · timestamp · reason 기록
- 거부된 전이도 기록 (침묵 실패 방지)

**고객 통보 — 요청받기 전에 알린다**
```
PAID                  주문 확인 + 예약 마감일 + 예상 출고일
UNDERSUBSCRIBED       미달 안내 + 환불 일정        ← 고객이 묻기 전에
PRODUCTION_PENDING    생산 확정 + 출고 예정일
SHIPPED               송장 번호
지연 발생 시           정직한 수정 납기            ← 침묵이 최악
```

**Kill switch**
- 자동 상태 전이 · 고객 통보 · 환불 실행을 한 번에 정지시키는 스위치. 전부 수동인 지금이 만들기 가장 쉬운 시점이다.

---

# Part 4. 식별자 체계

## 4.1 원칙

| 원칙 | 적용 |
| --- | --- |
| **유일성** | 내부 ID는 충돌 불가능하게 |
| **가독성** | 사람이 다루는 것(주문번호·SKU)은 읽고 말할 수 있게 |
| **비열거성** | 고객 관련 ID는 순번 추측 불가하게 |
| **불변성** | 변하는 것(가격·재고·시즌)을 ID에 넣지 않는다 |
| **확장성** | 두 번째 상품에서 체계가 깨지지 않게 |

## 4.2 체계

```
Product      PRD_{ulid}                내부
             OLB-CT-001                공개 코드
             └─ OLB · 카테고리 2자 · 3자리 일련
                CT=coat  JK=jacket  KN=knit  TR=trouser  AC=accessory

SKU          OLB-CT-001-STN-M
             └─ 상품코드 · 컬러 3자 · 사이즈
                컬러는 안정적 코드(STN=stone). 시즌명·가격 금지

Order        ORD_{ulid}                내부
             OLB-2608-0001             고객 노출
             └─ 연월 + 4자리 일련
                고객이 전화로 읽을 수 있어야 한다

Customer     CUS_{uuid4}               ← 순번 금지. 열거 공격 방지
PreorderRun  RUN_{ulid}
Payment      PAY_{ulid}   (+ Stripe 원본 ref 별도 보관)
Shipment     SHP_{ulid}
Event        EVT_{ulid}
Experiment   EXP-{seq}-{slug}          예: EXP-001-hero-copy
```

## 4.3 추적 체인 — 지금 안 만들면 나중에 못 만든다

```
signal_id → content_id → campaign_id → session_id → order_id → shipment_id → feedback_id
```

- `session_id`는 첫 방문 시 발급, 주문에 기록
- 유입 파라미터(`utm_*`, Pinterest pin ID)는 `signal_id`로 정규화
- **첫 판매 시점에 기록하지 않은 것은 영구히 복원 불가** (R-11)

## 4.4 왜 ULID인가

시간순 정렬 가능 + 충돌 없음 + URL 안전. UUIDv4는 정렬이 안 되고, 순번은 정보를 노출한다. **고객 관련 ID만 UUIDv4** — 정렬 가능성이 곧 열거 가능성이기 때문이다.

---

# Part 5. 구현 금지 사항

## 5.1 지금 하지 않는 것

```
✗ 코드 작성 전반          — 이 문서는 설계다. Priority A(견적)가 먼저다
✗ AI Loop Engineering     — 성장 시스템. 첫 판매와 무관
✗ 상품 자동 생성          — 팔 물건 하나가 먼저다
✗ Pinterest 자동 발행     — 상품 없이 유입시키면 전환 0, 계정 위험만
✗ 카탈로그 · 검색 · 필터  — 상품이 1개다
✗ 회원 · 로그인 · 위시리스트
✗ 재고 시스템             — pre-order는 재고가 없다
✗ 다국어 번역 실행        — 구조만. 첫 판매에 3개 언어 불필요
✗ 모션 시스템 구현        — ADR-001: P0 사업 실패가 열려 있는 동안 보류
✗ WebGL · 3D · 커스텀 커서
✗ Rule Layer 활성화       — Atlas 실측 12행 전까지 비활성
✗ 팔레트 확정             — 실측 후 (사용자 결정 (A))
✗ 커스텀 체크아웃         — Stripe 호스팅 사용
✗ 반품 시스템             — 정책 문서가 먼저. 첫 반품 때 구현
✗ A/B 테스트              — 트래픽이 없다
✗ 관리자 UI               — 주문 1건은 사람이 본다
```

## 5.2 변경 금지 (LOCKED)

```
🔒 Character_Bible.md     v1.1 확정
🔒 Design_System.md       v1.0 확정
🔒 Brand_Bible.md
🔒 4개 Atlas 문서
```
충돌 발견 시: 재작성하지 않고 **충돌 보고 → 영향 분석 → 해소안 제시 → 승인**.

## 5.3 과도한 추상화 금지

```
✗ 상품 1개에 플러그인 아키텍처
✗ 결제사 1곳에 provider 추상화 레이어
✗ 사이즈 3개에 variant 조합 엔진
✗ 이벤트 10종에 이벤트 소싱
✗ 사용자 1명에 마이크로서비스
```
**두 번째 사례가 나타나기 전에 일반화하지 않는다.**

## 5.4 이 설계에서 의도적으로 남긴 미완성

| 미완성 | 이유 | 완성 시점 |
| --- | --- | --- |
| `Variant.measurements` = null | 실측 없음. 지어내지 않는다 | 샘플 완성 후 |
| `Product.natural_rule` = null | Atlas 실측 없음 | 12세션 후 |
| `price_amount` 미정 | 원가 미확정 | 견적 수령 후 |
| `minimum_quantity` 미정 | 손익분기 미계산 | 견적 수령 후 |
| 반품 정책 | 법무 검토 필요 | 첫 판매 전 |

**미완성을 0이나 임시값으로 채우지 않는다.** null은 정직하고, 임시값은 거짓말이 된다.

---

# 다음에 할 일

```
1. Part 1.2 또는 1.3을 공급자 2~3곳에 발송        ← 지금 바로 · 최고 레버리지
2. 회신 도착 → PriceTier 기록 → 손익분기 수량 계산
3. 계산 결과 → 판매가 결정 → PreorderRun.minimum_quantity 확정
4. 그 다음에야 빌드 착수
```

**2번이 끝나기 전에는 상품 페이지를 만들 수 없다.** 가격도 납기도 최소 수량도 견적에서 나오기 때문이다.
