# 픽셀 이펙트 (pixelfx)

책략 연출 일부는 [pixelfx](https://github.com/patch-gg/pixelfx)(MIT, © 2026 Patch, Hugo Duprez)의
픽셀 아트 이펙트를 구워 만든 스프라이트 시트로 그립니다. 라이선스 전문은 `game/assets/fx/LICENSE-pixelfx.txt`.

| 키 | pixelfx 효과 | 쓰는 곳 |
|---|---|---|
| `edict` | `holy/smite` | 왕건 어명 · 훈요십조: 가까운 적 12명에게 빛의 낙뢰 |
| `slam` | `impacts/ground-slam` | 견훤 가은의 장사(바위가 부서질 때) · 패왕쇄(끌려온 적을 내리칠 때) |
| `fireRing` | `fire/fire-ring` | 왕건 고려 신궁대: 불화살이 떨어진 자리 |
| `rage` | `lightning/thunderclap` (붉은 팔레트) | 견훤 호랑이 젖먹기 발동 · 무자식이 상팔자 |
| `voidBurst` | `shadow/dark-explosion` | 궁예 독심 관심법: 홀린 적이 쓰러지며 터질 때 (동시에 4개까지) |

## 다시 굽기

`effects.json`에서 효과·구간(`from`/`to` 초)·배속(`speed`)·옵션(팔레트 등)을 고친 뒤:

```bash
git clone https://github.com/patch-gg/pixelfx /tmp/pixelfx
node tools/pixelfx/bake.mjs /tmp/pixelfx
```

`game/assets/fx/<키>.webp`(ffmpeg가 있으면 무손실 WebP, 없으면 PNG)와
`game/src/data/pixelFxSheets.js`가 새로 만들어집니다. 마지막으로 구운 pixelfx 커밋: `a841596`.

## 게임에서 쓰기

```js
import { pixelFx } from '../render/pixelFx.js';
g.fx.push(pixelFx('slam', x, y, radius / 104)); // 마지막 인자: 이펙트 1픽셀당 월드 크기
```

새 키를 쓰려면 `effects.json`에 추가하고 다시 구우면 됩니다. 1.6배보다 크게 키우면 픽셀이 뭉개져 보입니다.
