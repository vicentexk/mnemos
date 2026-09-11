# SYSTEMS — Balance do M1 (valores vivos)

## Nível Efetivo (NE)
`NE = arma×0.6 + couraça×0.2 + arreio×0.2` (sem arreio conta 1)

## Regra da Diferença de Nível
| N = alvo − NE | dano do jogador | dano recebido |
|---|---|---|
| ≤ 0 | ×1.0 | ×1.0 (números brancos) |
| 1–2 | ×0.85 | ×1.2 (amarelos) |
| 3–5 | ×0.5→×0.25 | ×1.75→×2.5 (cinza-azulados) |
| ≥ 6 | ×0.10 | ×3.0 (☠ parede) |

## Armas (dano base Nv.1, cd leve)
Espada 12/0.45 · Machado 17/0.82 · Lança 13/0.58 · Besta 16/1.15 · Arco 11/0.7 · Foice 10/0.62 (arco 180°) · Adagas 8/0.28 · Chicote 8/0.55 · Bumerangue 10/0.8 (2 fases) · Serra 11/0.72 (2 ricochetes) · Corrente 9/0.85 (puxa 5m) · Flauta 2/0.9 (pacifica 4s)
Escala por nível: dano ×(1+0.15·(nv−1)). Pesado = ×1.8 dano médio, cd ×1.7, custo 14 stamina.

## Inimigos (Corja)
| Rank | Nv | HP | Dano | Vel |
|---|---|---|---|---|
| Farejador | 2 | 70 | 9 | 3.1 |
| Caçador | 4 | 120 | 14 | 3.4 |
Telegraph de ataque 0.55s · alcance 3.2 · cd 1.6s · 30% de chance de stagger ao tomar hit em windup · aggro 13m (montado 15m) · deaggro 24m com regeneração de 50%.

## Player
HP 100 (+8/nível, +30 Barrote) · Stamina 100 (+5/nível, +25 Silvário/Marejante) · corrida 6.6→9.4 m/s · esquiva 22 sta com 0.42s de i-frames · queda: dano acima de 18 m/s (Nimbo imune + planeio).
Peitoral: redução `1/(1+0.08·(nv−1))`.

## Montaria (Ronceiro)
HP 80 · galope 13.5 (v2: ×1.1) · vínculo por galope (~3.5xp/s), erva (+5xp) · limiares v2=30, v3=80, v4=150, v5=260 · v3 combate montado (×1.15 dano) · v4 Fúria (dash 9m, 15 dmg AoE, cd 8s) · v5 ×1.05 dano.
Inimigos montados batem na montaria (×0.7). HP 0 = foge pro Estábulo (nunca morre).

## Economia
Cobres iniciais 20 · kill: 3+nv ◉ · baú Toca: 14◉ + arma Nv.2–3 + couraça Nv.1 · baú Matilha: 20◉ + **arreio Nv.4** + couraça Nv.4 + 50% arma Nv.5 + 2 ervas · forja arma: 15·nv ◉ + nv ⛓ · couraça: 12·nv ◉ + nv ⛓ (Barrote: ◉ ×0.9) · entrega q1: 60◉(×1.1 Canzaro) + 2⛓ + 40 léguas.
Léguas: kill 6+2·nv · descoberta 15 · doma 30 · contrato 40. Nível n precisa `50·n^1.5`.

## Materiais
Ferro-Canza: mineração (3 usos/rocha, 60s respawn, 1–2 ⛓ por uso) · Erva-de-Kurnis: colheita (45s respawn).
