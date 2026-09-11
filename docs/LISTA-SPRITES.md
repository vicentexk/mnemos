# 🎨 LISTA DE SPRITES — o que mandar pra deixar o BRAVO bonito

**Formato geral:** PNG com **fundo transparente** (sem verde/quadricado por trás), escala **1×** (nós ampliamos no jogo), paleta livre mas com contorno escuro (combina com o estilo atual). Pode mandar folhas grandes com tudo — eu fatio e encaixo. Marque os nomes no chat ao mandar (ex: "folha 1 = casas, folha 2 = árvores").

---

## 🔥 PRIORIDADE 1 — o que mais muda a cara do jogo

### 1. Chões/gramas por bioma (tilesets)
Tiles **16×16**, 2 variantes de chão + 2 detalhezinhos por bioma:

| Bioma | Cores esperadas |
|---|---|
| Savana (Berço) | verde-oliva + dourado seco |
| Selva | verde profundo + musgo |
| Costa | areia clara + grama salgada |
| Deserto | areia + areia queimada |
| Banhadol | lodo + água rasa |
| Picos | neve + rocha cinza-azulada |
| Obsidiana | cinza-chumbo + roxo volcânico |
| Umbigo | pálido esverdeado + cinza-fantasma |

→ ~32 tiles 16×16. **Água também**: 2 tiles 16×16 (2 frames de onda).

### 2. Casas e construções da vila (top-view ¾, telhado visível)
- **Casa pequena** 48×48 (2 variantes de cor de telhado)
- **Casa média** 64×56 (2 variantes)
- **Casa grande** 80×64
- **FORJA** 64×48 (com bigorna/fornalha na frente)
- **ESTÁBULO/CURRAL** 80×56 (com cerca)
- **TORRE de vigia** 40×80
- **Muro/paliçada** reta 16×16 (repetível) + portão 32×24

### 3. Árvores (48×56 cada, copa acima do tronco)
- Acácia da savana · Selva grande (64×72) · Pinheiro nevado · Palmeira · Seca do deserto · Morta/queimada (Obsidiana) · Árvore-pálida (Umbigo) → **7 árvores**

## ⚔️ PRIORIDADE 2 — personalidade

### 4. Os 10 CHEFES (sprites únicos, 32×32, 2 frames de andar cada)
Com cara de LEVIATÃ de BotW: Fareja-Mor (farejador alfa), Dente-Velho, Presa-Corja, Mãe dos Musgos, Marejante, Vidreiro, Lamaçal Vivo, **Atheros o Atherosaurus**, Coração de Obsidiana e **O PORTEIRO** (este pode ser 48×64, é o final).

### 5. Porões (dungeons)
- **Baú de porão dourado/antigo** 24×16 (fechado + aberto)
- **Sarcófago/trono** 32×32 (p/ Cripta)
- **10 ÍCONES DE SIGILA** 12×12 (um por zona: dente, pena, chama, onda…) — uso no HUD/missão/vitória

### 6. Retratos (48×48) dos novos falantes
Malvina já tem; faltam: **O PORTEIRO** (se ele falar), o guardião da Cripta, e versões "enfurecidas" dos chefes (opcional).

## ✨ PRIORIDADE 3 — polimento

### 7. UI
- Painel/moldura de madeira 9-slice (qualquer tamanho, eu fatio)
- Barra de vida/stamina ornada (128×16)
- Ícones de recursos 12×12: erva, carne, cobre (◉), os 6 minérios, erva de montaria
- Mapa: moldura de pergaminho

### 8. Extras de mundo
- Pedras/formações 24×16 (4 variantes)
- Flores/tufos de capim 8×8 (6 variantes)
- Cerca de curral 16×16 + cocho
- Barco melhorado 40×28 (2 frames de remada)
- **Logo MNEMOS** (p/ tela de título e ícone do .exe — pode ser 128×128)
- Banner da história p/ intro (opcional, 320×180)

---

**Resumo rápido pra copiar:** ① 32 tiles de chão + 2 de água · ② 8-10 construções + muro · ③ 7 árvores · ④ 10 chefes 32×32 · ⑤ baú/sarcófago + 10 sigilas · ⑥ 2-3 retratos · ⑦ painel de UI + ícones · ⑧ pedras/flores/cerca/logo.

*O que já está coberto pelo jogo hoje: personagens 6px, montarias, inimigos comuns, armas (seu atlas!), retratos da vila, covis, porões (pisos procedurais).* — cada folha sua que entrar substitui o procedural equivalente na hora.
