# LEONIS — Os Que Voltam
### Prompt Mestre de Desenvolvimento · v2.2 · Fonte única de verdade do projeto

> **Tagline:** *"Tudo o que a humanidade tem, um Leonis trouxe."*

---

## 0. Como usar este prompt

- Este documento é a **bíblia do jogo**. Vive no workspace em `/mnemos/PROMPT_MESTRE.md`.
- Toda sessão de desenvolvimento começa com: *"Leia o PROMPT_MESTRE e execute o Marco MX."*
- Em conflito de decisões, a prioridade é: **Pilares → Lore → Sistemas → Performance**.
- Documentos derivados obrigatórios: `docs/LORE.md`, `docs/SYSTEMS.md`, `docs/ROADMAP.md`, `docs/DEVLOG.md`.
- **Regra visual dura:** qualquer arte/conceito gerado deve usar anatomia **chibi voxel estilo Cube World** (cabeça ≈ metade da altura do corpo, membros grossos e blocudos). NUNCA proporções realistas.

---

## 1. Elevator Pitch

**LEONIS** é um action-RPG 3D de mundo aberto em voxel (estética Cube World) com exploração no espírito de Breath of the Wild. A humanidade sobrevive encurralada no **Berço**, um vale-porto cercado pelo **Bravo**: um continente colossal de fauna gigantesca, biomas impossíveis e ruínas de quem tentou cruzá-lo antes. Quase ninguém sai. Quem sai — e **volta** — traz metal, remédio, sementes, mapas e bestas. Esses exploradores são os **Leonis**, a guilda que é a linha de supply da humanidade.

Você é um Leonis recruta — e escolhe quem você é: **6 raças jogáveis** e **12 armas iniciais** (do escudo com espada ao bumerangue — Seção 5.7). Seu trabalho: adentrar o Bravo, saquear acampamentos, domar montarias cada vez mais raras, comprar/construir transportes (jangadas, caravelas, carroças, dirigíveis) e **voltar carregado**. Não existe "matar o demo". Existe chegar cada vez mais longe — até o **Umbigo do Mundo**, onde espera a verdade sobre por que a humanidade está no Berço... e quem a colocou lá.

### O que torna o jogo NÃO genérico (checklist sagrado)
1. **Vencer é cartografar**: a condição de vitória é completar a **Carta-Primeira** (o mapa inteiro) e descobrir o segredo do Bravo. Boss não é o fim; o mapa é.
2. **Montarias são colecionáveis com raridade** (Comum → Mítica), cada uma uma chave de travessia — e parte delas não existe na fauna real de lugar nenhum.
3. **Veículos são progressão**: barcos, carroças e o dirigível da guilda abrem regiões que a pé são inalcançáveis.
4. **Progressão dura estilo Cube World**: nível de equipamento manda; acampamento acima do seu nível é parede.
5. **A economia é a lore**: tudo que você traz volta pro Berço e a cidade CRESC visivelmente (contrato de supply = atualização de mundo).
6. **Mundo aberto DE VERDADE**: um continente contínuo e ENORME, sem telas de carregamento — o tamanho é parte da promessa (Seção 7: Escala do Mundo).

---

## 2. Pilares de Design (invioláveis)

| # | Pilar | Significado |
|---|-------|-------------|
| P1 | **A montaria é o coração** | Coleção, raridade, vínculo e travessia. Se uma mecânica não toca montaria ou exploração, questione-a. |
| P2 | **Vencer é voltar** | Missão só conta se você voltar e entregar. O placar do jogo é o que você trouxe + o que você mapeou. |
| P3 | **Duro como Cube World** | Dificuldade se vence com preparo (gear, montaria, transporte, comida). Sem seletor de dificuldade, sem nerf. |
| P4 | **Vejo, quero, chego** | BOTW: marcos no horizonte, sem marcador de missão. Torres-Baliza revelam o mapa como nas torres de Hyrule. |
| P5 | **Nada genérico** | Zero orc/goblin/taverna padrão. Nomes, feras e facções saem do glossário canônico (Seção 12). |

---

## 3. O Mundo

### 3.1 Geografia
- **O Berço** — vale-fiorde protegido por penhascos em anel e pelos **Faróis-Guia** (fogueiras de sinal que as feras evitam). Aqui: **Porto-Canza** (Casa-Mãe da guilda) e vilas-satélite. É a única zona segura... aparentemente.
- **O Bravo** — o resto do continente. Território de megafauna, da **Corja** (saqueadores) e de ruínas de expedições que não voltaram. Dividido em 10 regiões (Seção 3.3).
- **O Umbigo do Mundo** — caldeira colossal no coração do continente. Fim de jogo.

### 3.2 A Guilda Leonis
- Fundada após o **Naufrágio da Grão-Nau** (geração fundadora: os sobreviventes que chegaram ao Bravo e perderam tudo).
- **Regra número um:** *"Quem volta, volta trazendo."* Um Leonis sem carga é meio Leonis.
- **Postos (ranks)**, desbloqueados por entregas acumuladas + Cartas de região:

| Posto | Nome | Libera |
|-------|------|--------|
| 1 | **Ferro** | Contratos na borda do Berço; jangada |
| 2 | **Bronze** | Savana/Floresta fundo; bote a vela; Feira de Montarias |
| 3 | **Prata** | Deserto/Costa; **Caravela**; rituais de doma rara |
| 4 | **Ouro** | Pântano/Cimos; carroça de carga; Obsidiana |
| 5 | **Platina** | Arquipélago/Jardim Coral; rede de tirolesas |
| 6 | **Aurora** | **Dirigível Nau-Aurora**; contratos no Umbigo; endgame |

- Contratos (quests) são **Notas de Carga**: trazer X, mapear Y, domar Z, liberar rota W. Pagam **Cobres** (moeda) + **Léguas** (XP) + pontos de Posto.

### 3.3 As 10 Regiões do Bravo

| # | Região | Bioma | Montaria assinatura | Colosso (chefe de região) |
|---|--------|-------|---------------------|---------------------------|
| 1 | **Savana Kurnis** | Savana dourada, baobás-bloco | Ronceiro | **Barrogrude** (gigante-ape da lama) |
| 2 | **Selva Petroglifa** | Floresta de pedra gravada | Cervonte | **Raiz-Mãe** (cervo-colosso de pedra) |
| 3 | **Deserto de Vidro** | Dunas vítreas, espelhos enterrados | Corredor-de-Vidro | **Miragem-Tirana** (leão de areia) |
| 4 | **Costa das Tormentas** | Penhascos, tempestade eterna | Grifo-de-Tormenta | **Faroleiro** (colosso de farol vivo) |
| 5 | **Banhadol** | Pântano, névoa, som abafado | Lutrão | **Vovó Barrenta** (sapo-montanaha) |
| 6 | **Picos Ossos** | Tundra, geleira, cidades sob gelo | Ossuaroc | **Rei Sob a Neve** |
| 7 | **Terras de Obsidiana** | Vulcânico, rios de lava | Fornalhudo | **Ferreira-Coroa** (titanessa de forja) |
| 8 | **Arquipélago Suspenso** | Ilhas flutuantes, correntes ascendentes | Nimbária | **O Menino que Não Caiu** |
| 9 | **Jardim Coral** | Mar raso bioluminescente, ruínas submersas | Serpente-Pérola | **Navegadora Afogada** |
| 10 | **Umbigo do Mundo** | Caldeira ancestral, redor branca | (secretas) | **O Pastor** (final) |

Cada região: **1 vila-avança** (Forja, Estábulo, Feira de Montarias, Contratador, Fogueira + Estaleiro/Carpintaria se costeira), **5–9 acampamentos**, **1 Torre-Baliza**, sítios de ruína/expedição morta (lore + loot) e **1 Colosso**.

### 3.4 Ruínas das Expedições Mortas (lore secundária)
Cada região tem acampamentos-abandonados de expedições passadas: diários contam o que comeu a equipe, o mapa rascunhado delas preenche parte do seu Atlas, e equipamento histórico vira **transmog**. A lore se conta por lugares, não por longas cutscenes.

---

## 4. Lore — A Espinha Dorsal

### 4.1 Linha do tempo
- **Geração Zero** — a Grão-Nau afunda perto do Bravo; ~2.000 sobreviventes desembarcam com nada. Feras, tempestade e fome matam metade no primeiro ano.
- **A Primeira Volta** — **Leona, a Carregadeira** (fundadora dos Leonis) atravessa a savana sozinha e volta com sementes, aço e um filhote domado. Nasce a guilda e o lema.
- **Era das Rotas** — gerações abrem trilhas, constroem vilas-avança e Faróis. O Bravo é empurrado para longe do Berço... mas nunca recuado de fato.
- **Presente** — as rotas antigas estão se fechando: feras maiores, acampamentos da Corja multiplicando. O Mestre-Guia da guilda chama o jogador e outros recrutas para "abrir de novo". É aí que o jogo começa.

### 4.2 A jornada do jogador
1. **Prólogo**: recruta na doca do Porto-Canza; criação de personagem (raça + arma); primeiro contrato (resgatar carga de um comboio atacado); primeira doma (um Ronceiro ferido — tutorial de vínculo).
2. **Ato 1 (Savana/Floresta)**: aprender o loop — contrato → acampamento → carga → vila → forja. Posto Bronze.
3. **Ato 2 (Deserto/Costa/Pântano/Cimos)**: transporte marítimo (bote → caravela), montarias raras, primeiras pistas de que "as feras não atacam o Berço — elas o **cerca**".
4. **Ato 3 (Obsidiana/Arquipélago/Coral)**: dirigível, montarias épicas, expedições mortas revelam que outras guildas chegaram perto do Umbigo — e VOLTARAM correndo, sem contar por quê.
5. **Ato final**: com a Carta-Primeira quase completa, o caminho do Umbigo abre.

### 4.3 O Twist final (spoiler)
> O Berço não é abrigo por sorte: as feras **nunca entraram** nele em 200 anos porque algo as impede. No Umbigo vive **O Pastor**, colosso antiquíssimo que considera a humanidade... o rebanho. Os Faróis-Guia queimam uma substância que ele fornece (as expedições mortas descobriram isso). A guilda sempre soube "em parte". **A humanidade é gado querido — e cercado.**

### 4.4 Os Finais (a vitória é uma decisão no Umbigo)
Condição para abrir o ato final: **Carta-Primeira ≥ 90%** + 8 dos 10 Colossos derrotados + Posto Aurora.

| Final | Requisito | Consequência |
|-------|-----------|--------------|
| **Contar** | Entregar os diários da expedição ao Berço | A humanidade entra em pânico e depois em êxodo: a grande caravana abandona o Berço. Liberdade bruta no Bravo. Epílogo difícil e vivo. |
| **Guardar** | Queimar os diários | O Berço nunca soube. O jogo continua com o mundo "pacificado" — e uma culpa bonita nas legendas. |
| **Pastorear** | Vínculo máximo com o Bramirinho + todos os Colossos Relidos* | O Pastor envelhece e você é chamado a substituí-lo: a maior montaria de todas é o próprio guardião do mundo. Final secreto e melancólico. |

\* **Reler** = derrotar um Colosso com o Bramirinho no grupo → em vez de morte, o Colosso "desperta" e aceita a guilda. (Requisito do final secreto.)

**Fim de jogo = %Carta + Cargas entregues + escolha final. NUNCA um combate contra "o demônio".**

---

## 5. Sistemas de Jogo

### 5.1 Progressão — "Duro como Cube World"
- **Nível de Leonis (1–50)** — ganha **Léguas** (XP de descobrimento: locais, montarias domadas, Colossos, contratos; combate dá pouco). Bônus pequenos de HP/stamina.
- **Nível de Forja (1–100, por equipamento)** — **a verdadeira força**. Armas/armaduras/arreios dropam no nível do acampamento. Upgrade **só na Forja de vila**, custando materiais do bioma + Cobres.

**Nível Efetivo (NE)** = `arma×0.6 + peitoral×0.2 + arreio×0.2` (arreio é gear — montaria participa da sua força).

#### Regra da Diferença de Nível (o portão difícil)
Com `N = nível do alvo − NE`:

| N | Seu dano | Dano recebido | Feedback |
|---|----------|---------------|----------|
| ≤ 0 | ×1.0 | ×1.0 | Números brancos |
| 1–2 | ×0.85 | ×1.2 | Números amarelos |
| 3–5 | ×0.5 → ×0.25 | ×1.75 → ×2.5 | Alvo com aura vermelha |
| ≥ 6 | ×0.10 (parede) | ×3.0 | Ícone de **caveira** sobre o alvo |

Um Reduto nível 20 com gear 12 = suicídio. Volte, suba a forja, troque de montaria, volte mais forte. Essa é a dança Cube World.

- **Morte**: perde 30% das Léguas não gastas + a **carga em andamento cai onde morreu** (corre pra recuperar, desafiador mas justo). Acampamentos não resetam por 10 min. Montaria ferida **foge** pro Estábulo mais próximo — montaria nunca morre.
- **Dificuldade única.** O "fácil" se conquista com preparo.

### 5.2 Acampamentos (a mina de ouro estilo Cube World)
Ocupados pela **Corja** (saqueadores que matam Leonis e ficam com a carga — os antagonistas humanos) ou por ninhos de feras.

| Tier | Nome | Nível | Loot garantido |
|------|------|-------|----------------|
| 1 | **Toca** | B−2 | 1 item de forja nível B−2 |
| 2 | **Acampamento** | B | 1 item nível B + comida de montaria |
| 3 | **Reduto** | B+2 | 2 itens nível B+2 + chance de receita (arreio/veículo) |
| 4 | **Fortaleza** | B+4 | 2 itens nível B+4 + material raro |
| 5 | **Bastião** (Colosso) | B+6 | Selo do Colosso + peça única de transmog |

- Layout procedural com **torre de vigia** (você foi visto → corneta → reforços), patrulhas, chefe interno e **baú de carga selada** (a carga da Corja é, literalmente, carga roubada dos Leonis — saquear de volta é lore).
- Primeiro clear garante loot; próximos têm chance decrescente (anti-farm-de-camp).
- Itens com rolls aleatórios de prefixo regional: "lâmina de Kurnis" (+dano), "lâmina do Banhadol" (+stamina).

### 5.3 Vilas (o porto seguro)
- **Forja** — upgrades por era de material: Ferro-Canza → Bronze-Fera → Vidro-Marinho → Âmbar-Sonoro → Obsidiana Viva → Aço-Aurora.
- **Estábulo** — cura, guarda 8 montarias, arreios, renomear (vínculo 4+).
- **Feira de Montarias** — compra de montarias **por raridade** (comuns/incomuns à venda; raras+ só existem na natureza). Estoque rotativo.
- **Contratador** — Notas de Carga (quests) por Posto.
- **Estaleiro/Carpintaria** (vilas costeiras) — compra/upgrada veículos (Seção 5.5).
- **Fogueira** — save, respawn, fast-travel entre fogueiras descobertas.
- **O Berço cresce**: marcos de Carga Entregue (contratos) evoluem Porto-Canza fisicamente — muralha nova, mercado novo, NPCs novos. A humanidade melhora porque VOCÊ voltou.

### 5.4 Sistema de Montarias (o coração do jogo)

#### Raridade (a coleção)
| Raridade | Cor | Como se obtém | Stats |
|----------|-----|----------------|-------|
| **Comum** | Cinza | Compra na Feira; doma fácil | Base |
| **Incomum** | Verde | Doma média ou compra rara | +1 habilidade |
| **Rara** | Azul | Ritual de doma específico | +2 habilidades, skin única |
| **Épica** | Roxo | Ritual difícil + condição de mundo | Topo de travessia |
| **Lendária** | Laranja | Missão de cadeia longa | Únicas por save |
| **Mítica** | Vermelho | Segredos/endgame | Quebram regras |

#### O Catálogo (mín. 18 espécies — algumas NÃO existem na fauna real)
| Espécie | Raridade | Região | Travessia |
|---------|----------|--------|-----------|
| Ronceiro | Comum | Savana Kurnis | Galope confiável |
| Mula-fardal | Comum | Savana/Berço | +60% alforje (a carga anda) |
| Bovará | Comum | Savana | Tanque; quebra arbustos espinhosos |
| Cervonte | Incomum | Selva Petroglifa | Salto duplo + escalada leve |
| Lutrão | Incomum | Banhadol | Nado rápido, mergulho, passo silencioso |
| Corredor-de-Vidro | Incomum | Deserto de Vidro | Sprint em areia sem afundar |
| Grifo-de-Tormenta | Rara | Costa das Tormentas | **Planeio** com correntes |
| Taurocinza | Rara | Savana/Obsidiana | Investida **quebra-muralhas** de camps |
| Ossuaroc | Rara | Picos Ossos | Quebra gelo; calor próprio |
| Víbrea-vidraceira | Rara | Deserto de Vidro | Nada dentro da areia (emboscada!) |
| Fornalhudo | Épica | Terras de Obsidiana | **Anda sobre lava** |
| Nimbária | Épica | Arquipélago Suspenso | Voo em corrente ascendente |
| Serpente-Pérola | Épica | Jardim Coral | Mergulho infinito, rasteja paredes |
| Baleia-Céu | Lendária | Costa (raro spawn aéreo) | Plataforma voadora lenta (base móvel) |
| Alce-Coroado | Lendária | Selva (missão em cadeia) | Aura de grupo: buff pra você e NPC aliados |
| Puxa-Naus | Lendária | Jardim Coral | **Reboque**: puxa sua caravela contra o vento |
| **Bramirinho** (Filhote de Colosso) | Mítica | Umbigo (secreta) | Cresce com você durante o jogo; requisito do final Pastorear |
| **Capivara Ancestral** | Mítica | ??? (segredo) | Anda devagar. É forte DEMAIS. Não questione. |

#### Doma: três rituais (nada de jogar bola)
1. **Ritual da Oferta** — comida rara do bioma + aproximação lenta/agachada. Falhou = ela foge e desconfia por um dia.
2. **O Resgate** — feras feridas pela Corja ou presas em armadilha: libertar + escoltar até vila = vínculo inicial alto + história única. (É o tutorial da Savana.)
3. **Duelo Honroso** — espécies agressivas: derrubar a 15% de HP **sem matar** e acalmar num minigame de ritmo (seguir o batimento da criatura). Raridade alta = janela mais apertada + itens de doma exigidos.

#### Vínculo (1–5)
| Vínculo | Desbloqueia |
|---------|-------------|
| 1 | Montar, galope |
| 2 | Habilidade de travessia da espécie |
| 3 | Combate montado |
| 4 | Nome próprio, habilidade ativa (**Fúria**), skin de sela |
| 5 | Aura passiva + (Colossos) condição de **Reler** |

- **Arreios são gear**: sela/peitoral/ferraduras com nível de forja (entram no NE). Forja na vila.
- **Cuidado**: alimentar/descansar/carinho dão bônus temporários; HP baixo = ela relincha e **foge** (nunca morre).

### 5.5 Veículos & Transporte (progressão de mundo)
| Veículo | Posto | Função | Onde se obtém |
|---------|-------|--------|----------------|
| **Jangada** | Ferro | Costeira rasa; primeira travessia marítima | Carpintaria (barato) |
| **Bote a Vela** | Bronze | Vela contra vento leve; 1 baú | Carpintaria |
| **Caravela** | Prata | Mar aberto; fast-travel entre **portos descobertos**; 3 baús; cabine de save | Carpintaria + receita de Reduto |
| **Carroça de Carga** | Ouro | Reboque puxado pela sua montaria mais forte: +200% alforje, **respawn móvel** e forja de campanha lenta | Feira + receita |
| **Rede de Tirolesas** | Platina | Instalável entre Torres-Baliza; descidas rápidas de montanha | Guilda |
| **Dirigível Nau-Aurora** | Aurora | Hub voador da guilda: voa entre **docas-celestes descobertas**; oficina a bordo | Endgame de exploração |

Regras: veículos não substituem montarias (fora d'água/ar eles são lentos ou parados); **algumas regiões exigem transporte** (Jardim Coral só de barco/mergulho; Arquipélago só com Nimbária ou dirigível); a Corja ataca comboios e pode ser vista pilotando jangadas roubadas (encontros navais leves).

### 5.6 Cartografia como sistema (lore = mecânica)
- **Atlas** preenche por: pé (fog of war fino), **Torres-Baliza** (revela o "cartucho" da região, estilo BOTW), mapas roubados de expedições mortas e cartas da guilda.
- **%Carta por região** alimenta o posto, os contratos e o final.
- **Bestiário** (livro 2): cada fera/montaria registrada (vista, domada, relida) com página ilustrada e nota de campo — registradas dá Léguas e bônus de doma contra a espécie.
- **Alforje** (livro 3): inventário com peso — a carga É o jogo (Pilar 2).

### 5.7 Criação de Personagem (raças + arma inicial)
O jogo começa na doca do Porto-Canza: você escolhe **raça** e **arma inicial**. Raças dão bônus PEQUENOS — quem manda é gear e montaria (P3). Cada raça tem visual chibi voxel próprio, texto de origem e falas exclusivas com NPCs do seu povo.

| Raça | Visual | Bônus pequeno | Origem |
|------|--------|----------------|--------|
| **Canzaro** | Humano do Berço | +10% Cobres em contratos | Neto de náufragos, nascido no porto |
| **Marejante** | Pele salgada, dentes de concha | +stamina; nado rápido | Sobreviveu gerações na costa do Bravo |
| **Barrote** | Baixo e troncudo, braços grossos | +HP; forja 10% mais barata | Descendente dos carpinteiros da Grão-Nau |
| **Silvário** | Esguio, orelhas longas | Corre mais; galope gasta menos stamina | Da borda da Selva Petroglifa |
| **Grevó** | Povo-sapo baixinho | Mergulho longo; imune ao som abafado | Viviam no Banhadol ANTES da Grão-Nau (mistério) |
| **Nimbo** | Minúsculo e levíssimo | Quedas não machucam; planeio curto | Vem do Arquipélago Suspenso |

> Grevós e Nimbos já viviam no Bravo quando a Grão-Nau afundou — prova viva de que o continente já foi habitável. (Fio de lore para o Umbigo.)

#### As 12 armas iniciais (3 famílias — do comum ao insano)
A arma inicial define o **estilo de começar**, não trava nada: qualquer arma pode ser comprada, achada ou aprendida depois.

**Família de Guerra (as comuns)**
| Arma | Estilo |
|------|--------|
| Espada-Escudo | Segura: parry e bloqueio |
| Machado-de-Bordo | Dano alto, lento, quebra guarda |
| Lança | Alcance; a melhor arma montada |
| Besta-Pesada | Perfura armadura; recarga lenta |

**Família de Campo (as práticas)**
| Arma | Estilo |
|------|--------|
| Arco-Longo | Distância, tiro em arco |
| Foice | Varredura em área; colhe material extra de flora |
| Adagas-Gêmeas | Velocidade; crítico pelas costas |
| Chicote-de-Carga | Puxa itens e inimigos; desarma |

**Família Estranha (as LOUCAS — assinatura do jogo)**
| Arma | Estilo |
|------|--------|
| ⭐ **Bumerangue** | Acerta na ida E na volta; prende um **saco de carga leve** e TRAZ a carga de longe (a arma Leonis por excelência). Upgrades mudam a trajetória: boomerang-guilhotina, boomerang-bússola (aponta segredos), boomerang-âncora |
| Serra-Marinheiro | Disco que ricocheteia em paredes e inimigos |
| Corrente-Âncora | Gancho: puxa inimigos; ancora em penhasco (escalada de combate) |
| Flauta-do-Pastor | Dano quase nulo; **acalma feras** e facilita domas — sinergia pura com montarias |

### 5.8 Combate
- Kit universal: leve, pesado, esquiva com i-frames curtos, parry justo, quebra de guarda, stamina compartilhada com o galope. **Cada arma modifica o kit** (a lança montada ganha investida; o bumerangue tem "pega de volta" que cancela a recarga se você agarrá-la no ar).
- Combate montado (vínculo 3): passagem com multiplicador, investidas; pior DPS que a pé, melhor mobilidade — design consciente.
- **Inimigos**: **Corja** (Farejador → Caçador → Estripador → Capanga → Chefe de Matilha), **Feras** do Bravo (megafauna), **Colossos** (boss de região, 2 fases).
- Poções raras; comida de verdade cura. Preparar-se é a dificuldade.

### 5.9 Economia
- **Cobres** (moeda) + **Léguas** (XP de exploração) + **Carga Entregue** (progressão de guilda/mundo).
- **Materiais por região**: Ferro-Canza, Bronze-Fera, Glifo-Vivo, Vidro-Marinho, Âmbar-Sonoro, Presa-Fria, Obsidiana Viva, Pluma-de-Tormenta, Coral-Cantante, Página-Umbigo.
- **Comida de montaria por bioma** (erva-de-kurnis, raiz-glifo, flor-de-vidro…) — exigida nos rituais de doma.

---

## 6. Arte, Som e Sensação (voxel estilo Cube World, SEM realismo)

### Tom: "épico ensolarado, NÃO bobo"
A FORMA é colorida e fofa (voxel chibi); o FUNDO é sério: a Corja mata de verdade, contratos falham, NPCs morrem, o inverno bate no Berço. Diálogos sem piada forçada; humor apenas em easter eggs discretos (a Capivara Ancestral). Nada de tom infantil — os perigos respeitam o jogador.

- **Anatomia chibi obrigatória**: personagens com **cabeça ≈ 40–50% da altura total**, membros grossos em blocos, mãos/pés grandes, cara fofa de poucos pixels. Montarias blocudas e rechonchudas, no estilo Cube World das referências.
- **Voxel**: blocos pequenos, flat shading, 3 tons por material, paleta MUITO saturada (verdes vivos tipo Savana Kurnis, céu azul profundo, nuvens-bloco).
- Câmera 3ª pessoa com colisão, distância generosa (contemplar horizonte é gameplay).
- **Dia/noite + clima por bioma** (tempestade eterna na Costa, cinzas na Obsidiana, névoa densa no Banhadol).
- **HUD estilo Cube World**: minimapa canto superior direito com nome da região; barra de HP/stamina embaixo; **feed de loot à direita** ("VOCÊ RECEBE 1 X RAIZ-DE-KURNIS"); quickslots canto inferior esquerdo; relógio/clima no topo. UI diegética nos livros (Atlas/Bestiário/Alforje).
- Áudio procedural (WebAudio): vento, cascos por superfície, canto das feras; tema musical por região que ganha camadas conforme o %Carta.

---

## 7. Specs Técnicas (execução aqui na Arena)

### Stack
- **Renderização/jogo**: **Vite + TypeScript + Three.js** (assets 100% procedurais — nenhum download externo).
- **Distribuição: JOGO NATIVO WINDOWS (.exe), NÃO navegador.** Empacotamento via **Tauri 2** (wrapper nativo leve, roda a mesma engine WebGL em janela própria, com saves em disco, fullscreen e gamepad). O mesmo código serve às duas frentes:
  - **Na bancada (Arena)**: preview no navegador = ambiente de desenvolvimento/teste iterativo.
  - **No produto final**: `npm run build:desktop` gera o **LEONIS.exe** + instalador. O build é feito na máquina do usuário (ou CI com GitHub Actions — workflow incluído no repositório).
- **Alvo futuro (pós-1.0, "se der certo")**: **Android** via Tauri 2 Mobile/Capacitor — mesma base de código. Por isso, desde o M1: HUD adaptável, zonas de toque planejadas e nenhuma dependência exclusiva de teclado/mouse na camada de input (abstração `InputSource`).
- Chunks de terreno 16×16 com **greedy meshing**, geometria mesclada, `InstancedMesh` para flora/props/nuvens.
- **Alvo de performance**: 60 fps em desktop mediano, <300 draw calls, fog para esconder streaming.

### Empacotamento & Distribuição (regras duras)
- **Produto final = executável Windows (.exe)** com instalador; jogo **100% offline**, sem DRM, sem conta, sem servidor.
- Saves em **arquivo no disco** (pasta de documentos do usuário, via API nativa do Tauri) no build .exe; `localStorage` apenas durante o desenvolvimento na bancada. Sempre com export/import `.json`.
- Ícone, splash e arte de janela próprios (voxel chibi, é claro).
- Cada marco do roadmap gera um build nomeado (`leonis-m1-kurnis.exe` etc.).

### Escala do Mundo (regra dura: o mapa é MUITO grande)
- **Massa de terra contínua ≈ 4.000 × 4.000 blocos** (250×250 chunks de 16×16), cercada por oceano procedural. Atravessar a galope leva ~20 min reais — é exatamente por isso que caravela, dirigível e montarias velozes importam.
- **Zero telas de carregamento**: streaming de chunks em anel ao redor do jogador, pool de geometria, fog + far-LOD (imposters de bioma no horizonte).
- Geração **determinística por seed**: o mapa canônico é o mesmo para todos (POIs à mão em JSON, 400+ cadastrados), com detalhes procedurais preenchendo o resto.
- Save eficiente: salvam-se **deltas** (baús abertos, camps limpos, montarias domadas), nunca o mundo inteiro.

### Arquitetura
```
/mnemos
  PROMPT_MESTRE.md          ← este documento
  docs/ LORE.md SYSTEMS.md ROADMAP.md DEVLOG.md
  src/
    core/    (loop fixo 60Hz, input, save, áudio procedural, eventos)
    world/   (noise de terreno, mapa de biomas, chunks, clima, POIs, água/vento p/ veículos)
    entities/(leonis, montarias, feras, Corja, NPCs, veículos)
    systems/ (doma, vínculo, forja, camps, combate, carga/berço, cartografia, posto)
    ui/      (Atlas, Bestiário, Alforje, HUD estilo CW, feed de loot)
  data/      (JSON: espécies/montarias, veículos, itens, camps, vilas, regiões, contratos, falas)
```
- Mundo: heightmap fBm + mapa de biomas (temperatura/umidade) + **POIs posicionados à mão em JSON** (vilas, camps, torres, portos, ruínas) para ritmo BOTW.
- Save: 3 slots em arquivo (via API nativa no build .exe; `localStorage` na bancada) + export/import `.json`.

### Controles (desktop, pointer-lock)
`WASD` mover · `mouse` câmera · `LMB/RMB` leve/pesado · `Shift` correr/galope · `Espaço` pulo · `E` interagir/montar/embarcar · `Q` habilidade da montaria · `1–4` habilidades · `Tab` Alforje · `M` Atlas · `B` Bestiário · `F` carinho/alimentar · `V` veículo (ancorar/soltar).

### O que este jogo NÃO é (anti-escopo)
Sem multiplayer · sem construção de base · sem texturas externas · sem marcador de missão clássico · sem seletor de dificuldade · **sem anatomia realista** · mobile só APÓS o 1.0 (Android é objetivo futuro, não do lançamento).

---

## 8. Roadmap de Marcos (cada marco termina com build RODANDO)

| Marco | Nome | Entrega |
|-------|------|---------|
| **M1** | **Fatia Vertical "Kurnis"** | Savana voxel completa; **criação de personagem (6 raças + 12 armas iniciais)**; Leonis anda/ataca/esquiva; contrato introdutório + carga; Ronceiro domável (Resgate) + galope; 1 Toca + 1 Acampamento com loot por nível; vila com Forja/Estábulo/Contratador/Fogueira; jangada funcional na costa; save/load. O jogo inteiro em miniatura. |
| **M2** | **A Dança das Forjas** | Níveis de forja + Regra da Diferença + morte com perda de carga; 4 tiers de camp; Mula-fardal e Bovará à venda; combate montado; arreios na forja; Corja completa como facção. |
| **M3** | **Mar e Mapa** | Bote a vela + Caravela + portos; Torres-Baliza + %Carta + Bestiário; Feira de Montarias com estoque rotativo; rituais de doma rara (Grifo); Deserto de Vidro e Costa das Tormentas jogáveis. |
| **M4** | **O Bravo Inteiro** | 10 regiões + 10 Colossos; carroça, tirolesas e dirigível; épicas/lendárias domáveis; Bramirinho; Umbigo do Mundo + 3 finais. |
| **M5** | **Pó e Brilho** | Áudio procedural completo, clima, dia/noite, balance final da curva dura, polish de câmera/animação, otimização. |
| **M6** | **Geração Zero (NG+)** | Novo jogo+ com o Berço evoluído, Capivara Ancestral, export de saves, tela de créditos com o Bestiário completo. |
| **M7** | **Caixas e Portas** | **Build Windows oficial: LEONIS.exe + instalador** (Tauri 2), saves em disco, fullscreen/gamepad, ícone e splash; workflow de CI gerando o .exe; protótipo de controles touch (base para o Android pós-1.0). |

### Definition of Done (por marco)
1. Roda no preview a 60fps-alvo, console limpo.
2. Sistema novo jogável de ponta a ponta (não "meia mecânica").
3. `DEVLOG.md` atualizado; lore nova entra no `LORE.md` **antes** do código.
4. Balance anotado em `SYSTEMS.md`.
5. Instruções de teste escritas para o usuário ("o que experimentar neste build").

### Diretrizes para a IA executora
- **Lore primeiro**: conteúdo novo passa pelos 5 pilares e pela bíblia; conflito com pilar = avisar antes de implementar.
- Nomes sempre do glossário canônico. Nunca "orc/goblin/dragão genérico".
- **Nunca facilitar a dificuldade por nerf global** — preparo resolve.
- Qualquer arte conceitual nova: **chibi voxel estilo Cube World, nunca realista**.
- **Tom sério-discreto**: sem piada forçada em diálogo; humor só easter egg.
- Toda sessão termina com build jogável + instruções de teste + próximo passo sugerido.

---

## 9. Glossário Canônico (termos imutáveis)

**Berço** (lar humano) · **Bravo** (o continente selvagem) · **Leonis** (a guilda/exploradores) · **Raças: Canzaro, Marejante, Barrote, Silvário, Grevó, Nimbo** · **Armas iniciais: 12 em 3 famílias (Guerra/Campo/Estranhas — o Bumerangue é a assinatura)** · **Porto-Canza** (Casa-Mãe) · **Grão-Nau** (naufrágio fundador) · **Leona, a Carregadeira** (fundadora) · **Nota de Carga** (quest) · **Cobres** (moeda) · **Léguas** (XP) · **Carga Entregue** (progresso de guilda) · **Postos: Ferro, Bronze, Prata, Ouro, Platina, Aurora** · **Corja** (antagonistas: Farejador/Caçador/Estripador/Capanga/Chefe de Matilha) · **Feras** · **Colossos** · **Reler** (despertar um Colosso) · **Toca/Acampamento/Reduto/Fortaleza/Bastião** (tiers de camp) · **Torre-Baliza** (torre de mapa) · **Faróis-Guia** (proteção do Berço) · **Forja, Estábulo, Feira de Montarias, Contratador, Estaleiro, Fogueira** (serviços) · **Atlas, Bestiário, Alforje** (livros/UI) · **Carta-Primeira** (vitória) · **Umbigo do Mundo** (endgame) · **O Pastor** (verdade) · **Bramirinho** (filhote de colosso) · **Capivara Ancestral** (não questione).

---

## 10. Primeira Instrução (copie e cole na próxima sessão)

> *"Leia `/mnemos/PROMPT_MESTRE.md` e execute o Marco M1 por completo: a Fatia Vertical 'Kurnis'. Entregue o jogo rodando no preview com instruções de teste."*

---

*LEONIS © nós dois. Quem volta, volta trazendo.*
