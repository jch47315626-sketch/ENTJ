# 픽셀 이펙트

책략 연출 일부는 `fx/`에 있는 우리 픽셀 아트 이펙트를 스프라이트 시트로 구워 그립니다.
이펙트는 [pixelfx](https://github.com/patch-gg/pixelfx)(MIT, © 2026 Patch, Hugo Duprez)의
그리기 도구(core)로 그렸고, 라이선스 전문은 `game/assets/fx/LICENSE-pixelfx.txt`에 있습니다.

## 시점

전장과 똑같이 **위에서 비스듬히 내려다보는 시점**으로 그립니다 (`fx/_td.js`).
- 바닥(x, y)은 찌그러뜨리지 않습니다. 바닥에 그린 원은 화면에서도 정원입니다.
- 높이 z는 화면 위쪽으로 그립니다. (x, y, z)는 화면의 (x, y - z)에 찍힙니다. 불꽃, 낙뢰, 튀는 돌, 연기가 여기에 해당합니다.
- 범위 기술은 바닥 원의 반경 `r`을 그대로 판정 반경으로 씁니다. 게임은 `판정 반경 ÷ r` 배율로 그려서 원이 판정 원과 정확히 겹칩니다.
  판정은 적의 몸이 원에 닿으면 맞는 방식이라, 원에 닿은 적이 맞습니다.

| 키 | 이펙트 | 쓰는 곳 | 바닥 원 |
|---|---|---|---|
| `edict` / `edictBig` | `royal-edict` 금빛 봉인과 낙뢰 | 왕건 어명 / 훈요십조 (가까운 적 12명) | 적 발밑 봉인 (r 26 / 34) |
| `slam` | `earth-slam` 충격파, 균열, 튀는 돌 | 견훤 가은의 장사 · 패왕쇄 | 판정 반경 |
| `fireRing` | `fire-bloom` 번지는 불길 | 왕건 고려 신궁대 | 불 장판 반경 |
| `rage` | `tiger-roar` 붉은 충격파와 불꽃 관 | 견훤 호랑이 젖먹기 · 무자식이 상팔자 | r 130 (자기 강화라 판정 없음) |
| `voidBurst` | `mind-burst` 보랏빛 응축과 폭발 | 궁예 독심 관심법 (동시에 4개까지) | 폭발 판정 반경 |

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
import { pixelFx } from '../render/pixelFx.js';
g.fx.push(pixelFx('slam', x, y, radius)); // radius: 판정 반경. 빼면 구운 크기 그대로
```
