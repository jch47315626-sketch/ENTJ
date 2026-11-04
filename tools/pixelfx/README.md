# 픽셀 이펙트

책략, 영웅 고유기, 무기 연출을 `fx/`에 있는 우리 픽셀 아트 이펙트로 그립니다. 대부분은 스프라이트 시트로 구워 두고,
번개나 사슬처럼 모양이 매번 다른 것은 게임 안의 pixelfx 그리기 도구(`game/src/vendor/pixelfx/`)로 실행 중에 그립니다.
이펙트는 [pixelfx](https://github.com/patch-gg/pixelfx)(MIT, © 2026 Patch, Hugo Duprez)의
그리기 도구(core)로 그렸고, 라이선스 전문은 `game/assets/fx/LICENSE-pixelfx.txt`에 있습니다.

## 시점

전장과 똑같이 **위에서 비스듬히 내려다보는 시점**으로 그립니다 (`fx/_td.js`).
- 바닥(x, y)은 찌그러뜨리지 않습니다. 바닥에 그린 원은 화면에서도 정원입니다.
- 높이 z는 화면 위쪽으로 그립니다. (x, y, z)는 화면의 (x, y - z)에 찍힙니다. 불꽃, 낙뢰, 튀는 돌, 연기가 여기에 해당합니다.
- 범위 기술은 바닥 원의 반경 `r`을 그대로 판정 반경으로 씁니다. 게임은 `판정 반경 ÷ r` 배율로 그려서 원이 판정 원과 정확히 겹칩니다.
  판정은 적의 몸이 원에 닿으면 맞는 방식이라, 원에 닿은 적이 맞습니다.

모든 이펙트는 `fx/`에 있고, 굽는 목록은 `effects.json`입니다 (키 41개).

| 무엇 | 이펙트 (`fx/`) | 맞추는 기준 |
|---|---|---|
| 무기 베기: 고려검·철검·왕검, 대도·철대도·패왕도, 백제의 대도 연속베기, 통솔 창병, 신숭겸 | `blade-arc` | 바깥 테두리 = 사거리, 펼친 각 = 무기 각도 (레벨마다 따로 구움). 조준 방향으로 돌림 |
| 태조의 검 회전베기 | `blade-arc` (360°) | 사거리 |
| 패왕의 일격 · 패왕 진격 (패기) | `blade-arc` (160°) | 사거리 240 × 범위 강화 |
| 패왕도 갈라진 땅 | `crack-zone` | 장판 반경, 조준 방향 |
| 검기·붉은 검기·법력구·빛줄기·굴러가는 바위·아군 화살 | `projectiles` (반복) | 투사체 반경이나 검기 폭, 날아가는 방향 |
| 미륵석장 연꽃 폭발 | `bursts` lotus | 폭발 반경 |
| 금강저 · 벽력금강저 번개 | 실행 중에 그림 (`game/src/render/livePixel.js`) | 실제로 맞은 적들을 잇는 선 |
| 벽력금강저 착지 | `bursts` thunderHit | 맞은 적 자리 |
| 통솔 창병 합류, 신숭겸 등장 | `bursts` arrival | 선 자리 |
| 신숭겸 순절 폭발 | `earth-slam` (불 팔레트) | 폭발 반경 190 |
| 말타기 올라타기·내리기, 철쇄로 끌려온 적 | `earth-slam` (작게) | 연출용 |
| 말발굽 불길 | `marks` hoofFire (반복) | 장판 반경 26 |
| 철쇄 사슬 | 실행 중에 그림 | 견훤의 손과 끌려오는 적 |
| 바위 던지기 가은의 장사 부서짐, 패왕쇄 내리치기 | `earth-slam` | 판정 반경 |
| 고려 신궁대 화살비 + 불길 | `bursts` arrowVolley, `fire-bloom` | 불 장판 반경 |
| 어명 / 훈요십조 | `royal-edict` | 적 발밑 봉인 |
| 호랑이 젖먹기 · 무자식이 상팔자 | `tiger-roar` | r 130 (자기 강화라 판정 없음) |
| 마구니 (도는 귀신), 마구니 폭탄 | `marks` maguni (반복), `mind-burst` | 폭탄 반경 |
| 천안 · 애꾸눈의 저주 표식과 번지는 선 | `marks` curseEye (반복), 실행 중에 그림 | 저주 시간 동안 적 머리 위 |
| 관심법 눈 (적·궁예), 홀림 표식, 파동 | `bursts` eye, `mind-wave` | 파동 = 홀리는 반경 340 × 범위 강화 |
| 독심 관심법 폭발 | `mind-burst` | 폭발 반경 |

## 다시 굽기

`fx/`의 이펙트나 `effects.json`(옵션: `r`, 팔레트, 시드, `from`/`to`/`speed`)을 고친 뒤:

```bash
git clone https://github.com/patch-gg/pixelfx /tmp/pixelfx
node tools/pixelfx/bake.mjs /tmp/pixelfx
```

`fx/*.js`가 체크아웃의 `src/fx/samhan/`으로 복사된 뒤 구워집니다. 결과는
`game/assets/fx/<키>.webp`(ffmpeg가 있으면 무손실 WebP, 없으면 PNG)와 `game/src/data/pixelFxSheets.js`입니다.
미리보기와 검사는 pixelfx 도구로 합니다: `node tools/render.mjs samhan/earth-slam --gif`, `node tools/check.mjs samhan`.

## 게임에서 쓰기

```js
import { pixelFx, arcFx } from '../render/pixelFx.js';
g.fx.push(pixelFx('slam', x, y, radius));            // radius: 판정 반경. 빼면 구운 크기 그대로
g.fx.push(pixelFx('eye', e.x, e.y, null, { follow: e, dy: -30 })); // 유닛을 따라다님
hitArc(...);                                         // 베기는 hitArc가 arcFx로 알아서 그림
```

투사체는 `drawProjectileFx`가 종류별 반복 시트로, 장판(갈라진 땅, 말발굽)은 `drawZones`가 그립니다.

## 픽셀 인물

영웅, 아군, 적, 적장 같은 사람 캐릭터는 `game/src/render/pixelUnit.js`가 그립니다. 굽지 않고, 게임이 처음 보는
모습(`look`)마다 한 번 그려서 저장해 둡니다. 그래서 `data/`에 적이나 적장을 새로 넣으면 그 `look`(옷 색, `hat`,
`weapon`, `mount`, `beard`, `cape`, `model` 등)대로 픽셀 캐릭터가 자동으로 나옵니다.

- 앞모습·뒷모습 × 걷기 4프레임을 오른쪽 기준으로 그리고, 왼쪽은 뒤집습니다. 1픽셀 외곽선을 자동으로 두릅니다.
- 무기는 따로 그려 손 위치와 휘두르는 각도를 따라 돌립니다. 말 탄 인물은 말도 4프레임으로 그립니다.
- 맞았을 때는 외곽선만 남기고 속을 하얗게 칠합니다.
- 동물(사신 보스)과 수레는 아직 원래 그림을 씁니다. `render/sprites.js`의 `PIXEL_UNITS`를 false로 하면 원래 그림으로 돌아갑니다.

## 영웅 디자인과 픽셀 짐승

- **영웅 3명**은 `pixelUnit.js`의 `HERO_BODY`에서 전용 갑옷과 옷을 그립니다. 왕건은 푸른 찰갑과 금 어깨 갑옷, 붉은 허리띠, 견훤은 붉은 끈 비늘 갑옷과 털 망토, 범 머리 허리 장식, 궁예는 황금 승복과 보라 가사, 큰 염주, 광배를 입습니다.
- **영물 24종과 사신 보스 4종**은 `game/src/render/pixelBeast.js`가 그립니다. 네발짐승, 새, 뱀, 거북 틀에 종마다 특징을 얹고, 4프레임으로 움직입니다. 사신 영물과 사신 보스는 같은 그림을 크기와 색만 달리해 씁니다. 영물은 발밑에 등급 색 고리를 둡니다.
- 메뉴의 영물 아이콘(이모지)은 그대로입니다.

## 그린 영물 그림 넣기

이미지 모델로 그린 영물 그림은 `tools/spirits/import.py`로 넣습니다.

```bash
python3 tools/spirits/import.py bat 박쥐.png bear 산곰.png
```

흰 배경을 지우고, 그림의 픽셀 한 칸 크기를 재서(재지 못하면 64칸 격자로) 진짜 작은 픽셀 그림으로 줄인 뒤
`game/assets/spirits/<id>.png`와 `game/src/data/spiritSprites.js`에 넣습니다. 그림이 있는 영물은 전장과 메뉴에서
그 그림을 쓰고, 없는 영물은 `pixelBeast.js`의 틀 그림을 그대로 씁니다. 그림은 오른쪽을 보게 그려 주세요.

## 그린 영웅·적·아군 그림 넣기

```bash
python3 tools/spirits/import.py hero:wanggeon_front 앞.png hero:wanggeon_back 뒤.png hero:wanggeon_weapon 검.png
python3 tools/spirits/import.py unit:kimak 김악.png unit:singeom_2 신검2.png unit:ally_soldier 아군창병.png
```

- `hero:` 영웅 앞·뒤·무기(무기는 손에 붙여 휘두름) → `game/assets/heroes/`
- `unit:` 적·적장(2단계는 `<id>_2`)·아군(`ally_soldier`, `ally_archer`, `ally_shin`) 한 장 → `game/assets/units/`
- 흰 배경과 그림에 박힌 가짜 투명 체크무늬(활 안쪽처럼 막힌 곳 포함)를 지우고, 64칸 픽셀 그림으로 줄입니다.
- 그림이 없는 인물은 `pixelUnit.js`가 만든 픽셀 그림 그대로 나옵니다.
