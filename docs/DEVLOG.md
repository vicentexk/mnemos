# DEVLOG — LEONIS

## Sessão 1 — Marco M1: Fatia Vertical "Kurnis" (2026-09-10)

**Status: ✅ ENTREGUE — build rodando (dev server Vite, port 5173)**

### O que foi implementado (checklist do M1 do PROMPT_MESTRE v2.2)
- [x] **Savana Kurnis em voxel**: mundo 320×320 blocos determinístico por seed, heightmap fBm, oceano a leste, lago ao sul, trilhas de terra, baobás-bloco, rochas, capim, nuvens-bloco, água animada, névoa.
- [x] **Criação de personagem**: 6 raças jogáveis (Canzaro, Marejante, Barrote, Silvário, Grevó, Nimbo) com corpo chibi voxel paramétrico (orelhas, barba, asas, boca de sapo, escamas) + bônus raciais; 12 armas iniciais em 3 famílias, cada uma com modelo 3D próprio e comportamento de combate.
- [x] **Porto-Canza**: casas, Forja (upgrade de lâmina/couraça com Cobres + Ferro-Canza), Estábulo (curar/renomear), Contratador Brais (Nota de Carga), Fogueira (salvar + curar), NPCs nomeados.
- [x] **Combate**: golpe leve/pesado, esquiva com i-frames (C), stamina compartilhada, armas de projétil (arco/besta/bumerangue ida-e-volta/serra com ricochete/corrente que puxa/chicote que puxa itens/flauta que pacifica).
- [x] **Regra da Diferença de Nível** (§5.1): multiplicadores ×0.85→×0.10 e feedback por cor de dano. Inimigo Nv.4 com NE 1.4 dói MUITO — a dança Cube World funciona.
- [x] **2 acampamentos da Corja**: Toca do Farejador (Nv.2) e Acampamento da Matilha (Nv.4), paliçada, torre, tendas, fogueira, baú de carga selada (loot por nível, prefixos regionais).
- [x] **Contrato introdutório + carga**: "O Comboio Atacado" (aceitar → saquear destroço → emboscada → entrega com recompensa e bônus Canzaro).
- [x] **Ronceiro domável via Resgate**: "O Ronceiro Ferido" (eliminar guardas → alimentar 3 ervas → vínculo 1 → montar). Galope (Shift), vínculo 1–5 funcional (galope gera vínculo; Fúria no v4; combate montado no v3), montaria nunca morre (foge ao Estábullo com HP 0).
- [x] **Jangada funcional** na costa + pier; remar com WASD só em água funda.
- [x] **Save/Load**: F5/F9 + Fogueira + autosave em marcos; localStorage (bancada) — no build .exe será arquivo em disco via Tauri (M7).
- [x] **HUD estilo Cube World**: minimapa circular com nome da região, barras HP/Stamina, feed de loot ("VOCÊ RECEBE 1 X…"), tracker de contrato, prompt de interação, números de dano projetados, telas de morte/pausa/ajuda.

### Simplificações conscientes do M1 (a documentar no SYSTEMS)
- Acampamentos limpos não resetam (no jogo final: 10 min).
- Loot é auto-equipado se melhor / convertido em Cobres (Alforje completa no M2).
- Montaria sem label 3D de nome (nome aparece no HUD/Estábulo).
- Mundo da fatia = 320×320 (o continente 4.000×4.000 com streaming entra nos M2–M4).

### Próximo passo sugerido
**Marco M2 — "A Dança das Forjas"**: Mula-fardal e Bovará na Feira, arreios forjáveis, 4 tiers de camp, Corja com Chefe de Matilha, morte com perda de carga física, e a base do streaming de chunks do continente grande.

### Dev (notas técnicas)
- Vite + TS + Three.js, zero assets externos (tudo procedural). `npm run build` passa limpo (tsc + vite).
- Módulos: `core.ts` (input/áudio/save/noise), `world.ts` (terreno/POIs/meshing), `entities.ts` (player/ronceiro), `foes.ts` (Corja/NPC/jangada/projéteis), `systems.ts` (fórmulas), `ui.ts`, `main.ts` (orquestração).
- Lore source of truth: PROMPT_MESTRE.md §3–4 (nada de lore nova foi inventada nesta sessão fora de diálogos do Brais, alinhados à bíblia).

## Sessão 2 — Polimento "Primeira Impressão" (2026-09-10)

Feedback do playtest 1: chão bugado, sprites feios (anatomia), HUD não-pixel, falta cutscene, jogabilidade travada.

### Correções
- **CHÃO**: todas as malhas agora `DoubleSide` (furo de face era backface culled por winding invertido); limite de degrau (1.15) = não sobe mais parede andando; suavização visual de Y (`visY`) mata o efeito escadinha em slope.
- **SPRITES**: personagem reconstruído no estilo Cube World da referência — cabelo em blocos (franja+mecha+topete+nuca), olhos retangulares escuros com brilho, orelhas rosadas, punhos blocudos, túnica com barra+gola+cinto com fivela, botas com sola clara. Paleta de cabelo/túnica por raça (Canzaro louro de túnica roxa = homenagem direta à imagem). Corja com esclera+pupila vermelha e punhos; Ronceiro com cascos claros, focinho, olho com esclera e cabeça que balança no galope.
- **HUD PIXEL ART**: Press Start 2P (títulos/HUD) + VT323 (texto), bundle local em /fonts (OFL); painéis com borda dupla dura, barras segmentadas, cantos retos, sombras duras, minimapa pixelated.
- **CUTSCENE INTRO**: 4 cenas voxel (naufrágio da Grão-Nau com chuva/relâmpago → o Bravo com feras de olhos acesos → Leona partindo e voltando com o filhote ao amanhecer → título + objetivo). Letterbox, capítulos, legendas, PULAR (ESC/clique), auto-avanço. Pula direto pra criação se há save.
- **FLUIDEZ**: aceleração seca (quero-parar-parou), controle aéreo total, pulo 9.4 com gravidade 26/23, lunge de ataque, esquiva mais rápida (0.36s), galope 14.5 com aceleração, câmera suavizada (pos/look com lerp exponencial) + pitch inicial melhor.

---

# SESSÃO 3 — MIGRAÇÃO 3D → 2D PIXEL ART (M2D)

> Pivot: "vamos arrumar tudo isso esta muito ruim, acredito q vamos ter q migrar um jogo para 2d pixel art de topview assim ficará mais facil" + 6 referências pixel art (ores, foods, jewelry, flora, containers). O voxel virou legenda (`src/voxel-legacy/`, fora do compile).

## O que mudou de arquitetura
- **Canvas 2D puro, zero three.js** — bundle caiu de 571 kB → **88 kB** (32 kB gzip). Sem WebGL, sem malhas, sem shaders.
- **Resolução interna baixa + integer scale**: canvas em `ceil(tela/4)` pixels (Z=4; 3 em telas pequenas) esticado com `image-rendering: pixelated`. Personagem ~10px de altura na tela = o "minusculinho" pedido.
- **Mundo 360×360 tiles de 16px = 5.760×5.760px**, um único espaço contínuo, sem loading. Terreno pré-renderizado em chunks 24×24 tiles (384px, cache LRU 80).

## Arquivos novos
| arquivo | papel |
|---|---|
| `src/pix.ts` | fábrica de pixel art procedural (registro `SPR`, paleta): chars 8×10px 4 direções × 2 frames por raça, Corja (farejador/caçador), Ronceiro (ferido + selado), 8 árvores, rochas, 7 minérios, ervas, prédios (casa/forja/estábulo/torre/tenda/paliçada/fogueira/baú/barco/destroço/carga), moeda/carne, armas, **panorama do título 240×100** e `loadExternal()` (pipeline pronto p/ sprites do usuário) |
| `src/world2d.ts` | mundo completo: costa ruidosa + lago, 10 zonas, vila (3 casas+forja+estábulo+estandarte+fogueiras), pier+barco, destroço com 3 cargas, 18 acampamentos da Corja (paliçada c/ abertura sul + torre + tendas + baú), minérios/ervas por zona, props por bioma, colisão por eixo, minimapa 1px/tile |
| `src/ui2d.ts` | **TELA DE TÍTULO** (panorama + menu), criação c/ retratos pixel 6 raças × 12 armas, HUD (barras, minimapa vivo, quest, feed, prompt contextual, título de zona), painéis (forja c/ mercado, estábulo, alforje, mapa-múndi, ajuda, pausa), diálogo, morte |
| `src/game2d.ts` | loop 2D: estados título→intro→criação→jogo; intro em 3 painéis desenhados (tempestade, praia da Corja, amanhecer da Leona) skippable; movimento WASD+mira no mouse; combate melee/arma com telegraph de inimigo e números de dano por tier; 12 armas funcionais (bumerangue volta, serra ricocheteia, corrente puxa, flauta acalma, chicote colhe); montaria (galope, fúria v4, alimentar); quests (cargas do wreck → ronceiro ferido → doma com 3 ervas); save/load F5/F9 |
| `src/core.ts` | reescrito p/ 2D: Input de mouse+teclado (sem pointer lock), áudio procedural mantido, save `leonis-m2d-1` |

## Sandbox (pedido explícito)
- **Todas as 10 zonas abertas desde o spawn** — dá pra andar até o Umbigo (Nv.12) em 2 minutos. Números de dano avisam: branco = justo, amarelo = arriscado, **cinza+☠ = parede**.
- Título de zona em cada fronteira com cor de perigo; descobrir zona dá léguas.

## Validações desta sessão
- `tsc --noEmit` limpo; `vite build` OK (88 kB).
- Smoke test do world-gen em Node: 264 ms, 18 camps, 30 minérios, 68 ervas, 29 prédios, 3.886 props, 82% terra, pathfind ronceiro→vila navegável (199 passos).
- Barco reposicionado dinamicamente na 1ª água do pier (estava spawnando em terra).

## Próximo passo (combinado)
- **Usuário manda sprites de armas/armaduras** → registro via `loadExternal(key, img, sx, sy, sw, sh)` substitui os procedurais sem tocar no jogo.

## Sessão 3b — HOTFIX (jogo parado + personagem)
- **BUG-RAIZ do "fica parado"**: `#ui-root > * { pointer-events:none }` (specificity de ID) vencia `.clickable { pointer-events:auto }` → título/criação/painéis intocáveis. Corrigido: `.clickable` e `.clickable *` agora ganham (ordem + escopo). `#intro` também virou `.clickable`.
- **BUG 2**: `hasSave()` acessava localStorage sem try/catch — em iframe sandboxado lança SecurityError e matava o `start()` antes do menu (tela preta). Blindado; `start()` inteiro agora tem try/catch com fallback pra criação; loop com try/finally (erro nunca mais congela o rAF); `window.onerror` mostra caixa vermelha de ERRO com a mensagem real.
- **PERSONAGEM REFEITO** (zoom 10x validado visualmente): 11 linhas, contorno 1px ao redor da silhueta (função `outline()` genérica — aplicada também em Corja e Ronceiro), cabelo com mecha de brilho (`shade()`), túnica com sombra própria, cinto, animação de passo com pernas alternando + bounce de 1px, perfil com face/costas da cabeça distintos. Raças com identidade: Barrote ombro-a-ombro, Silvário orelhas compridas, Grevó olhos-bolha de sapo, Nimbo 10 linhas, Marejante chapéu. Bônus de legibilidade: sprites novos ganham +1px de contorno (12×12).
- Pausa volta com ESC; retomada de animação ao parar (sem "peteleco" de frame); Ronceiro desenhado sob o herói ao montar (bounce -1px, offset -3px).
- Validação: folha de sprites rasterizada em Node (rasterizador canvas fake) → PNG 10x inspecionado antes de servir.

## Sessão 4 — MUNDO VIVO (feedback: "o mundo está meio vazio")
- **FONTES — BUG-RAIZ**: `@font-face` apontava pra `PressStart2P-Regular.ttf`/`VT323-Regular.ttf` mas os arquivos são `PressStart2P.ttf`/`VT323.ttf` → 404 silencioso, o jogo inteiro em fonte fallback. Corrigido — Press Start 2P + VT323 agora carregam de verdade.
- **PORTRAITS DOS NPCs**: atlas de 25 retratos recortado da referência do usuário (grade detectada por projeção de pixels) → `public/img/portraits.png` (240×240, 48px/tile). `dialogFace()` mostra retrato 84px pixelated na caixa de diálogo.
- **18 NPCs nomeados** espalhados: vila (Corretor Divo, Pastora Enó, Duda, Malvina), viajantes (Encapuzado, Pescador Gil, Caçadora Tlio, Nimbo Mercador, Ância) e **9 ermitas** — uma por zona, cada uma dá a dica de nível local ("Picos Nv.8: Forja 4+ ou volte"). NPCs têm aldeão pixel próprio (v/*), wander suave ao redor do ponto natal e placa de nome quando o herói se aproxima.
- **+10 casas**: 3 na vila (6 no total), estandartes e fogueira de praça, e **5 lugarejos** com fogueira comum (Hamlet de Kurnis ×2, sul de Kurnis Profundo ×2, Banhadol, Deserto, Selva).
- **FAUNA**: rebanho de ovelhas (4 manadas), veados na Selva, pássaros em 6 pontos — todos animados em 2 frames no y-sort.
- **Densidade de props +40%** (savana 0.030→0.042, selva 0.055→0.072, etc) → 5.199 props (era 3.886).
- **Panorama do título refeito**: casinhas com telhado, pássaros no céu, rebanho distante, trilha de terra serpenteante (dithered).
- QA: smoke test (39 prédios, 18 NPCs, 21 animais, gen 274 ms) + folha de sprites/panorama inspecionados em PNG antes de servir.

## Sessão 5 — CIDADE, MONTARIAS, PERÍCIAS, COMBATE 2.0 (feedback do usuário)
- **ARMASTAtlas**: 400 ícones fatiados das 4 folhas do usuário (grade detectada por projeção; fundo removido por tolerância cromática; bbox por conteúdo) → `public/img/weapons.png` + `weapons.json`. **12 armas jogáveis × 10 tiers visuais** (madeira→prata→ouro→flame) — o sprite na mão e no projétil muda com o nível da forja. Mapeamento em `WEAPON_FAM`.
- **CIDADE DO BERÇO**: Porto-Canza agora é UMA cidade grande — praça central (forja, estábulo, 3 tendas, estandarte, fogueira), 2 torres de vigia, e 18 casas em grade com quarteirões desalinhados (52 prédios no mundo). **32 NPCs** com portraits e diálogos (12 novos cidadãos: Velho Ruy, Curandeira Yara, Sasa, Guardas Tosk/Ilma, Cartógrafo Mapo, Menina Lila, Tato, Cozinheira Brasa…).
- **INVENTÁRIO (Tab)**: ficha completa — arma/nível, vida/stamina/léguas com progresso, NE, dano leve/pesado, montaria ativa + vínculo, pontos de perícia, bolsa com valores de venda por minério.
- **ÁRVORE DE PERÍCIAS (K), estilo Forager**: 20 nós em 4 ramos (Guerra/Agilidade/Ofício/Vigor), +1 ponto por nível, pré-requisitos, efeitos reais (dano, velocidade, rolamento, ímã, mineração, forja barata, vínculo 2×, regen…). Salva no save v2.
- **6 MONTARIAS + DOMADOR ABERO** (retrato do sábio): cada uma com chave própria — Ronceiro (missão), Bufelo (25 pesados), Javalina (4 carnes no curral), Corsária (chegar de barco), Roc-Clume (descobrir os Picos), Mirage (60s sobrevivendo no Umbigo). Menu do Domador mostra progresso ao vivo, permite domar/trocar montaria ativa; curral com bichos visíveis; variantes recoloridas por espécie (selada/domada).
- **COMBATE 2.0**: rolamento menor/distância curta **com cooldown 0,9s** (0,55 com perícia); **7 tipos de inimigo** com peculiaridade — Farejador (bando acelera), Batedor (manso→FURIOSO ao apanhar), Arqueiro (mantém distância e atira), Bruto (telegraph longo, golpe em área), Gundu (investida em linha, cansa depois), Miroo (cura aliados, foge), Uivo (uivo buffa o bando). Elites 1,5× em camps Nv.4+. Composição por nível de zona.
- Save → **v2** (skills, montarias, rastreadores de doma). tsc limpo; build 120 kB (43 gzip). QA visual: inimigos/montarias inspecionados em PNG.

## Sessão 6 — M3: Chefes de Zona & O Porteiro
**Meta:** fechar o arco do sandbox — um chefe por zona + fim de jogo com tela de vitória.

- **10 chefes** (defs `BOSSES`): Fareja-Mor (Berço), Dente-Velho (Kurnis), Presa-Corja (Kurnis2), Mãe dos Musgos (Selva), Marejante (Costa), Vidreiro (Deserto), Lamaçal Vivo (Banhadol), Atheros o Pico (Picos), Coração de Obsidiana (Obsidiana) e **O PORTEIRO** (Umbigo, ×2.8 — o maior sprite do jogo).
- **Covis** no mundo: totem-caveira + ossos espalhados (`b/skull`, `b/bones`), gerados longe de vila/acampamentos; ♛ no minimapa e mapa grande (dourado = vivo, cinza = morto).
- **Chefe** = sprite do kind com tint da zona (source-atop), aura pulsante, coroa ♛ flutuante, barra própria no topo, HP×6 + dano alto, slam em área com onda de choque visível, aggro/leash maiores e **enrage <35%** (×1.35 velocidade, windup ×0.7).
- **Recompensas**: +1★ de perícia garantido, cobres, minério da zona+2, carnes e **equipamento garantido acima do atual** (arma/peitoral/arreio).
- **A PORTA do Umbigo**: construction perto do centro da zona final; interagir sem matar o Porteiro → diálogo de lore ("Ela não trava. Ela apenas espera."); com o Porteiro morto → atravessar.
- **Tela de vitória**: overlay épico-solar com stats da jornada (nível, chefes X/10, tempo, cobres) + citação da Grão-Nau; "continuar explorando" mantém o sandbox.
- Persistência: `bossesKilled` + `won` no save v2; quest "OS 10 TRONOS" guia o fim de jogo.
- QA visual `docs/qa-covis.png`; bundle 129.9 kB (46.5 gz); tsc limpo.

## Sessão 7 — M4: História, Porões e Porte .exe
**Meta:** objetivo claro estilo Minish Cap (missões encadeadas), dungeons, e o jogo rodando como .exe no Windows.

- **HISTÓRIA**: Q1 carga → Q2 Ronceiro → **O TOTEM CANTOR** (matar o Fareja-Mor revela, via Malvina, que cada Guardião guarda uma **SIGILA** do velho Bravo) → **AS DEZ SIGILAS** (10 chefes + 5 porões) → **A PORTA** (10/10 destrava) → vitória. Save v2 persiste q3/densDone.
- **PORÕES (dungeons)**: 5 — Porão do Naufrágio (Berço Nv2), Gruta da Maré (Costa Nv4), Jardim Fóssil (Selva Nv5), Fornalha de Obsidiana (Nv10) e **Cripta do Navegante** (Umbigo Nv12). Entrada = buraco ◘ no mapa; interior = sala 30×24 isolada no oceano (pisos/paredes de pedra desenhados no chunk), tochas, pilares, 7–11 guardas do mix da zona + 1 ELITE junto do baú (Nv alto + loot 'x'). Baú → spoila garantida + cobres + minério/ervas; ◘ fica cinza no mapa.
- **Fluxo dungeon**: fade de teleporte 0,3s + 0,45s, guardas spawnam na chegada, morrem com o jogador (respawn limpo), cristal de saída pulsa (2 frames).
- **PORTE .EXE**: Electron v14.2.9 win64 + assets com **base relativa** (`vite build --base=./` no config) + fetch/imagens/fontes com caminhos relativos + manifest de armas via script tag (file:// não roda fetch) → `release/MNEMOS-Alpha-0.3-win64.zip` (~85MB, subir junto do commit). main.js: janela 1280×720, menu oculto, isolamento padrão.
- Bundle 138.7 kB (49.6 gz); tsc limpo; QA docs/qa-poroes.png.

## Sessão 8 — Arte do Usuário Integrada + Alpha 0.4
**Meta:** primeiro lote das 47 folhas dentro do jogo, sem blur, e armas redimensionadas.

- **Pipeline de integração**: remoção de fundo por cor (feather no alpha), detecção de componentes (scipy), picks por hue/área/posição, recorte por sprite, escala NEAREST pro tamanho do jogo, atlas `public/img/externa.png` (512×256, 32 sprites) + manifest via script tag (file://).
- **Integrado nesta rodada**: 11 árvores/plantas (green, apple, dead, deadbig, palm, pine, mush, mushP, tent, root, skulltotem), 2 ruínas brancas, portal dourado (A PORTA 2.0), buraco de porão, baú de dungeon, 4 animais (cavalo, bode, pato, jumento — 2 frames), 4 novos mobs de porão (goblin, golem, flamejante, ouriço) com mix temático por dungeon.
- **Distribuição no mundo**: ~4.800 props usando as árvores novas por bioma; ruínas brancas em Picos/Umbigo/Costa (7%).
- **FIX: armas gigantes** — drawWeaponAt desenhava ½ do sprite 48px (24px visíveis); agora desenha ⅓ (16px, ~2.5× o personagem). Arma de mão, não torre.
- **Pendências mapeadas** (próximos lotes): tiles de chão por bioma (imgs 1–12), casas/vila (13–17), mobs completos c/ animações (29–39), retratos novos (40), UI/livro/bestiário (41–47).
- tsc limpo; build 139.25 kB (49.77 gz); server 200; **release/MNEMOS-Alpha-0.4-win64.zip** (substitui a 0.3).
