"use strict";
/* ─────────────────────────────────────────────────────────────
   Upwell — the game: a run (four worlds of three levels, then the
   boss), the hero and its buttons, enemies, stomps and combos, coins,
   hearts, rooms behind bubbles, upgrades and unlocks; the UI, input,
   layout and the loop. Loaded last, after src/gum.js and src/world.js.
   ───────────────────────────────────────────────────────────── */

// ── Words ────────────────────────────────────────────────────
const STR = {
  en: {
    hintKeys: '← → run · Space jump', hintMouse: '← → run · Space jump', hintTouch: 'Drag to run · tap to jump', play: 'Play',
    hard: 'Hard mode', world: 'World {n}', pick: 'Pick an upgrade', dead: 'Run over', won: 'You made it out!',
    tapJump: 'Tap to jump', continue: 'Continue', newRun: 'New run', keyJump: 'Space to jump', bonus: 'Bonus', sec: 's', bonusGot: 'Bonus: +{n} coins', bonusDone: 'Bonus done!', double: '×2 for an ad', next: 'Next', timeUp: 'Time!', caught: 'Caught!', starLine: 'Coins {c}', news: 'New: {n}', dark: 'darkness',
    seen_moss: 'Moss holds you: a place to rest', seen_rubber: 'Rubber throws you off', seen_ice: 'Ice is slippery: nothing sticks',
    seen_crumble: 'It crumbles: keep moving', seen_spring: 'Springs throw you high', seen_fire: 'The fire grows while you stand still!',
    seen_hedgehog: "Don't stomp a hedgehog: it pricks!", seen_crawler: 'Land on enemies from above!', seen_wallK: '↓ lets go of a wall', seen_wallT: 'Flick down to let go', seen_wallS: 'Pull down to let go', seen_crouchK: '↓ then Space: a high jump', seen_crouchS: 'Pull down, then tap: high jump', seen_cage: 'Someone is locked in! Touch the cage', seen_crack: 'A cracked block: hit it from below!', arena: 'Arena! Beat them all', arenaWave: 'Wave {n}!', arenaWon: 'Arena cleared! +{n}', seen_trader: 'A trader: touch the thing to buy it', freedCoins: '+{n} coins', freedHeart: '+1 heart', moti: 'Aunt Moti:\n{s}', seen_shell: 'Stomp a shell and it rolls into the others', seen_spitter: 'Spitters lob blobs at you: dodge',
    seen_splitter: 'A splitter breaks in two', seen_chaser: 'A chaser follows you on its wall',
    got_fizz: 'Fizz! You shoot by yourself · {s} s', got_smash: 'Helmet! Jumps smash blocks · {s} s', got_rainbow: 'Rainbow! Nothing hurts, enemies pop · {s} s', got_grow: 'Giant! You break blocks, enemies pop · {s} s',
    reviveQ: 'One more go?', revive: 'Revive', reviveCost: 'Costs {n} · you have {c}', giveUp: 'No, finish',
    height: 'Climbed', coins: 'Coins', kills: 'Enemies', combo: 'Best combo', reached: 'Reached', unlocked: 'Unlocked', hardOpen: 'Hard mode is open!',
    again: 'Again', menu: 'Menu', resume: 'Resume', paused: 'Paused', comboPay: 'Combo ×{n}  +{c}', comboHp: '+1 heart', poor: 'Need {n} more coins',
    noNeed: 'Not needed now', rotate: 'Turn your phone upright', sold: 'sold', free: 'free', shop: 'Shop', treasure: 'Stash', bossLeft: '{n} more!', bossHint: 'Dazed! Land on its head!', m: 'm',
    nogl: 'This game needs WebGL 2. Please try another browser.', sound: 'Sound', shake: 'Shake', on: 'on', off: 'off', ctrl: 'Controls', ctrlKeys: 'buttons', ctrlStick: 'stick',
    hintStick: 'Lean to run · tap to jump', lang: 'Language',
    random: 'Random run', reviveHere: 'Go on from here · {n}', cleared: 'Level cleared!', worldDone: 'World cleared!', soon: 'World {n} is on its way', worldNext: 'World {n} is open!', dead_fire: 'Toasted!', dead_spikes: 'Ouch, spikes!', dead_fall: 'Splat!', dead_enemy: 'Too sour!', dead_icicle: 'Bonk!', dead_train: 'Choo-choo!', map: 'Map', bossHow: 'Dodge its dive, then land on it', motiReads: 'Aunt Moti reads:', got_swarm: 'Swarm! Your crowd smashes everything · {s} s', seen_worm: 'Stomp the knot, not the tubes!', seen_skull: 'Skulls lunge up close. Stomp them first!', seen_spot: 'A liquid spot: dive in, fall down!', under: 'Flip side: fall down!', back: 'Back up, and higher!', daily: 'Daily well', dailyBest: "Today's best: {n} m", board: 'Today, around you', mark: 'Day {n} of 7 this week', markPay: 'Day {n} of 7: +{c} coins!', week: 'This week', synergy: 'Synergy! {n}', book: 'Book', bookUp: 'Upgrades', bookCandy: 'Candies', bookFoe: 'Enemies', bookBoss: 'Bosses', bookTap: 'Tap one to read it', unknown: 'Not met yet', endless: 'Endless', loop: 'Round {n}: harder!', tierOpen: 'Hard mode {n} is open!', miniSpit: 'A fat spitter!',
  },
  es: {
    hintKeys: '← → correr · Espacio saltar', hintMouse: '← → correr · Espacio saltar', hintTouch: 'Arrastra para correr · toca para saltar', play: 'Jugar',
    hard: 'Modo difícil', world: 'Mundo {n}', pick: 'Elige una mejora', dead: 'Fin de la partida', won: '¡Lograste salir!',
    tapJump: 'Toca para saltar', continue: 'Continuar', newRun: 'Nueva partida', keyJump: 'Espacio para saltar', bonus: 'Bonus', sec: 's', bonusGot: 'Bonus: +{n} monedas', bonusDone: '¡Bonus superado!', double: '×2 con un anuncio', next: 'Siguiente', timeUp: '¡Tiempo!', caught: '¡Te alcanzó!', starLine: 'Monedas {c}', news: 'Nuevo: {n}', dark: 'oscuridad',
    seen_moss: 'El musgo te sujeta: descansa', seen_rubber: 'La goma te lanza lejos', seen_ice: 'El hielo resbala: nada se pega',
    seen_crumble: 'Se desmorona: no te pares', seen_spring: 'Los resortes te lanzan alto', seen_fire: '¡El fuego crece si te quedas quieto!',
    seen_hedgehog: 'No pises al erizo: ¡pincha!', seen_crawler: '¡Cae sobre los enemigos desde arriba!', seen_wallK: '↓ te suelta de la pared', seen_wallT: 'Desliza abajo para soltarte', seen_wallS: 'Tira abajo para soltarte', seen_crouchK: '↓ y Espacio: salto alto', seen_crouchS: 'Abajo y toca: salto alto', seen_cage: '¡Alguien está encerrado! Toca la jaula', seen_crack: 'Bloque agrietado: ¡golpéalo desde abajo!', arena: '¡Arena! Derrótalos a todos', arenaWave: '¡Oleada {n}!', arenaWon: '¡Arena superada! +{n}', seen_trader: 'Un vendedor: toca el objeto para comprarlo', freedCoins: '+{n} monedas', freedHeart: '+1 corazón', moti: 'Tía Moti:\n{s}', seen_shell: 'Pisa un caparazón y rodará contra los demás', seen_spitter: 'Los escupidores te lanzan bolas: esquiva',
    seen_splitter: 'El divisor se parte en dos', seen_chaser: 'El perseguidor te sigue por su pared',
    got_fizz: '¡Burbujas! Disparas solo · {s} s', got_smash: '¡Casco! Tus saltos rompen bloques · {s} s', got_rainbow: '¡Arcoíris! Nada duele, los enemigos revientan · {s} s', got_grow: '¡Gigante! Rompes bloques, los enemigos revientan · {s} s',
    reviveQ: '¿Otro intento?', revive: 'Revivir', reviveCost: 'Cuesta {n} · tienes {c}', giveUp: 'No, terminar',
    height: 'Altura', coins: 'Monedas', kills: 'Enemigos', combo: 'Mejor combo', reached: 'Llegaste a', unlocked: 'Desbloqueado', hardOpen: '¡Modo difícil desbloqueado!',
    again: 'Otra vez', menu: 'Menú', resume: 'Seguir', paused: 'Pausa', comboPay: 'Combo ×{n}  +{c}', comboHp: '+1 corazón', poor: 'Faltan {n} monedas',
    noNeed: 'Ahora no hace falta', rotate: 'Pon el móvil en vertical', sold: 'vendido', free: 'gratis', shop: 'Tienda', treasure: 'Escondite', bossLeft: '¡{n} más!', bossHint: '¡Aturdido! ¡Salta en su cabeza!', m: 'm',
    nogl: 'Este juego necesita WebGL 2. Prueba otro navegador.', sound: 'Sonido', shake: 'Temblor', on: 'sí', off: 'no', ctrl: 'Control', ctrlKeys: 'botones', ctrlStick: 'joystick',
    hintStick: 'Inclina para correr · toca para saltar', lang: 'Idioma',
    random: 'Partida al azar', reviveHere: 'Seguir desde aquí · {n}', cleared: '¡Nivel superado!', worldDone: '¡Mundo superado!', soon: 'El mundo {n} está en camino', worldNext: '¡El mundo {n} está abierto!', dead_fire: '¡Tostado!', dead_spikes: '¡Ay, pinchos!', dead_fall: '¡Plaf!', dead_enemy: '¡Qué ácido!', dead_icicle: '¡Bonk!', dead_train: '¡Chu-chú!', map: 'Mapa', bossHow: 'Esquiva su caída y salta encima', motiReads: 'La tía Moti lee:', got_swarm: '¡Enjambre! Tu pandilla lo rompe todo · {s} s', seen_worm: '¡Pisa el nudo, no los tubos!', seen_skull: 'Las calaveras se lanzan de cerca. ¡Písalas antes!', seen_spot: 'Una mancha líquida: ¡entra y cae!', under: '¡Al revés: cae!', back: '¡De vuelta, y más arriba!', daily: 'Pozo del día', dailyBest: 'Lo mejor de hoy: {n} m', board: 'Hoy, a tu alrededor', mark: 'Día {n} de 7 esta semana', markPay: '¡Día {n} de 7: +{c} monedas!', week: 'Esta semana', synergy: '¡Sinergia! {n}', book: 'Libro', bookUp: 'Mejoras', bookCandy: 'Caramelos', bookFoe: 'Enemigos', bookBoss: 'Jefes', bookTap: 'Toca uno para leerlo', unknown: 'Aún sin descubrir', endless: 'Sin fin', loop: '¡Vuelta {n}: más difícil!', tierOpen: '¡Modo difícil {n} desbloqueado!', miniSpit: '¡Un escupidor gordo!',
  },
  pt: {
    hintKeys: '← → correr · Espaço pular', hintMouse: '← → correr · Espaço pular', hintTouch: 'Arraste para correr · toque para pular', play: 'Jogar',
    hard: 'Modo difícil', world: 'Mundo {n}', pick: 'Escolha uma melhoria', dead: 'Fim da partida', won: 'Você conseguiu sair!',
    tapJump: 'Toque para pular', continue: 'Continuar', newRun: 'Nova partida', keyJump: 'Espaço para pular', bonus: 'Bônus', sec: 's', bonusGot: 'Bônus: +{n} moedas', bonusDone: 'Bônus concluído!', double: '×2 com um anúncio', next: 'Próximo', timeUp: 'Tempo!', caught: 'Pegou você!', starLine: 'Moedas {c}', news: 'Novo: {n}', dark: 'escuridão',
    seen_moss: 'O musgo segura você: descanse', seen_rubber: 'A borracha arremessa você', seen_ice: 'O gelo escorrega: nada gruda',
    seen_crumble: 'Ele desmorona: não pare', seen_spring: 'As molas jogam você alto', seen_fire: 'O fogo cresce se você ficar parado!',
    seen_hedgehog: 'Não pise no ouriço: ele espeta!', seen_crawler: 'Pule nos inimigos por cima!', seen_wallK: '↓ solta da parede', seen_wallT: 'Deslize para baixo para soltar', seen_wallS: 'Puxe para baixo para soltar', seen_crouchK: '↓ e Espaço: pulo alto', seen_crouchS: 'Puxe para baixo e toque: pulo alto', seen_cage: 'Alguém está preso! Toque na gaiola', seen_crack: 'Bloco rachado: bata nele por baixo!', arena: 'Arena! Derrote todos', arenaWave: 'Onda {n}!', arenaWon: 'Arena vencida! +{n}', seen_trader: 'Um vendedor: toque no item para comprar', freedCoins: '+{n} moedas', freedHeart: '+1 coração', moti: 'Tia Moti:\n{s}', seen_shell: 'Pise num casco e ele rola nos outros', seen_spitter: 'Os cuspidores atiram bolas: desvie',
    seen_splitter: 'O divisor se parte em dois', seen_chaser: 'O perseguidor segue você pela parede',
    got_fizz: 'Gasosa! Você atira sozinho · {s} s', got_smash: 'Capacete! Pulos quebram blocos · {s} s', got_rainbow: 'Arco-íris! Nada machuca, inimigos estouram · {s} s', got_grow: 'Gigante! Você quebra blocos, inimigos estouram · {s} s',
    reviveQ: 'Mais uma chance?', revive: 'Reviver', reviveCost: 'Custa {n} · você tem {c}', giveUp: 'Não, encerrar',
    height: 'Altura', coins: 'Moedas', kills: 'Inimigos', combo: 'Melhor combo', reached: 'Chegou a', unlocked: 'Desbloqueado', hardOpen: 'Modo difícil liberado!',
    again: 'De novo', menu: 'Menu', resume: 'Continuar', paused: 'Pausado', comboPay: 'Combo ×{n}  +{c}', comboHp: '+1 coração', poor: 'Faltam {n} moedas',
    noNeed: 'Não precisa agora', rotate: 'Vire o celular na vertical', sold: 'vendido', free: 'grátis', shop: 'Loja', treasure: 'Esconderijo', bossLeft: 'Mais {n}!', bossHint: 'Atordoado! Pule na cabeça!', m: 'm',
    nogl: 'Este jogo precisa de WebGL 2. Tente outro navegador.', sound: 'Som', shake: 'Tremor', on: 'sim', off: 'não', ctrl: 'Controle', ctrlKeys: 'botões', ctrlStick: 'joystick',
    hintStick: 'Incline para correr · toque para pular', lang: 'Idioma',
    random: 'Partida aleatória', reviveHere: 'Continuar daqui · {n}', cleared: 'Fase concluída!', worldDone: 'Mundo concluído!', soon: 'O mundo {n} está a caminho', worldNext: 'O mundo {n} está aberto!', dead_fire: 'Tostado!', dead_spikes: 'Ai, espinhos!', dead_fall: 'Ploft!', dead_enemy: 'Azedou!', dead_icicle: 'Bonk!', dead_train: 'Piuí!', map: 'Mapa', bossHow: 'Desvie do mergulho e pule em cima', motiReads: 'A tia Moti lê:', got_swarm: 'Enxame! Sua turma quebra tudo · {s} s', seen_worm: 'Pise no nó, não nos tubos!', seen_skull: 'Caveiras atacam de perto. Pise primeiro!', seen_spot: 'Uma mancha líquida: entre e caia!', under: 'Avesso: caia!', back: 'De volta, e mais alto!', daily: 'Poço do dia', dailyBest: 'Melhor de hoje: {n} m', board: 'Hoje, ao seu redor', mark: 'Dia {n} de 7 nesta semana', markPay: 'Dia {n} de 7: +{c} moedas!', week: 'Esta semana', synergy: 'Sinergia! {n}', book: 'Livro', bookUp: 'Melhorias', bookCandy: 'Doces', bookFoe: 'Inimigos', bookBoss: 'Chefes', bookTap: 'Toque em um para ler', unknown: 'Ainda não encontrado', endless: 'Sem fim', loop: 'Volta {n}: mais difícil!', tierOpen: 'Modo difícil {n} liberado!', miniSpit: 'Um cuspidor gordo!',
  },
  ja: {
    hintKeys: '← → はしる · スペース ジャンプ', hintMouse: '← → はしる · スペース ジャンプ', hintTouch: 'ドラッグで はしる · タップで ジャンプ', play: 'プレイ',
    hard: 'むずかしい モード', world: 'ワールド {n}', pick: 'パワーアップを えらぼう', dead: 'ゲームオーバー', won: 'ぬけだした！',
    tapJump: 'タップで ジャンプ', continue: 'つづきから', newRun: 'はじめから', keyJump: 'スペースで ジャンプ', bonus: 'ボーナス', sec: 'びょう', bonusGot: 'ボーナス: +{n} コイン', bonusDone: 'ボーナス クリア！', double: 'こうこくで ×2', next: 'つぎへ', timeUp: 'タイムアップ！', caught: 'つかまった！', starLine: 'コイン {c}', news: 'NEW: {n}', dark: 'くらやみ',
    seen_moss: 'コケに くっつける: ひとやすみ', seen_rubber: 'ゴムは はねかえす', seen_ice: 'こおりは すべる: くっつけない',
    seen_crumble: 'くずれる: とまるな', seen_spring: 'バネで たかく とべる', seen_fire: 'とまると ほのおが せまる！',
    seen_hedgehog: 'ハリネズミは ふむな: チクッ！', seen_crawler: 'てきは うえから ふもう！', seen_wallK: '↓で かべから はなれる', seen_wallT: 'したへ フリックで はなれる', seen_wallS: 'したへ たおして はなれる', seen_crouchK: '↓から スペース: ハイジャンプ', seen_crouchS: 'したへ たおして タップ: ハイジャンプ', seen_cage: 'だれか つかまってる！ おりに さわろう', seen_crack: 'ひびわれ ブロック: したから たたこう！', arena: 'アリーナ！ ぜんいん たおせ', arenaWave: 'ウェーブ {n}！', arenaWon: 'アリーナ クリア！ +{n}', seen_trader: 'しょうにん: しなものに さわって かおう', freedCoins: '+{n} コイン', freedHeart: 'ハート +1', moti: 'モチおばさん:\n{s}', seen_shell: 'こうらを ふむと ころがって ぶつかる', seen_spitter: 'ペッペは たまを とばす: よけろ',
    seen_splitter: 'ブンレツは ふたつに わかれる', seen_chaser: 'オイカケは かべを つたって おってくる',
    got_fizz: 'シュワシュワ！ じどうで うつ · {s} びょう', got_smash: 'ヘルメット！ ジャンプで ブロックを こわす · {s} びょう', got_rainbow: 'にじ！ むてき、てきは はじける · {s} びょう', got_grow: 'きょだいか！ ブロックを こわし、てきは はじける · {s} びょう',
    reviveQ: 'もういちど？', revive: 'ふっかつ', reviveCost: 'ひつよう {n} · もってる {c}', giveUp: 'いいえ、おわる',
    height: 'のぼった たかさ', coins: 'コイン', kills: 'たおした てき', combo: 'さいこう コンボ', reached: 'とうたつ', unlocked: 'かいほう', hardOpen: 'むずかしい モードが あそべる！',
    again: 'もういちど', menu: 'メニュー', resume: 'つづける', paused: 'ポーズ', comboPay: 'コンボ ×{n}  +{c}', comboHp: 'ハート +1', poor: 'コインが あと {n} たりない',
    noNeed: 'いまは いらない', rotate: 'スマホを たてに してね', sold: 'うりきれ', free: 'ただ', shop: 'ショップ', treasure: 'かくしべや', bossLeft: 'あと {n}！', bossHint: 'ふらふら！ あたまに のれ！', m: 'm',
    nogl: 'この ゲームには WebGL 2 が ひつようです。 べつの ブラウザで ためしてね。', sound: 'サウンド', shake: 'ゆれ', on: 'オン', off: 'オフ', ctrl: 'そうさ', ctrlKeys: 'ボタン', ctrlStick: 'スティック',
    hintStick: 'かたむけて はしる · タップで ジャンプ', lang: 'ことば',
    random: 'ランダム プレイ', reviveHere: 'ここから つづける · {n}', cleared: 'ステージ クリア！', worldDone: 'ワールド クリア！', soon: 'ワールド {n}は じゅんびちゅう', worldNext: 'ワールド {n}が ひらいた！', dead_fire: 'こげた！', dead_spikes: 'トゲ いたい！', dead_fall: 'ベチャ！', dead_enemy: 'すっぱい！', dead_icicle: 'ゴツン！', dead_train: 'ガタンゴトン！', map: 'マップ', bossHow: 'おちてくるのを よけて、うえから ふもう', motiReads: 'モチおばさんが よむ:', got_swarm: 'むれ！ なかまが ぜんぶ こわす · {s} びょう', seen_worm: 'むすびめを ふめ、くだは さけろ！', seen_skull: 'ドクロは ちかくで とびかかる。さきに ふめ！', seen_spot: 'えきたいの しみ: はいって おちろ！', under: 'うらがわ: おちろ！', back: 'もどった、もっと うえへ！', daily: 'きょうの いど', dailyBest: 'きょうの ベスト: {n} m', board: 'きょうの まわり', mark: 'こんしゅう {n}/7 にち', markPay: '{n}/7 にち: +{c} コイン！', week: 'こんしゅう', synergy: 'シナジー！ {n}', book: 'ずかん', bookUp: 'パワーアップ', bookCandy: 'キャンディ', bookFoe: 'てき', bookBoss: 'ボス', bookTap: 'さわって よもう', unknown: 'まだ みつけてない', endless: 'エンドレス', loop: 'しゅう {n}: もっと むずかしい！', tierOpen: 'むずかしい モード {n} が あそべる！', miniSpit: 'でっかい ペッペ！',
  },
};
let lang = 'en';
const t = (k) => (STR[lang] && STR[lang][k]) || STR.en[k];
const tf = (k, o) => t(k).replace(/\{(\w+)\}/g, (_, n) => o[n]);
const L2 = (o) => o[lang] || o.en;
const LANGS = [['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['ja', '日本語']];   // each by its own name
const detectLang = () => { const l = ((ads.ok && bridge.platform.language) || navigator.language || 'en').slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };   // the platform's (Playgama checklist), else the browser's; English by default

// ── Save ─────────────────────────────────────────────────────
// What outlives a run: best climb, coins of all runs (they unlock colours),
// wins (the first one opens hard mode) and the chosen look.
const SAVE_KEY = 'upwell.save';
// Kept through the Playgama Bridge's storage (its checklist: never localStorage itself), the whole of it under one key in
// one call; without the Bridge (it did not load) in localStorage. Laid over these defaults at boot (see loadSave).
const save = { v: 2, best: 0, bank: 0, wins: 0, runs: 0, color: PALETTE[0].id, hard: false, seen: {}, stick: true, camp: null };   // seen: hints shown once; stick: touch by a stick, not the keys
// The campaign's progress (save v2): the first level not cleared yet (open), each level's best stars, the coins carried (one
// purse for all of it) and each world's upgrades (its build: kept for its levels played again). A v1 save had none: a
// run's progress stays in save.run, for the random run.
const campFresh = () => ({ last: 1, stars: [], wallet: 0, builds: [], fails: {}, runes: [] });   // runes: the worlds whose tapestry is seen   // fails: the losses running at a boss, by its level   // last: the level played last
const met = (kind, id) => { const b = save.book = save.book || {}; const k = b[kind] = b[kind] || {}; if (!k[id]) { k[id] = 1; persist(); } };   // into the book
// The daily well (the plan after the sandbox): a random run whose levels are the day's, the same for everyone (the day by
// the platform's clock when it has one: a device's may be set wrong). Each day's best is kept (save.days); three medals
// stand at fixed heights, worlds 1-3 done, not at a rank among strangers (the digest §6).
const MEDALS = [114, 264, 450];
const BOARD = 10000;   // Playgama's boards keep no days: a score is its day × BOARD + the day's best height, so today's lead and the days before sink under them
let today = Math.floor(Date.now() / 86400000);
// The week's marks (the plan after the sandbox; the digest §6: a streak back to zero punishes whoever missed a day): a day
// played (its first level cleared) is a mark; the week's card fills in any order, a missed day loses nothing, and it pays at 3,
// 5 and 7. A new week (from a Monday) starts a new card.
const MARKS = { at: [3, 5, 7], pay: [30, 60, 120] };
const weekOf = (day) => Math.floor((day + 3) / 7);
const weekCard = () => (save.marks && save.marks.week === weekOf(today) ? save.marks : { week: weekOf(today), days: [] });
const daySeed = (day, w, s, b) => (Math.imul((day ^ 0x9e3779b9) >>> 0, 2654435761) ^ (w * 97 + s * 13 + (b ? 7 : 0))) >>> 0;
// The campaign's map (the user: each world a grid of 3 × 10, a route up it to choose, as in Slay the Spire): a world's first level
// alone at its foot, eight tiers of three over it, then its boss. Level i is world w, tier s, column c (i = w·30 + s·3 + c; the first
// and the boss in the middle). The middle one is the tier's recipe; the left the same calmer, the right richer and fiercer (SIDE:
// its enemies and fire by so much, a stash, a bonus race's time), each on a seed of its own. A level leads up to the one over it;
// tier by tier in turn, the middle one out to both sides or the sides in to the middle (ups). A world opens with the last one's boss.
const SIDE = [{ foes: 0.7, fire: 0.92, pair: 0, seed: 7919, time: 4 }, null, { foes: 1.3, fire: 1.06, pair: 0.12, seed: 104729, time: -2 }];
const CAMP_LEN = CAMPAIGN.length * 30, CAMP_END = CAMP_LEN - 2;   // CAMP_END: the last world's boss
const sides = new Map();
const campAt = (i) => {
  const w = Math.floor(i / 30), s = Math.floor((i % 30) / 3), c = i % 3, rc = CAMPAIGN[w].levels[s], k = SIDE[c];
  if (!k || rc.boss) return { w, s, c, rc };
  const seed = (rc.sides && rc.sides[c >> 1]) || rc.seed + k.seed;   // a recipe's `sides`: its two sides' own seeds, where the bot found the plain ones poor
  if (!sides.has(i)) sides.set(i, Object.assign({}, rc, rc.bonus != null ? { seed, time: rc.time + k.time }
    : { seed, foes: rc.foes * k.foes, fire: rc.fire * k.fire, pair: k.pair && (rc.pair || 0) + k.pair, stash: c === 2 ? Math.max(rc.stash || 0, 0.4) : rc.stash }));
  return { w, s, c, rc: sides.get(i) };
};
const campHas = (i) => { const s = Math.floor((i % 30) / 3); return s === 0 || s === 9 ? i % 3 === 1 : true; };
const ups = (s, c) => (s >= 8 ? [1] : s === 0 || (s % 2 === 0 && c === 1) ? [0, 1, 2] : s % 2 && c !== 1 ? [c, 1] : [c]);   // the columns a level leads up to
const campOpen = (i) => {
  const st = save.camp.stars, w = Math.floor(i / 30), s = Math.floor((i % 30) / 3), c = i % 3, below = (d) => w * 30 + (s - 1) * 3 + d;
  if (!campHas(i) || (w > 0 && !(st[w * 30 - 2] > 0))) return false;
  return s === 0 || [0, 1, 2].some((d) => campHas(below(d)) && st[below(d)] > 0 && ups(s - 1, d).includes(c));
};
const campNextId = () => {   // where Continue goes: the last one played again if lost, else on up from it (its column, else the middle),
  // else the highest open one not cleared in the last world open (on that column, else the middle): always on, never back down
  const st = save.camp.stars, L = save.camp.last | 0, a = campAt(L), pref = (x) => (x.c === a.c ? 0 : x.c === 1 ? 1 : 2);
  if (campHas(L) && campOpen(L) && !(st[L] > 0)) return L;
  if (a.s < 9) { const up = ups(a.s, a.c).map((c) => a.w * 30 + (a.s + 1) * 3 + c).filter((i) => campOpen(i) && !(st[i] > 0)).sort((i, j) => pref(campAt(i)) - pref(campAt(j))); if (up.length) return up[0]; }
  let best = null, id = CAMP_END;
  for (let i = 0; i < CAMP_LEN; i++) if (campOpen(i) && !(st[i] > 0)) {
    const x = campAt(i);
    if (!best || x.w > best.w || (x.w === best.w && (x.s > best.s || (x.s === best.s && pref(x) < pref(best))))) { best = x; id = i; }
  }
  return id;
};
const campWorlds = () => { let n = 1; while (n < CAMPAIGN.length && save.camp.stars[n * 30 - 2] > 0) n++; return n; };   // the worlds open
const opened = (u) => save.bank >= u.at;
// The screen shake (Gum's) only when wanted: off by the player, or by the system's reduced motion until turned on (the digest §8).
const shakeOn = () => (save.shake === undefined ? !matchMedia('(prefers-reduced-motion: reduce)').matches : save.shake);
const shakeAdd = shake.add.bind(shake);
shake.add = (a) => { if (shakeOn()) shakeAdd(a); };
function loadSave(s) {
  if (s && typeof s === 'object') Object.assign(save, s);
  const c = save.camp = Object.assign(campFresh(), save.camp && typeof save.camp === 'object' ? save.camp : {});   // v1 to v2
  if (!Array.isArray(c.stars)) c.stars = []; if (!Array.isArray(c.builds)) c.builds = []; if (!c.fails || typeof c.fails !== 'object') c.fails = {}; if (!Array.isArray(c.runes)) c.runes = [];
  if ((save.v | 0) < 3) {   // v2 to v3: a world's ten levels in a row onto its map, each the middle of its tier (a boss's losses with it)
    const at = (i) => Math.floor(i / 10) * 30 + (i % 10) * 3 + 1, old = c.stars, f = {};
    c.stars = []; old.forEach((n, i) => { if (n > 0) c.stars[at(i)] = n; });
    for (const k in c.fails) f[/^\d+$/.test(k) ? at(+k) : k] = c.fails[k];
    c.fails = f; c.last = at(Math.max(0, c.open | 0));
  }
  delete c.open;   // what is open comes of the stars (campOpen)
  save.v = 3; save.stick = true;   // only the stick for now (user): its choice against the keys is hidden
  if (!PALETTE.some((c) => c.id === save.color) || !UNLOCKS.some((u) => u.id === save.color && opened(u))) save.color = PALETTE[0].id;   // a colour that is gone, or not open yet
}
function persist() {
  const s = JSON.stringify(save);
  if (ads.ok) bridge.storage.set([SAVE_KEY], [s]).catch(() => {});
  else try { localStorage.setItem(SAVE_KEY, s); } catch (e) { /* private mode: this visit only */ }
}

// ── Bodies ───────────────────────────────────────────────────
// The rigid part of a body's motion becomes (vx, vy); the wobble on top of it stays.
function setVel(b, vx, vy) {
  const n = b.n;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += b.vx[i]; my += b.vy[i]; }
  mx /= n; my /= n;
  for (let i = 0; i < n; i++) { b.vx[i] += vx - mx; b.vy[i] += vy - my; }
}
function turnOver(b) {   // a body half round about its middle at once (the Puck on its back and up again), no smear between
  const cx = b.cx, cy = b.cy;
  for (let i = 0; i < b.n; i++) { b.x[i] = b.px[i] = b.sx[i] = 2 * cx - b.x[i]; b.y[i] = b.py[i] = b.sy[i] = 2 * cy - b.y[i]; }
  b.updateBounds();
}
function addVel(b, dvx, dvy) { for (let i = 0; i < b.n; i++) { b.vx[i] += dvx; b.vy[i] += dvy; } }
// Turn a body toward upright by spin (as Gum rights a body on a floor; a foe on a wall needs it too).
function turnUp(b, k, dt) {
  const dw = (-Math.atan2(Math.sin(b.theta), Math.cos(b.theta)) * k - b.omega) * Math.min(1, 8 * dt);
  for (let i = 0; i < b.n; i++) { b.vx[i] -= dw * (b.y[i] - b.cy); b.vy[i] += dw * (b.x[i] - b.cx); }
}
function unstick(b, cd) { b.glue.fill(0); b.stuck = 0; b.stickCD = Math.max(b.stickCD || 0, cd); }
// What a body hangs on: 1 a surface facing +x (a wall on its left), 2 facing −x, 4 a ceiling, 0 nothing.
function glueSide(b) {
  let top = false;
  for (let i = 0; i < b.n; i++) { const g = b.glue[i]; if (g === 1 || g === 2) return g; if (g === 4) top = true; }
  return top ? 4 : 0;
}
const foeColor = (id) => FOE_COLOR[id] || colorById(id);

// An enemy: a red squishy crawling its round (see ENEMY).
class Foe {
  constructor(s, lv) {
    const def = ENEMY[s.type];
    this.type = s.type; this.def = def; this.ledge = s.ledge || null; this.rect = s.rect || null; this.wall = s.wall || null;
    this.big = !!s.big; this.hp = this.big ? MINI.hp : 1;   // a mini-boss (MINI)
    this.body = new Body(designById(def.design), foeColor(def.color), s.x, s.y, lv.R * def.size * (this.big ? MINI.size : 1), 0.5);
    this.body.gScale = def.grav; this.body.sticky = false; this.body.face.frown = true;
    this.body.fric = 0;   // no drag from what it crawls on (a wall's friction all but holds it still): its steering sets the pace
    this.dir = s.dir || (Math.random() < 0.5 ? -1 : 1); this.t = 0; this.stall = 0; this.ph = Math.random(); this.lastPh = this.ph;
    this.state = 'walk'; this.shellT = 0; this.wind = 0; this.spitT = rand(SPIT.every[0], SPIT.every[1]);
    this.s = this.rect ? (this.rect.x1 - this.rect.x0) / 2 + 1.05 * this.body.R : 0;   // a circler starts on top, in the middle
  }
  // Soft bodies moving as the hero does, by pushes and their own give rather than gliding on rails: each one inches
  // along in pulses (every `step` s), stretching along its way at each push and settling in between, and keeps upright.
  // None of them leaves its surface.
  think(dt, g) {
    const b = this.body, def = this.def, lv = g.lv;
    const steer = (tvx, tvy, k, xOnly) => { const q = Math.min(1, k * dt); addVel(b, (tvx - b.rigVx) * q, xOnly ? 0 : (tvy - b.rigVy) * q); };
    this.t += dt; b.ghost = this.state === 'shell';   // kept in step with the state (a bot's restored branch included)
    turnUp(b, 6, dt);
    this.ph = (this.ph + dt / def.step) % 1;
    const pulse = 0.25 + 1.5 * Math.pow(Math.max(0, Math.sin(this.ph * TAU)), 2);   // averages about one
    const push = this.ph < this.lastPh;   // a new pulse begins
    this.lastPh = this.ph;
    if (def.move === 'flow') { this.flow(dt, g); return; }
    if (def.move === 'crawl') {   // back and forth along its ledge (or the floor, between the walls)
      if (this.state === 'shell') { this.roll(dt, g); return; }
      if (!(b.wallMask & 8)) return;
      const l = this.ledge;
      if (l && !l.gone) {   // turn before its edge passes the ledge's: a part hanging over sags and catches on the corner
        if (b.maxX > l.x1 - 0.3 * b.R) this.dir = -1; else if (b.minX < l.x0 + 0.3 * b.R) this.dir = 1;
      }
      if (b.wallMask & 1) this.dir = 1; else if (b.wallMask & 2) this.dir = -1;
      if (push) {   // a whole pulse that got nowhere (another crawler in the way): back off
        this.stall = Math.abs(b.cx - (this.lastX ?? b.cx)) < 0.15 * b.R ? this.stall + 1 : 0;
        if (this.stall > 1) { this.dir = -this.dir; this.stall = 0; }
        this.lastX = b.cx;
        b.kickSquash(1, 0, -0.9);
      }
      const hold = this.type === 'spitter' && this.spit(dt, g), rush = this.type === 'skull' && this.lunge(dt, g);   // stands still to lob; a skull rushes at the hero
      steer(hold ? 0 : this.dir * def.speed * pulse * (rush ? SKULL.k : 1), 0, 6, true);
    } else if (def.move === 'wall') {   // up and down its stretch of wall, pressed to it (a chaser toward the hero's height)
      const w = this.wall, tx = w.side === 1 ? lv.l + b.R : lv.r - b.R;
      if (def.chase) { const ty = clamp(g.hero.cy, w.y0, w.y1); this.dir = Math.abs(ty - b.cy) < 0.3 * b.R ? 0 : Math.sign(ty - b.cy); }
      else if (b.cy < w.y0) this.dir = 1; else if (b.cy > w.y1) this.dir = -1;
      if (push) b.kickSquash(0, 1, -0.9);
      steer((tx - b.cx) * 6, this.dir * def.speed * pulse, 6);
    } else {   // round its block: along the top, down a side, along the bottom, up the other side
      const r = this.rect, e = 1.05 * b.R, w = r.x1 - r.x0 + 2 * e, h = r.y1 - r.y0 + 2 * e, P = 2 * (w + h);
      this.s = (((this.s + this.dir * def.speed * pulse * dt) % P) + P) % P;
      const s = this.s, x0 = r.x0 - e, y0 = r.y0 - e, side = s < w || (s >= w + h && s < 2 * w + h);
      if (push) b.kickSquash(side ? 1 : 0, side ? 0 : 1, -0.9);
      const p = s < w ? [x0 + s, y0] : s < w + h ? [x0 + w, y0 + s - w] : s < 2 * w + h ? [x0 + w - (s - w - h), y0 + h] : [x0, y0 + h - (s - 2 * w - h)];
      steer((p[0] - b.cx) * 8, (p[1] - b.cy) * 8, 10);
    }
  }
  // A worm (WORM): sits on its ledge; now and then, on screen, reaches a tube out to a ledge near by (the warning), then
  // pours itself along it, through anything, and lands there. Its state drives its body: flowing, it floats and touches nothing.
  flow(dt, g) {
    const b = this.body, lv = g.lv;
    if (this.state === 'walk') { this.state = 'sit'; this.waitT = rand(WORM.wait[0], WORM.wait[1]); }   // (just come alive)
    b.thread = this.state === 'flow'; b.gScale = b.thread ? 0 : 1;   // (kept to the state: a bot's restored branch too)
    if (this.state === 'sit') {
      if ((this.waitT -= dt) > 0 || !(b.wallMask & 8) || b.cy < lv.cam || b.cy > lv.cam + view.h) return;
      this.to = this.pickLedge(lv);
      if (this.to) { this.state = 'reach'; this.st = 0; this.from = [b.cx, b.cy]; } else this.waitT = 1;
      return;
    }
    this.st += dt;
    if (this.state === 'reach') { if (this.st > WORM.reach) { this.state = 'flow'; this.st = 0; this.from = [b.cx, b.cy]; } return; }
    const u = Math.min(1, this.st / WORM.flow), [x, y] = this.arc(u);
    setVel(b, (x - b.cx) * 14, (y - b.cy) * 14); b.wake();
    if (u >= 1) { this.state = 'sit'; this.waitT = rand(WORM.wait[0], WORM.wait[1]); this.ledge = this.to.r; this.to = null; }
  }
  pickLedge(lv) {   // a steady ledge near by, well in view (under the HUD's quarter, over the keys), clear of spikes: the middle of its top
    const b = this.body, R = lv.R, [n0, n1] = WORM.near, g_room = game.room();
    const ok = lv.near(b.cy - 6 * R, b.cy + 8 * R).filter((r) => { const d = Math.abs((r.x0 + r.x1) / 2 - b.cx);   // (down as well: it drips toward the hero)
      return r !== this.ledge && !r.cap && !r.crumble && !r.move && !r.spring && r.x1 - r.x0 >= 2 * lv.tile && d > n0 * R && d < n1 * R && r.y0 > lv.cam + 0.25 * view.h && r.y0 < lv.cam + view.h - g_room
        && !lv.spikes.some((q) => q.dir === 0 && Math.abs(q.y1 - r.y0) < 1 && q.x1 > r.x0 && q.x0 < r.x1); });
    if (!ok.length) return null;
    const r = ok[(Math.random() * ok.length) | 0];
    return { r, x: (r.x0 + r.x1) / 2, y: r.y0 - 1.1 * b.R };
  }
  arc(u) {   // its way over: from where it set off to its spot, bowed 2 R up
    const [x0, y0] = this.from, { x: x1, y: y1 } = this.to, cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 2 * this.body.R, v = 1 - u;
    return [v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1];
  }
  // Its tubes as discs [x, y, half-width]: waving round the knot; reaching out, one of them is its way over so far.
  tubes(R, T) {
    const b = this.body, out = [], n = Math.round(WORM.len / WORM.seg), d0 = 0.55 * R, reaching = this.state === 'reach' || this.state === 'flow';
    const lead = reaching ? (this.to.x > this.from[0] ? 0 : 2) : -1;   // the tube on its way's side
    WORM.angles.forEach((a0, k) => {
      const pts = [];
      if (k === lead) {   // along the arc: growing out, then (flowing) what is left of it ahead of the knot
        const u0 = this.state === 'flow' ? Math.min(1, this.st / WORM.flow) : 0, u1 = this.state === 'reach' ? Math.min(1, this.st / WORM.reach) : 1, m = Math.max(2, Math.round(n * 2.5));
        for (let i = 1; i <= m; i++) { const [x, y] = this.arc(u0 + ((u1 - u0) * i) / m); pts.push([x, y, WORM.w * R]); }
      } else for (let i = 1; i <= n; i++) {
        const a = a0 + Math.sin(T * 2.2 + k * 1.7 + i * 0.5) * WORM.wave, d = d0 + (i / n) * (WORM.len * R - d0);
        pts.push([b.cx + Math.cos(a) * d, b.cy + Math.sin(a) * d, WORM.w * R * (1 - (0.3 * i) / n)]);
      }
      out.push(pts);
    });
    return out;
  }
  // A spitter, now and then while the hero is near and on screen, swells up for SPIT.wind s and
  // lobs a blob that comes down where the hero was. True while it stands to do it.
  lunge(dt, g) {   // a skull (SKULL): the hero close on its level, it rushes at it a moment, rattling; its goo drips all along
    const b = this.body, H = g.hero, R = g.R;
    if (Math.random() < 3 * dt) bits.push({ x: b.cx + rand(-0.5, 0.5) * b.R, y: b.maxY - 2, vx: 0, vy: 40, s: rand(1.5, 2.5), c: INK.dark, t: 0, life: rand(0.6, 1.2), g: 0.5, drag: 1 });
    if ((this.rush = Math.max(0, (this.rush || 0) - dt)) > 0) return true;
    if ((this.cool = Math.max(0, (this.cool || 0) - dt)) > 0) return false;
    if (Math.abs(H.cx - b.cx) > SKULL.reach * R || Math.abs(H.cy - b.cy) > 1.5 * R) return false;
    this.dir = Math.sign(H.cx - b.cx) || this.dir; this.rush = SKULL.rush; this.cool = SKULL.every;
    sound.play('crumble', 0.6, 1.9); b.kickSquash(this.dir, 0, -1.2); return true;
  }
  spit(dt, g) {
    const b = this.body, H = g.hero, lv = g.lv;
    if (this.wind > 0) {
      if ((this.wind -= dt) > 0) { b.kickSquash(0, 1, 0.04); return true; }
      const x = b.cx, y = b.minY - SPIT.r * lv.R, dx = H.cx - x, dy = H.cy - y, T = clamp(Math.hypot(dx, dy) / 420, 0.55, 1.1);
      for (let k = 0, n = this.big ? 2 : 1; k < n; k++) lv.shots.push({ x, y, vx: dx / T + (n > 1 ? (k ? 80 : -80) : 0), vy: (dy - 0.5 * SHOT_G * T * T) / T, r: SPIT.r * lv.R });   // a big one: two, apart
      b.kickSquash(0, 1, -1.6); sound.play('spit', 0.5, 1.3);
      this.spitT = rand(SPIT.every[0], SPIT.every[1]);
      return true;
    }
    if ((this.spitT -= dt) <= 0 && Math.abs(H.cy - b.cy) < SPIT.range * view.h && b.cy > lv.cam && b.cy < lv.cam + view.h) { this.wind = SPIT.wind; return true; }
    return false;
  }
  // A stomped shell rolls along at SHELL.speed, back off walls and over edges (Game.rolling has it hit the others).
  roll(dt, g) {
    const b = this.body;
    if (b.wallMask & 1) this.dir = 1; else if (b.wallMask & 2) this.dir = -1;
    addVel(b, (this.dir * SHELL.speed * g.R - b.rigVx) * Math.min(1, 10 * dt), 0);
  }
}

// The boss at the summit: a big squishy that goes round (see BOSS): hovers dropping goo and calling helpers, shakes over
// the hero, dives into the middle, lies there dazed (the time to stomp it), rises again. A stomp hurts it and makes it red
// for a moment: then it hurts to touch.
class Boss {
  constructor(lv, def) {   // def: a campaign boss's (BOSSES); the random run's summit boss has none
    const R = lv.R * ((def && def.size) || BOSS.size), slide = !!(def && def.slide), rail = def && def.rail && lv.rail;   // the Puck: on the floor, to one side of the hero; the Minecart: on its rail
    this.body = new Body(designById((def && def.design) || 'cat'), FOE_COLOR.boss, rail ? rail.x1 : slide ? lv.r - 1.3 * R : (lv.l + lv.r) / 2, rail ? rail.y - 0.75 * R : slide ? lv.floor - R : lv.floor - lv.R * BOSS.high, R, 0.4);
    this.body.gScale = slide ? 1 : 0; this.body.sticky = false; this.body.face.frown = true; this.dir = -1; this.topped = 0;
    this.def = def || null; this.help = 1;   // help: its dazed time stretched (Game.buildLevel: after three losses running)
    this.hp = (def ? def.hp : BOSS.hp) + (lv.hard ? 2 : 0); this.max = this.hp; this.t = 0; this.drop = 1.8; this.call = 3; this.angry = 0; this.dead = false;
    this.state = 'hover'; this.st = 0; this.dazes = 0; this.wind = 0; this.mark = false;
  }
  open() { return (this.def && this.def.rail) ? this.angry <= 0 : this.state === 'dazed' || (this.state === 'hover' && this.angry <= 0 && !(this.def && this.def.slide)); }   // a stomp hurts it (the Puck: only turned over; the Minecart: always, from above)
  to(s) { this.state = s; this.st = 0; }
  think(dt, g) {
    if (this.def && this.def.slide) { this.slide(dt, g); return; }
    if (this.def && this.def.rail) { this.ride(dt, g); return; }
    const b = this.body, lv = g.lv, W = lv.r - lv.l, cx = (lv.l + lv.r) / 2, k = this.angry > 0 ? 1.8 : 1, R = lv.R;
    this.t += dt * k; this.st += dt; b.wake();   // never asleep: lying dazed it would doze off, and then not get up
    if (this.state !== 'dazed') turnUp(b, 6, dt);   // upright in the air, as the crawlers on their walls
    if (this.angry > 0 && (this.angry -= dt) <= 0) b.color = FOE_COLOR.boss;
    if (this.state === 'warn' || this.state === 'dive' || this.state === 'dazed') {
      if (this.state === 'warn') {   // over the hero (kept to the middle, clear of the ledges), shaking, flashing
        const tx = clamp(g.hero.cx, cx - 0.2 * W + b.R, cx + 0.2 * W - b.R), q = Math.min(1, 6 * dt);
        addVel(b, ((tx - b.cx) * 4 - b.rigVx) * q, -b.rigVy * q);
        if (Math.floor(this.st * 12) % 2) b.kickSquash(1, 0, 0.12);
        b.color = Math.floor(this.st * 5) % 2 ? FOE_COLOR.red : FOE_COLOR.boss;   // 2.5 flashes a second: under WCAG's 3
        if (this.st > BOSS.warn) { this.to('dive'); b.color = FOE_COLOR.boss; sound.play('airjump', 0.9, 0.5); }
      } else if (this.state === 'dive') {
        setVel(b, 0, BOSS.dive * R);
        for (const e of lv.enemies.slice()) { const q = e.body; if (q.maxX > b.minX && q.minX < b.maxX && q.minY < b.maxY + 4 && q.maxY > b.minY) g.kill(e, false); }   // its own helpers squashed under it
        if ((b.wallMask & 8) || this.st > 1.5) {   // down: the floor shakes
          this.to('dazed'); b.gScale = 1; setVel(b, 0, 0); b.kickSquash(0, 1, 2.2); b.sqAx = 0; b.sqAy = 1; b.squeezeIn = 0.7;
          shake.add(9); haptics.buzz(40); sound.play('stomp', 1, 0.45); sound.play('crumble', 0.8, 0.6);
          fx.dust(b.cx - b.R, lv.floor, IMPACT.puffSpeed + 900); fx.dust(b.cx + b.R, lv.floor, IMPACT.puffSpeed + 900); fx.ring(b.cx, lv.floor, 2 * b.R, INK.white);
          if (!this.dazes++) ui.toast(t('bossHint'), 2600);   // the first time: what to do now
        }
      } else {
        addVel(b, -b.rigVx * Math.min(1, 8 * dt), 0);
        if (this.st > BOSS.dazed * this.help) this.rise();
      }
      return;
    }
    const ph = this.def ? this.def.phase(this.hp) : 2;   // a boss with a def adds things as it loses hearts (BOSSES)
    if (this.state === 'hover' && this.st > BOSS.hover * (this.angry > 0 || this.hp < this.max / 2 || ph >= 3 ? BOSS.fast : 1)) { this.to('warn'); return; }
    const tx = cx + Math.sin(this.t * 0.55) * W * BOSS.sway, ty = lv.floor - R * BOSS.high + Math.sin(this.t * 1.2) * R * 0.5, q = Math.min(1, 2.4 * dt);
    addVel(b, ((tx - b.cx) * 2 - b.rigVx) * q, ((ty - b.cy) * 2 - b.rigVy) * q);
    if (this.state === 'rise' && Math.abs(ty - b.cy) < b.R) this.to('hover');
    if (this.state !== 'hover') return;
    if (ph >= 1 && (this.drop -= dt * k) <= 0) {   // its goo, then its helpers; at phase 3 twice the goo
      this.drop = BOSS.dropEvery;
      for (let i = -1; i <= 1; i += ph >= 3 ? 0.5 : 1) lv.shots.push({ x: b.cx + i * b.R * 0.5, y: b.maxY, vx: i * 120, vy: 60, r: 0.32 * lv.R });
    }
    if (ph >= 2 && (this.call -= dt) <= 0) {
      this.call = BOSS.spawnEvery;
      if (lv.enemies.length < BOSS.maxMinions) lv.enemies.push(new Foe({ type: 'crawler', x: b.cx, y: b.cy + b.R * 0.6 }, lv));   // it drops onto a plank or the floor
    }
  }
  rise() {
    const b = this.body, slide = this.def && this.def.slide; this.to('rise'); b.gScale = slide ? 1 : 0; b.squeezeIn = 0; b.kickSquash(0, 1, -1.2);
    if (slide) { turnOver(b); b.up.fails = 0; setVel(b, 0, -3 * b.R); }   // the Puck: back on its feet with a hop
  }
  // The Puck (BOSSES.puck, PUCK): slides the ice to and fro flicking out shells, winds up (backing off, flat, flashing)
  // and dashes over to the far wall, which shakes icicles down from its second phase. Only a rolling shell turns it (flip).
  slide(dt, g) {
    const b = this.body, lv = g.lv, R = lv.R, ph = this.def.phase(this.hp), H = g.hero;
    b.wake();
    if ((this.t += dt) < PUCK.calm) { addVel(b, -b.rigVx * Math.min(1, 8 * dt), 0); return; }   // still at first
    this.st += dt;
    if (this.state !== 'dazed') turnUp(b, 6, dt);   // the dome up (on its back, Gum's own righting is held off: flip)
    if (this.angry > 0 && (this.angry -= dt) <= 0) b.color = FOE_COLOR.boss;
    if (this.state === 'dazed') { addVel(b, -b.rigVx * Math.min(1, 4 * dt), 0); if (this.st > PUCK.flip * this.help) this.rise(); return; }
    if (this.state === 'rise') { if (this.st > 0.5) this.to('hover'); return; }
    if (this.state === 'warn') {
      addVel(b, (-this.dir * 1.2 * R - b.rigVx) * Math.min(1, 6 * dt), 0);
      if (Math.floor(this.st * 12) % 2) b.kickSquash(0, 1, 0.14);
      b.color = Math.floor(this.st * 5) % 2 ? FOE_COLOR.red : FOE_COLOR.boss;   // 2.5 flashes a second: under WCAG's 3
      if (this.st > PUCK.wind) { this.to('dive'); b.color = FOE_COLOR.boss; sound.play('airjump', 0.9, 0.5); }
      return;
    }
    if (this.state === 'dive') {
      addVel(b, (this.dir * PUCK.dash[ph] * R - b.rigVx) * Math.min(1, 10 * dt), 0);
      if (!(b.wallMask & (this.dir > 0 ? 2 : 1)) && this.st < 2.5) return;
      shake.add(8); haptics.buzz(30); sound.play('stomp', 1, 0.5); sound.play('crumble', 0.7, 0.8); fx.dust(this.dir > 0 ? lv.r : lv.l, lv.floor, IMPACT.puffSpeed + 900);   // the wall: it shakes
      for (let k = 0; k < PUCK.icicles[ph]; k++) {   // icicles down, the nearest over the hero first (more grow back where it is)
        const c = lv.icicles.filter((q) => q.state === 'hang').sort((p, q) => Math.abs(p.x - H.cx) - Math.abs(q.x - H.cx))[0];
        if (c) { c.state = 'shake'; c.t = ICICLE.shake; } else lv.icicles.push({ x: clamp(H.cx + (k ? 2.5 : -2.5) * R, lv.l + R, lv.r - R), y: Math.max(lv.capY, lv.cam + CAM.top), state: 'shake', t: ICICLE.shake });
      }
      this.dir = -this.dir; this.to('hover'); return;
    }
    if (b.wallMask & 1) this.dir = 1; else if (b.wallMask & 2) this.dir = -1;
    addVel(b, (this.dir * PUCK.slide * R - b.rigVx) * Math.min(1, 3 * dt), 0);
    if ((this.drop -= dt) <= 0) {   // a shell flicked out in front of it, as many as the phase allows
      this.drop = PUCK.every;
      if (lv.enemies.filter((e) => e.type === 'shell').length < PUCK.shells[ph]) { lv.enemies.push(new Foe({ type: 'shell', x: clamp(b.cx + this.dir * 1.2 * b.R, lv.l + R, lv.r - R), y: b.cy }, lv)); sound.play('bubble', 0.6, 1.4); }
    }
    if (this.st > PUCK.rest[ph] * (this.angry > 0 ? 0.6 : 1)) { this.dir = Math.sign(H.cx - b.cx) || 1; this.to('warn'); sound.play('crumble', 0.6, 0.5); }   // at the hero, after a scrape
  }
  // The Minecart (BOSSES.cart, CART): rides its rail under the ceiling end to end, lobbing blobs at the hero; at an end it
  // creaks and tips three rocks down. Open from above only: off a ledge high enough, or let go from the moss over a rail's
  // end as it comes under (a ▼ then). Its second phase hurries the bridges and lobs two; its third, faster lifts and a spitter.
  ride(dt, g) {
    const b = this.body, lv = g.lv, R = lv.R, ph = this.def.phase(this.hp), H = g.hero, rail = lv.rail, k = this.angry > 0 ? 1.5 : 1;   // angry (hit): faster
    b.wake(); turnUp(b, 6, dt);
    if ((this.t += dt) < CART.calm) { addVel(b, -b.rigVx * Math.min(1, 8 * dt), ((rail.y - 0.75 * b.R - b.cy) * 6 - b.rigVy) * Math.min(1, 6 * dt)); return; }   // still at first, while its name is up
    this.st += dt;
    if (this.angry > 0 && (this.angry -= dt) <= 0) b.color = FOE_COLOR.boss;
    if (ph >= 1 && !lv.crumbleTime) { lv.crumbleTime = CART.crumble[0]; lv.crumbleBack = CART.crumble[1]; }
    if (ph >= 2 && !this.called) { this.called = true; for (const r of lv.rects) if (r.move) r.move.v *= CART.lifts; lv.enemies.push(new Foe({ type: 'spitter', x: (lv.l + lv.r) / 2, y: lv.floor - 2 * R }, lv)); }
    let vx = 0;
    if (this.state === 'hover') {
      vx = (this.dir * (rail.x1 - rail.x0) / CART.pass[ph]) * k;
      if ((this.dir > 0 && b.cx >= rail.x1) || (this.dir < 0 && b.cx <= rail.x0)) { this.to('warn'); sound.play('crumble', 0.6, 0.45); }
    } else if (this.state === 'warn') {   // the creak at an end, then three rocks down and back the other way
      if (Math.floor(this.st * 12) % 2) b.kickSquash(1, 0, 0.1);
      if (this.st > CART.creak) {
        for (const d of [-0.6, 0, 0.6]) lv.shots.push({ x: b.cx + d * b.R, y: rail.y + 0.4 * R, vx: d * 40, vy: 60, r: CART.rock * R, rock: true });
        shake.add(4); sound.play('crumble', 0.9, 0.7); this.dir = -this.dir; this.to('hover');
      }
    }
    addVel(b, (vx - b.rigVx) * Math.min(1, 6 * dt), ((rail.y - 0.75 * b.R - b.cy) * 6 - b.rigVy) * Math.min(1, 6 * dt));   // in its seat on the rail
    if (this.wind > 0) {   // a blob (two from its second phase) at the hero, as a spitter lobs one
      if ((this.wind -= dt) > 0) b.kickSquash(0, 1, 0.05);
      else if (H.cy > b.minY) {   // (not up at a hero over it: that one is on its way down onto it)
        const x = b.cx, y = b.maxY, dx = H.cx - x, dy = H.cy - y, T = clamp(Math.hypot(dx, dy) / 420, 0.55, 1.1), n = ph >= 1 ? 2 : 1;
        for (let i = 0; i < n; i++) lv.shots.push({ x, y, vx: dx / T + (n > 1 ? (i ? 70 : -70) : 0), vy: (dy - 0.5 * SHOT_G * T * T) / T, r: SPIT.r * R });
        b.kickSquash(0, 1, -1.6); sound.play('spit', 0.6, 1.1);
      }
    } else if ((this.drop -= dt * k) <= 0) { this.drop = CART.spit; this.wind = CART.wind; }
    this.mark = !!(H.wallMask & 4) && H.stuck > 0 && H.cy < b.minY && Math.abs(H.cx - b.cx) < 0.8 * b.R;   // the hero hanging right over it: let go now
    if (this.mark && !this.marked) { this.marked = true; ui.toast(L2(this.def.hint), 2200); }
  }
  flip() {   // a rolling shell has turned the Puck over: belly up, a stomp hurts it now
    const b = this.body; this.to('dazed'); b.color = FOE_COLOR.boss; turnOver(b); b.up.on = false; b.up.fails = BODY.upFails; b.kickSquash(0, 1, 1.6); setVel(b, b.rigVx * 0.3, -3 * b.R);   // over, with a hop, and kept so
    shake.add(7); haptics.buzz(30); sound.play('bosshit', 0.8, 1.3);
    if (!this.dazes++) ui.toast(L2(this.def.hint), 2600);   // the first time: what to do now
  }
}

// ── Game ─────────────────────────────────────────────────────
const said = { freed: (Math.random() * SAY.freed.length) | 0, moti: (Math.random() * SAY.moti.length) | 0 }, say = (k) => L2(SAY[k][said[k]++ % SAY[k].length]);   // the lore's lines in turn, from anywhere
const RAINBOW_BODY = RAINBOW_INK.map((c) => ({ id: 'rainbow', base: c, deep: PAL.black }));   // the hero's colours under a rainbow
// A death (the plan: funny deaths, each its own): the hero held a beat in the colour of what did it, hot, pricked,
// bonked or soured, with the world still, then its burst (Game.pop). A fall ends below the screen: no beat there.
const DIE = { beat: 0.3, body: { fire: { id: 'die', base: PAL.orange, deep: PAL.red }, spikes: { id: 'die', base: PAL.red, deep: PAL.black },
  icicle: { id: 'die', base: PAL.blue, deep: PAL.black }, enemy: { id: 'die', base: PAL.green, deep: PAL.black }, train: { id: 'die', base: PAL.yellow, deep: PAL.black } } };
const MODS = () => ({ bounce: 1, slide: 1, hold: 0, magnet: 1, invuln: 0, airJumps: 1, blast: false, coinMul: 1, comboShift: 0, jump: 1, discount: 1, iron: false, fire: 1, gun: 0, plaster: 0, ceil: false, dive: false, dashes: 1, meteor: false, fireFree: 0 });
let lastOffer = [];   // the cards offered last time: not again in the next three (a bag, the digest §7: fair-feeling chance)
const SPIKE_PUSH = [[0, -1], [0, 1], [1, -0.35], [-1, -0.35]];
let nextSeed = null;
class Game {
  constructor() {
    this.lv = new Level(); this.well = null; this.door = null; this.hero = null; this.state = 'boot'; this.paused = 'play';
    this.R = 30; this.vjump = 1; this.builtW = 0; this.list = []; this.look = { x: 0, y: 0, t: 0 }; this.heroLook = { x: 0, y: 0, t: -1e9 };
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.hitstop = 0; this.invuln = 0; this.touch = 0; this.queued = null; this.rising = false;
    this.stateT = 0; this.pruneT = 0; this.winT = 0; this.startY = 0; this.result = null; this.safes = [];
    this.pow = null; this.ram = false; this.tail = []; this.rocket = null;   // the candy at work, a ram on its way up, a rainbow's tail, a boost ring's flight
    this.warns = [];   // where threats come down into view (see threats)
    this.followers = []; this.trail = [];   // the freed, following the hero along its way (see followStep)
    this.swarm = [];   // the swarm candy's crowd (swarmUp)
    this.newRun();
  }
  newRun() {
    this.world = 0; this.stage = 0; this.mods = MODS(); this.taken = [];
    this.tier = save.wins > 0 ? Math.min(save.tier || (save.hard ? 1 : 0), save.tierMax || 1) : 0; this.hard = this.tier > 0;   // the hard mode's tier (an old save's hard mode: tier 1)
    this.endless = false; this.loop = 0;
    this.maxHp = HEALTH.start; this.hp = this.maxHp; this.coins = 0; this.kills = 0; this.combo = 0; this.bestCombo = 0; this.syns = [];
    this.climbed = 0; this.levelM = 0; this.revives = 0; this.bonus = null; this.bonusT = 0; this.bonusCoins = 0; this.freed = 0;
    this.mode = 'run'; this.rc = null; this.ci = -1; this.lastBy = null; this.daily = null;   // the random run; playLevel makes it a campaign level
    const perk = UPGRADES.find((u) => u.id === (UNLOCKS.find((u) => u.id === save.color) || {}).perk);
    if (perk) this.takeUpgrade(perk);   // each colour starts with its own upgrade
  }
  applyMods() {
    STICK.slide = BASE_STICK.slide * this.mods.slide; STICK.hold = BASE_STICK.hold + this.mods.hold + (this.lv.rail ? CART.hold : 0); CEIL.any = !!this.mods.ceil;
    this.vjump = Math.sqrt(2 * WORLD.gravity * JUMP.height * this.R) * this.mods.jump;
  }
  get b() { return this.hero && Number.isFinite(this.hero.floorY) ? this.hero.floorY : this.lv.floor; }   // where Body.endStep puts landing dust
  get wd() { return this.preview || (this.mode === 'camp' ? CAMPAIGN[this.world].world : this.world === CRYPT.at[0] && this.stage === CRYPT.at[1] ? CRYPT : this.world < WORLDS.length ? WORLDS[this.world] : SUMMIT); }   // (the run's Crypt in the Mine)
  bodyList() {
    const a = this.list, lv = this.lv;
    a.length = 0;
    for (const e of lv.enemies) a.push(e.body);
    if (lv.boss && !lv.boss.dead) a.push(lv.boss.body);
    for (const f of lv.folk || []) if (f.body) a.push(f.body);
    for (const f of this.followers) a.push(f.body);   // into rooms too
    for (const b of this.swarm) a.push(b);
    if (this.hero) a.push(this.hero);
    return a;
  }
  makeHero() {
    const bs = this.lv.boss, x = bs && bs.def && bs.def.slide ? this.lv.l + 2 * this.R : view.w / 2, y = this.lv.floor - 1.1 * this.R;   // the Puck's arena: by the far wall from it
    this.hero = new Body(designById('round'), colorById(save.color), x, y, this.R, 0.6);
    this.hero.isHero = true;
    this.startY = this.hero.cy;
  }
  placeHero(x, y) {
    const b = this.hero;
    b.translate(x - b.cx, y - b.cy);
    b.vx.fill(0); b.vy.fill(0); unstick(b, 0.2); b.ceilT = 0; b.peelT = 0;
  }
  // The menu's backdrop is the first level of a fresh run with the hero standing in it.
  toMenu() {
    if (this.mode === 'camp' && (this.state === 'play' || this.state === 'pause' || this.state === 'dead')) { this.campKeep(); persist(); }   // the coins picked up are kept
    this.newRun(); this.state = 'menu'; this.buildLevel(true);
    ui.hideAll(); ui.menu();   // (which sets the camera on the hero)
  }
  startRun(daily, endless) {   // daily: the day's well; endless: on past the summit, round and round
    this.newRun(); if (daily) this.daily = today; this.endless = !!endless; save.runs++; persist(); padUsed = performance.now();   // the keys show in full as a run starts
    this.state = 'play'; this.stateT = 0; this.buildLevel(true); this.saveRun();
    ui.hideAll(); ui.banner();
    if (save.runs <= 2) ui.toast(t(coarse ? (save.stick ? 'hintStick' : 'hintTouch') : JUMP.mouse ? 'hintMouse' : 'hintKeys'), 3500);
  }
  buildLevel(newHero) {
    const W = view.w, H = view.h, rc = this.mode === 'camp' ? this.rc : null, boss = rc ? !!rc.boss : this.world >= WORLDS.length && !this.bonus, wd = this.bonus || this.wd;
    this.builtW = W;
    this.R = clamp((W - 2 * LEVEL.wall) * HERO.sizeFrac, HERO.sizeMin, HERO.sizeMax);
    const seed = nextSeed != null ? nextSeed : this.daily != null ? daySeed(this.daily, this.world, this.stage, !!this.bonus) : (Math.random() * 4294967296) >>> 0;
    nextSeed = null;
    this.seed = seed; this.lv = new Level(); this.well = null; this.door = null;
    this.lv.reset({ kind: boss ? 'boss' : 'well', w: W, h: H, R: this.R, seed, world: wd, stage: this.stage, hard: this.hard, tier: this.tier + this.loop, recipe: this.bonus ? null : rc,
      height: boss ? 0 : (rc ? rc.len : wd.heights[this.stage]) * R_PER_M * this.R, theme: wd.theme, keep: this.room() });
    this.lv.cam = Math.max(this.lv.cam, this.lv.floor + this.room() - H);   // the floor shows over the touch keys
    if (rc && rc.ice) for (const c of this.lv.icicles) c.y = Math.max(c.y, this.lv.cam + CAM.top);   // the Puck's icicles in sight, under the HUD (the keys push the arena's ceiling up off the screen)
    if (boss) { this.lv.boss = new Boss(this.lv, BOSSES[rc ? rc.boss : 'lid']); if ((save.camp.fails[this.failKey()] || 0) >= 3) this.lv.boss.help = 1.15; }   // help in trouble, unseen (the digest §7)
    if (newHero || !this.hero || this.hero.R !== this.R) this.makeHero();
    else {   // back to size and weight after the hole
      const h = this.hero;
      h.gScale = 1; h.sticky = true; h.growth = h.growthTarget = 1; h.growthV = 0;
      this.placeHero(W / 2, this.lv.floor - 1.1 * this.R); this.startY = this.hero.cy;
    }
    this.applyMods();
    this.sinceContact = 1; this.queueT = 0; this.air = 0; this.invuln = 0; this.hitstop = 0; this.levelM = 0; this.idleT = 0; this.gunT = 0; this.gunCD = 0; this.gunMax = 1; this.combo = 0; this.pow = null; this.ram = false; this.rocket = null; if (this.hero) this.hero.thread = false;
    this.touch = 0; this.queued = null; this.rising = false; this.crouch = false; this.plasters = this.mods.plaster;   // a plaster for each taken, a level
    this.winT = 0;   // a beaten boss's win still to come is the old level's
    this.followers = []; this.trail = []; this.swarm = []; this.fireFree = this.mods.fireFree;
    this.safes = [{ r: null, dx: W / 2 }];   // a fall before any ledge comes back to the floor
    fx.n = 0; aimCancel(); ui.comboEnd();
    this.lv.ensure(this.lv.cam - H * LEVEL.ahead);
  }
  // A new width remakes the level under way (the well is the view's width); the run goes on.
  // A new width remakes the level (the well is the view's width): the same one (its seed), the hero back about as high up it as it
  // was, on the highest steady ledge under that (Playgama's checklist: a turn of the phone must not lose progress). In a room, the shaft.
  resized() {
    if (this.state === 'menu' || this.state === 'boot') { this.toMenu(); return; }
    const shaft = this.well || this.lv, h = shaft.kind === 'well' && this.hero ? (shaft.floor - (this.well ? this.door.y1 : this.hero.cy)) / this.R : 0;
    nextSeed = this.seed; this.buildLevel(true);
    const lv = this.lv, R = this.R;
    if (lv.kind !== 'well' || h < 3) return;
    lv.ensure(lv.floor - (h + 2 * view.h / R) * R);
    const r = lv.rects.filter((q) => !q.cap && !q.plank && !q.crumble && !q.move && !q.spring && !q.crack && q.x1 - q.x0 > 2 * R && (lv.floor - q.y0) / R <= h + 0.5).sort((a, b) => a.y0 - b.y0)[0];
    if (!r) return;
    this.placeHero((r.x0 + r.x1) / 2, r.y0 - 1.1 * R); this.safes = [{ r, dx: (r.x1 - r.x0) / 2 }];
    lv.cam = this.hero.cy - CAM.anchor * view.h; lv.ensure(lv.cam - view.h * LEVEL.ahead);
    if (lv.fire) lv.fire.y = Math.max(lv.fire.y, lv.cam + view.h * 1.2);
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  offer(n = 3) {
    const camp = this.mode === 'camp', pool = UPGRADES.filter((u) => (u.stack || !this.taken.includes(u.id)) && (camp ? !u.run && (CARD_FROM[u.id] || 0) <= this.world * 10 + this.stage : !u.camp));
    const fresh = pool.filter((u) => !lastOffer.includes(u.id)), out = shuffled(Math.random, fresh.length >= n ? fresh : pool).slice(0, n);
    if (n > 1) lastOffer = out.map((u) => u.id);
    return out;
  }
  takeUpgrade(u) {
    u.apply(this); this.taken.push(u.id); met('up', u.id);
    for (const sy of SYNERGIES) if (!this.syns.includes(sy.id) && sy.of.every((id) => this.taken.includes(id))) {   // a pair made whole: what it is, at once
      sy.apply(this); this.syns.push(sy.id); met('up', sy.id);
      if (this.state === 'play' || this.state === 'clear') setTimeout(() => ui.toast(tf('synergy', { n: L2(sy.name)[0] }) + '\n' + L2(sy.name)[1], 2600), 400);
    }
    this.applyMods();
  }
  randomUpgrade() { const u = this.offer(1)[0]; if (u) { this.takeUpgrade(u); ui.toast(L2(u.name)[0]); } }
  priceOf(p) { return p.item.free ? 0 : Math.round(p.item.price * (1 + 0.5 * Math.min(this.world, 4)) * this.mods.discount * (this.hard ? 1.5 : 1)); }

  // ── Jumping ──
  contact() { const b = this.hero; return (b.wallMask & 15) !== 0 || b.stuck > 0; }
  onFloor() { const b = this.hero; return (b.wallMask & 8) !== 0 && b.stuck === 0; }
  // The way out of what the hero is on, for a slingshot aimed off it; null in the air.
  surfaceNormal() {
    if (this.sinceContact > JUMP.coyote) return null;
    const t = this.touch;
    return t === 1 ? [1, 0] : t === 2 ? [-1, 0] : t === 4 ? [0, 1] : [0, -1];
  }
  // From a surface (or just off one) a jump goes at once; in the air it spends an air jump
  // if there is one (every landing gives one back, so does a stomp), or waits a moment for
  // a surface. `aimed` is a slingshot launch { vx, vy } from the mouse, null for the button.
  requestJump(aimed = null) {
    if (this.state !== 'play') return;
    if (this.sinceContact <= JUMP.coyote) this.jump(false, aimed);
    else if (this.air > 0) { this.air--; this.jump(true, aimed); }
    else { this.queueT = JUMP.buffer; this.queued = aimed; }
  }
  // Off a floor: up, keeping the run. Off a wall: up and away. Off a ceiling: pushed down,
  // or with a side pressed a dash that way. In the air: up again, with a puff under it. A slingshot
  // launch goes where it was aimed, and letting go of a button cannot cut it.
  jump(inAir, aimed) {
    const H = this.hero, v = this.vjump, ram = this.power('smash') && (inAir || this.touch !== 4 || (!aimed && this.over(SMASH.look * this.R).some((r) => this.smashable(r)))), side = inAir || (ram && this.touch === 4) ? 0 : this.touch;   // any jump rams; off a ceiling only with something to break over it (and then up through it)
    const sup = !inAir && !aimed && this.crouch && this.touch === 0;   // from a crouch on a floor: CROUCH.height times as high, no tap cuts it
    let vx = H.rigVx, vy = -v * (sup ? Math.sqrt(CROUCH.height) : 1), rise = !aimed && !sup;
    if (aimed) { vx = aimed.vx; vy = aimed.vy; }
    else if (side === 1 || side === 2) { vx = (side === 1 ? 1 : -1) * JUMP.wallX * this.R; vy = -v * JUMP.wallUp; }
    else if (side === 4) {   // off a ceiling: down, or with a side pressed a dash that way, close under it
      if (input.dir) { vx = input.dir * JUMP.dash * this.R; vy = JUMP.dashDown * v; this.dashT = 0.15; fx.dust(H.cx - input.dir * H.R, H.minY, IMPACT.puffSpeed + 600); }   // the ceiling's friction off for a moment, or it drags the dash
      else { vx = 0; vy = JUMP.ceil * v; }
      rise = false;
    }
    const R = this.R, foot = H.maxY, hc = H.color.base;   // the juice: a double jump bursts out under the hero, a wall jump off the wall, a jump off its feet
    if (inAir || ram || sup) {
      fx.dust(H.cx, foot, IMPACT.puffSpeed + 900); fx.ring(H.cx, foot, 0.8 * R, hc); fx.ring(H.cx, foot, 1.3 * R, INK.white);
      sparkFx(H.cx, foot, 16, Math.PI / 2, 1.0, [220, 560], [1.5, 3.2], [0.3, 0.6], [INK.white, hc, INK.white], 0.25);
    } else if (side === 1 || side === 2) sparkFx(side === 1 ? H.minX : H.maxX, H.cy, 9, side === 1 ? Math.PI : 0, 0.8, [120, 340], [1.2, 2.6], [0.25, 0.45], [INK.white, hc], 0.3);
    else if (side !== 4) sparkFx(H.cx, foot, 8, Math.PI / 2, 1.45, [90, 260], [1.2, 2.4], [0.2, 0.4], [INK.white, PAL.gray], 0.15);
    sound.play(inAir || ram || sup ? 'airjump' : side === 1 || side === 2 ? 'walljump' : 'jump', 0.8, ram ? 0.8 : sup ? 0.85 : 1);
    setVel(H, vx, vy);
    unstick(H, JUMP.stickAfter);
    const sp = Math.hypot(vx, vy) || 1;
    H.kickSquash(vx / sp, vy / sp, -JUMP.stretch * Math.min(1, sp / v));   // stretch along the leap
    haptics.buzz(8);
    const thru = ram && this.over(JUMP.height * this.R).some((r) => this.smashable(r));   // a block to break within a jump: no tap may cut it short of it
    this.rising = rise && !thru; this.sinceContact = JUMP.coyote + 1; this.queueT = 0; this.queued = null; this.ram = ram;
  }
  // The solid ledges just over the hero (planks are jumped through anyway), and which of them a ram breaks: a shaft ledge one tile
  // thick, not the exit's ceiling or a spring, with nothing on it or under it that would be left hanging in the air.
  over(look) { const H = this.hero, R = this.R; return this.lv.near(H.minY - look, H.cy).filter((r) => !r.plank && r.y1 <= H.cy && r.x1 > H.minX + 0.25 * R && r.x0 < H.maxX - 0.25 * R); }
  smashable(r) {
    const lv = this.lv, on = (q) => q.x1 > r.x0 && q.x0 < r.x1;
    return lv.kind === 'well' && !r.cap && !r.spring && r.y1 - r.y0 <= SMASH.maxH * lv.tile &&
      !lv.spikes.some((s) => s.dir < 2 && on(s) && Math.abs(s.dir ? s.y0 - r.y1 : s.y1 - r.y0) < 1) &&   // red stays danger
      !lv.rects.some((q) => q.spring && on(q) && Math.abs(q.y1 - r.y0) < 1) && !lv.bubbles.some((b) => on(b) && Math.abs(b.y1 - r.y0) < 1);
  }
  ramUp() {   // each step of a ram on its way up: what is just overhead goes before the hero meets it, or the ram stops on what does not break
    const H = this.hero, vy = H.vy.reduce((s, v) => s + v, 0) / H.n;   // the rigid part, as setVel set it (rigVy lags a jump by a step)
    if (vy >= 0) { this.ram = false; return; }
    const rs = this.over(SMASH.reach * this.R - vy * STEP);
    if (!rs.length) return;
    if (!rs.every((r) => this.smashable(r))) { this.bonk(); return; }
    for (const r of rs.slice()) this.smash(r);
    if (vy > -SMASH.kick * this.vjump) addVel(H, 0, -SMASH.kick * this.vjump - vy);   // on up through it and over, whatever was left of the jump
    this.rising = false;   // as after a stomp: letting go of a tapped jump must not cut the kick
  }
  smash(r, jolt = 1) {
    if (r.crack) { this.crack(r); return; }   // a stash's way in: gone for good
    const lv = this.lv, R = this.R, cx = (r.x0 + r.x1) / 2, on = (s) => s.x1 > r.x0 && s.x0 < r.x1 && (s.dir === 0 ? Math.abs(s.y1 - r.y0) < 1 : s.dir === 1 && Math.abs(s.y0 - r.y1) < 1);
    r.gone = r.broke = true; r.crumbling = false; r.t = 0;
    if (lv.spikes.some(on)) { r.spikes = lv.spikes.filter(on); lv.spikes = lv.spikes.filter((s) => !on(s)); }   // a giant's: its spikes go with it, and come back with it
    const was = new Set(lv.enemies);
    for (const e of lv.enemies.slice()) { const q = e.body; if (e.rect === r || (q.maxX > r.x0 && q.minX < r.x1 && q.maxY > r.y0 - 0.5 * R && q.minY < r.y1 + 0.3 * R)) this.kill(e, true); }   // knocked off from below, a hedgehog too
    for (const e of lv.enemies.slice()) if (!was.has(e)) this.kill(e, true);   // a splitter's minis too: they would land in the hole, in the hero's way
    if (!r.paid) { r.paid = true; this.drop(cx, r.y0, SMASH.coins); }
    crumbleFx(r, r.slick ? lv.theme.slick : r.crumble ? lv.theme.crumble : lv.theme.block, true); fx.ring(cx, (r.y0 + r.y1) / 2, 1.6 * R, INK.white);
    this.hitstop = Math.max(this.hitstop, SMASH.hitstop * jolt); shake.add(SMASH.shake * jolt); haptics.buzz(25);
    sound.play('crumble', 1, 0.75); sound.play('stomp', 0.6, 0.55);
  }
  // A giant (see GROW) breaks what it runs or jumps into before it meets it, so it ploughs on: any block but the exit's ceiling,
  // springs and planks, and one a spring or a door stands on; what it stands on holds.
  plough(dt) {
    const H = this.hero, lv = this.lv, R = this.R, m = GROW.reach * R + Math.hypot(H.rigVx, H.rigVy) * dt, up = m + LEVEL.spike * R, on = (r, q) => q.x1 > r.x0 && q.x0 < r.x1 && Math.abs(q.y1 - r.y0) < 1;
    if (lv.kind !== 'well') return;
    for (const r of lv.near(H.minY - up, H.maxY).slice()) {   // overhead a spike's length further: spikes under a block go with it before they bite
      if (r.cap || r.spring || r.plank || r.y0 > H.maxY - GROW.feet * R || r.x1 < H.minX - m || r.x0 > H.maxX + m) continue;
      if (!lv.rects.some((q) => q.spring && on(r, q)) && !lv.bubbles.some((b) => on(r, b))) this.smash(r, GROW.jolt);
    }
  }
  // The swarm (SWARM): the hero's kind in the other colours, round it on a turning ring, breathing; home in its last moment.
  swarmUp() {
    const H = this.hero, R = this.R, n = SWARM.n[0] + ((Math.random() * (SWARM.n[1] - SWARM.n[0] + 1)) | 0), cols = PALETTE.filter((c) => c.id !== save.color);
    for (const b of this.swarm) sparkFx(b.cx, b.cy, 4, -Math.PI / 2, Math.PI, [60, 160], [1, 2], [0.2, 0.3], [b.color.base], 0.3);   // (taken again: a new crowd)
    this.swarm = Array.from({ length: n }, (_, k) => { const b = new Body(designById('round'), cols[k % cols.length], H.cx, H.cy, SWARM.size * R, 0.6); b.thread = true; b.ghost = true; b.gScale = 0; b.sticky = false; return b; });
    fx.ring(H.cx, H.cy, SWARM.orbit * R, INK.white); sound.play('spring', 0.8, 1.4); shake.add(4);
  }
  // Each pops the enemies it touches and smashes the blocks it meets over the hero's feet (not the ledge it stands on).
  swarmStep() {
    const H = this.hero, R = this.R, lv = this.lv, n = this.swarm.length, home = this.gunT < SWARM.back, on = (r, q) => q.x1 > r.x0 && q.x0 < r.x1 && Math.abs(q.y1 - r.y0) < 1;
    this.swarm.forEach((b, k) => {
      const a = lv.t * SWARM.spin + (k / n) * TAU, rr = SWARM.orbit * R * (home ? this.gunT / SWARM.back : 0.85 + 0.15 * Math.sin(lv.t * 5 + k));
      setVel(b, (H.cx + Math.cos(a) * rr - b.cx) * 10, (H.cy + Math.sin(a) * rr - b.cy) * 10); b.wake();
      if (!(lv.t - (b.tk || -1) < 0.03)) { b.tk = lv.t; (b.trail = b.trail || []).push([b.cx, b.cy]); if (b.trail.length > SWARM.trail) b.trail.shift(); }   // its trail (user)
      for (const e of lv.enemies.slice()) if (Math.hypot(e.body.cx - b.cx, e.body.cy - b.cy) < e.body.R + b.R) this.zap(e, [b.color.base, INK.white]);
      if (lv.kind === 'well') for (const r of lv.near(b.minY, b.maxY).slice()) {
        if (r.cap || r.spring || r.plank || r.y0 >= H.maxY - 2 || r.x1 < b.minX || r.x0 > b.maxX || r.y1 < b.minY || r.y0 > b.maxY) continue;
        if (!lv.rects.some((q) => q.spring && on(r, q)) && !lv.bubbles.some((q) => on(r, q))) this.smash(r, 0.4);
      }
    });
  }
  // A cracked block (a stash's way in, see 'X') gives at a head-butt from below, for good: broken just before it is met, so the jump goes on in.
  cracks() {
    const H = this.hero, R = this.R, up = 0.3 * R - H.rigVy * STEP;
    for (const r of this.lv.near(H.minY - up, H.minY).slice()) if (r.crack && r.y1 <= H.minY + 2 && r.x1 > H.minX + 0.3 * R && r.x0 < H.maxX - 0.3 * R) this.crack(r);
  }
  crack(r) {
    r.gone = true; r.crack = false;
    crumbleFx(r, this.lv.theme.block, true); fx.ring((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (r.key ? 2.4 : 1.4) * this.R, INK.coin);
    if (r.key) { crumbleFx(r, this.lv.theme.block, true); sound.play('bosshit', 0.8, 0.7); }   // a gate's keystone: heavier
    sound.play('crumble', 1, 0.9); sound.play('coin', 0.6, 1.3); shake.add(r.key ? 7 : 3); haptics.buzz(r.key ? 35 : 20);
  }
  gated() { const H = this.hero; return this.lv.near(H.cy - view.h, H.cy).some((r) => r.key); }   // a whole gate over the hero, within a screen (see GATE)
  // The boost ring (RING): through it the hero rockets up a quarter of the level through all, smashing what breaks and popping
  // the enemies it meets, safe meanwhile; it ends once that high and clear of every ledge.
  ringStep(dt) {
    const H = this.hero, lv = this.lv, R = this.R;
    if (!this.rocket) {
      for (const rg of lv.rings) if (!rg.used && Math.hypot(H.cx - rg.x, H.cy - rg.y) < RING.r * R) {
        rg.used = true; this.rocket = { to: H.cy - RING.lift * Math.max(lv.floor - lv.endY, 10 * R) };
        fx.ring(rg.x, rg.y, 2.4 * R, INK.coin); fx.ring(rg.x, rg.y, 1.6 * R, INK.white); shake.add(6); haptics.buzz(30); sound.play('spring', 1, 0.6); sound.play('combo', 0.8, 1.4);
      }
      return;
    }
    H.thread = true; H.gScale = 0; setVel(H, H.rigVx * 0.9, -RING.v * this.vjump); this.invuln = Math.max(this.invuln, 0.3);
    for (const r of lv.near(H.minY, H.maxY)) if (!r.gone && r.x1 > H.minX && r.x0 < H.maxX && this.smashable(r)) this.smash(r);   // what breaks, broken
    for (const e of lv.enemies.slice()) { const q = e.body; if (q.maxX > H.minX && q.minX < H.maxX && q.maxY > H.minY && q.minY < H.maxY) this.zap(e, [INK.coin, INK.white]); }
    sparkFx(H.cx, H.maxY, 3, Math.PI / 2, 0.5, [80, 200], [1.5, 3], [0.2, 0.4], [INK.coin, INK.white], 0.1);   // its trail
    const clear = !lv.near(H.minY - 2, H.maxY + 2).some((r) => !r.gone && r.x1 > H.minX - 2 && r.x0 < H.maxX + 2 && !r.plank);
    if (H.cy <= this.rocket.to && clear) { this.rocket = null; H.thread = false; H.gScale = 1; setVel(H, H.rigVx, -0.7 * this.vjump); this.invuln = Math.max(this.invuln, 1); this.sinceContact = JUMP.coyote + 1; }
  }
  // The level crossing (TRAIN): on screen it rests, then rings and flashes, then its train goes through left to right; a hero in its
  // band as it passes is hit (and knocked on along with it).
  crossStep(dt) {
    const cr = this.lv.crossing, lv = this.lv, H = this.hero;
    if (!cr || cr.y1 < lv.cam - view.h || cr.y0 > lv.cam + 2 * view.h) return;
    if (cr.state === 'rest' && (cr.t -= dt) <= 0 && cr.y1 > lv.cam && cr.y0 < lv.cam + view.h) { cr.state = 'warn'; cr.t = TRAIN.warn; sound.play('coin', 0.5, 0.5); }
    else if (cr.state === 'warn') { if (Math.floor((cr.t -= dt) * 4) !== Math.floor((cr.t + dt) * 4)) sound.play('coin', 0.45, 0.5); if (cr.t <= 0) { cr.state = 'pass'; cr.x = lv.l; shake.add(3); sound.play('crumble', 0.9, 0.4); } }
    else if (cr.state === 'pass') {
      cr.x += TRAIN.v * view.w * dt; shake.add(0.6);
      if (H.maxY > cr.y0 && H.minY < cr.y1 && H.cx < cr.x && H.cx > cr.x - TRAIN.len * (lv.r - lv.l)) this.hurt(1, -0.3, 'train');
      if (cr.x - TRAIN.len * (lv.r - lv.l) > lv.r) { cr.state = 'rest'; cr.t = TRAIN.rest[0] + Math.random() * (TRAIN.rest[1] - TRAIN.rest[0]); }
    }
  }
  bonk() { const H = this.hero; this.ram = false; sound.play('land', 0.8, 0.6); shake.add(2); sparkFx(H.cx, H.minY, 6, -Math.PI / 2, 1, [80, 220], [1.2, 2.4], [0.2, 0.35], [INK.white], 0.5); }
  // Letting go of the button on the way up makes a lower jump.
  releaseJump() {
    const H = this.hero;
    if (this.rising && this.state === 'play' && H.rigVy < 0) setVel(H, H.rigVx, H.rigVy * JUMP.cut);
    this.rising = false;
  }
  // Down: let go of a wall or a ceiling, with a nudge off it.
  pressDown() {
    if (this.state !== 'play') return;
    const H = this.hero, side = glueSide(H);
    if (!side) return;
    unstick(H, JUMP.dropAfter);
    addVel(H, side === 1 ? 2 * this.R : side === 2 ? -2 * this.R : 0, side === 4 ? 3 * this.R : 0);
  }
  // A dash (a double tap of a side, or a quick swipe): a burst that way, low and fast, with no jump to it —
  // along a floor (just lifted off it, its friction off for a moment), in the air once till a landing.
  dash(dir) {
    const H = this.hero;
    if (this.state !== 'play' || this.dashCD > 0) return;
    const floor = this.onFloor(), held = H.stuck > 0;
    if (!floor && !held && this.airDash >= this.mods.dashes) return;
    if (!floor && !held) this.airDash++;   // (a Double dash: two)
    if (held) unstick(H, 0.15);
    setVel(H, dir * JUMP.dash * this.R, floor ? -0.1 * this.vjump : Math.min(H.rigVy, 0.05 * this.vjump));
    this.dashT = 0.2; this.dashCD = JUMP.dashCD; this.rising = false;
    H.kickSquash(dir, 0, -1.6); fx.dust(H.cx - dir * H.R, H.maxY, IMPACT.puffSpeed + 600);
    sparkFx(H.cx - dir * H.R, H.cy, 10, dir > 0 ? Math.PI : 0, 0.5, [150, 380], [1.2, 2.6], [0.2, 0.4], [INK.white, H.color.base], 0.1);
    sound.play('airjump', 0.6, 1.25); haptics.buzz(8);
  }
  // Pressed against the side of a ledge whose top is level with its body (bar its very top): a hop just high
  // enough to come up over the edge, and on toward it.
  mantle(d) {
    const H = this.hero, lv = this.lv, R = this.R;
    if (this.mantleCD > 0 || H.rigVy < -0.5 * this.vjump) return;
    for (const r of lv.near(H.minY, H.maxY + R)) {
      if (r.plank || r.spring || r.gone) continue;
      const side = d > 0 ? r.x0 - H.maxX : H.minX - r.x1;   // the gap to its near side
      if (side < -0.55 * R || side > 0.35 * R || r.y0 < H.minY + 0.25 * R || r.y0 > H.maxY - 0.1 * R) continue;   // up to draped over its corner, not stood on it
      const lift = H.maxY - r.y0 + 0.55 * R, vy = -Math.sqrt(2 * WORLD.gravity * Math.max(lift, 0.3 * R));
      if (H.stuck) unstick(H, 0.12);
      setVel(H, d * MOVE.speed * R * 0.75, Math.min(H.rigVy, vy));
      this.mantleCD = JUMP.mantleCD; this.rising = false; H.kickSquash(0, 1, -0.8);
      sparkFx(H.cx, H.maxY, 5, Math.PI / 2, 1.2, [60, 160], [1, 2], [0.2, 0.3], [INK.white], 0.2);
      return;
    }
  }
  // A swipe to a side: up to a run's speed that way at once (the keys ease in; a swipe is too short to).
  nudge(dir) {
    const H = this.hero, want = dir * MOVE.speed * this.R;
    if (this.state === 'play' && !(H.stuck && glueSide(H) !== 4) && dir * H.rigVx < dir * want) addVel(H, want - H.rigVx, 0);
  }
  // Left and right run along a floor and steer in the air; while down is held nothing sticks.
  move(dt) {
    if (this.mods.dive && input.down && !this.downWas && this.sinceContact > JUMP.coyote && !this.contact()) { const H = this.hero; setVel(H, H.rigVx * 0.6, Math.max(H.rigVy, 1.4 * this.vjump)); this.diving = true; fx.ring(H.cx, H.minY, 1.2 * this.R, INK.white); sound.play('airjump', 0.6, 0.7); }   // the Dive: down at a press, a flick on touch too
    this.downWas = input.down;
    const H = this.hero, d = input.dir, floor = this.onFloor(), top = H.stuck > 0 && glueSide(H) === 4;
    H.pressX = d; H.crawl = top && d !== 0;   // only a body hanging from a ceiling alone creeps along it
    const crouch = input.down && floor;   // down on a floor: squashed flat, ready for a high jump (see jump)
    if (crouch !== this.crouch) { this.crouch = crouch; H.sqAx = 0; H.sqAy = 1; H.squeezeIn = crouch ? CROUCH.squeeze : 0; }
    if (input.down) H.stickCD = Math.max(H.stickCD || 0, 0.05);
    if (this.dashT > 0) this.dashT -= dt;
    if (this.dashCD > 0) this.dashCD -= dt;
    if (this.mantleCD > 0) this.mantleCD -= dt;
    if (d && this.state === 'play') this.mantle(d);
    H.fric = this.dashT > 0 ? 0 : floor && d ? (input.swipe ? 0 : MOVE.slip) : undefined;
    if (!d || (H.stuck && !top)) return;   // stuck to a wall it slides; under a ceiling it creeps along
    const dv = (d * (top ? MOVE.ceil : MOVE.speed) * this.R - H.rigVx) * Math.min(1, (floor || top ? MOVE.accel : MOVE.air) * (input.joy ? JOY.accel : 1) * dt);   // the stick eases in faster than the keys
    if (dv * d > 0 || (input.swipe && floor && !(this.dashT > 0))) addVel(H, dv, 0);   // toward the pressed side only, so a faster leap is not braked, bar a swipe's along a floor
  }

  // ── The fixed step ──
  step(dt) {
    const st = this.state;
    if (st !== 'play' && st !== 'menu' && st !== 'clear' && st !== 'won') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    const lv = this.lv, hero = this.hero, playing = st === 'play', h = dt / PHYS.substeps, sk2 = 2 * WORLD.skin;
    lv.update(dt, this);
    if (st === 'clear' && lv.portal) { this.suck(dt); this.followStep(); }
    if (playing) {
      this.activate();
      for (const e of lv.enemies) e.think(dt, this);
      if (lv.boss && !lv.boss.dead) lv.boss.think(dt, this);
    }
    if (this.invuln > 0) this.invuln -= dt;
    const hang = playing && aim.on && aim.hyb && aim.p > 0;   // the hybrid's aim shown: the hero hangs where it is, in the air or on a wall, till let go
    if (hang !== !!this.hang) { this.hang = hang; if (this.state !== 'clear') hero.gScale = hang ? 0 : 1; }   // (a hole's pull keeps its own)
    if (hang) setVel(hero, 0, 0);
    if (this.thrown && (hero.wallMask & (this.thrown > 0 ? 2 : 1))) { this.thrown = 0; this.wallHold = ROOM_THROW.hold; hero.kickSquash(1, 0, 1.6); shake.add(5); haptics.buzz(20); sound.play('land', 0.9, 0.7); }   // splat on the far wall,
    if (this.wallHold > 0) { this.wallHold -= dt; setVel(hero, 0, 0); }   // and held there a moment, no bounce back (then the wall as ever)
    if (playing) for (const r of lv.near(hero.cy - MAGNET.range * this.R, hero.cy + MAGNET.range * this.R)) if (r.magnet && hero.cx > r.x0 - this.R && hero.cx < r.x1 + this.R) {   // a magnet ledge pulls the hero in, more the nearer
      const d = hero.cy < r.y0 ? r.y0 - hero.maxY : hero.minY - r.y1, k = 1 - clamp(d / (MAGNET.range * this.R), 0, 1);
      if (d > 1) addVel(hero, 0, (hero.cy < r.y0 ? 1 : -1) * MAGNET.pull * this.R * k * dt);
    }
    if (playing) { this.ringStep(dt); this.crossStep(dt); }
    if (playing) { this.move(dt); if (this.ram) this.ramUp(); if (this.power('grow')) this.plough(dt); if (this.power('swarm')) this.swarmStep(); if (hero.rigVy < -40) this.cracks(); }
    this.warns = playing ? this.threats(dt) : [];
    const bs = this.bodyList(), puck = lv.boss && !lv.boss.dead && lv.boss.def && lv.boss.def.slide ? lv.boss.body : null;
    this.heroVy0 = hero.rigVy;   // as it came in: the contact below may already have bounced it (see meet)
    for (const b of bs) { if (b.stickCD > 0) b.stickCD -= dt; b.stepMaxY = b.maxY; b.touchHero = false; b.beginStep(dt); }
    hero.springHit = null; hero.rubber = 0;
    for (let s = 0; s < PHYS.substeps; s++) {
      for (const b of bs) { b.integrate(h, WORLD.maxSpeed); b.solve(h); b.updateBounds(); }
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const A = bs[i], B = bs[j];
        if (A.thread || B.thread) continue;   // a follower touches nothing
        if (puck && (A === puck || B === puck) && A !== hero && B !== hero) continue;   // the Puck slides through its own shells (a rolling one turns it over: rolling)
        if (A.maxX + sk2 < B.minX || B.maxX + sk2 < A.minX || A.maxY + sk2 < B.minY || B.maxY + sk2 < A.minY) continue;
        const withHero = A === hero || B === hero;
        const solid = lv.boss && !(lv.boss.def && (lv.boss.def.slide || lv.boss.def.rail)) && (A === lv.boss.body || B === lv.boss.body);   // but never through the boss: it would end up inside it, stuck (the Puck's dash, the Minecart's end would pin it to a wall)
        if (withHero && ((this.invuln > 0 && !solid) || !playing || A.ghost || B.ghost)) continue;   // a hit hero passes through for a moment, and a rolling shell through the hero
        if (collidePair(A, B) && withHero) (A === hero ? B : A).touchHero = true;
      }
      for (const b of bs) { if (!b.thread) b.collideLevel(lv, h); b.finishSubstep(h); b.updateBounds(); }
    }
    for (const b of bs) b.endStep(dt, this);
    if (this.contact()) {   // what a jump would push off
      const m = hero.wallMask;
      this.touch = m & 8 ? 0 : glueSide(hero) || (m & 1 ? 1 : m & 2 ? 2 : m & 4 ? 4 : 0);
      this.sinceContact = 0; this.air = this.mods.airJumps; this.airDash = 0; this.diving = false;
    } else this.sinceContact += dt;
    if (this.queueT > 0) { this.queueT -= dt; if (this.sinceContact === 0) this.jump(false, this.queued); }
    if (hero.springHit && hero.rigVy > -0.5 * SPRING.v * this.vjump) this.spring(hero.springHit);
    if (playing && hero.rubber && !(hero.wallMask & 8)) this.rubberHit(hero.rubber);   // standing, rubber is just a wall
    if (playing && lv.kind === 'well' && this.onFloor() && !hero.springHit) this.markSafe(hero.floorRect);
    if (playing && lv.kind === 'well') this.notice();
    if (playing) this.interact(dt);
  }
  // Enemies come alive a little above the screen and are forgotten far below it.
  activate() {
    const lv = this.lv, lim = lv.cam - 0.7 * view.h, far = lv.cam + 2 * view.h, low = lv.under ? lv.cam + 1.7 * view.h : Infinity;   // (the flip side is fallen: what is under the view is ahead)
    for (let i = lv.spawns.length - 1; i >= 0; i--) {
      const s = lv.spawns[i];
      if (s.y < lim || s.y > low) continue;
      lv.spawns.splice(i, 1);
      if (s.y < lv.cam + view.h || lv.under) lv.enemies.push(new Foe(s, lv));
    }
    if (!lv.under) for (let i = lv.enemies.length - 1; i >= 0; i--) if (lv.enemies[i].body.cy > far) lv.enemies.splice(i, 1);
    for (const f of lv.folk) if (!f.body && (f.kind === 'cage' || f.kind === 'trader') && f.y > lim && f.y < lv.cam + view.h + this.R) this.folkUp(f);
  }
  folkUp(f) {   // a cage's blob (a hero's colour, not this one's) or the trader (purple), standing on its ledge; the hero passes through them
    const lv = this.lv, R = this.R, cage = f.kind === 'cage', cols = PALETTE.filter((c) => c.id !== save.color), r = (cage ? 0.7 : 0.95) * R;
    const b = (f.body = new Body(designById(cage ? 'round' : 'mochi'), cage ? cols[(Math.random() * cols.length) | 0] : colorById('purple'), f.x, f.y - 1.05 * r, r, 0.9));
    b.gScale = 1; b.sticky = false; b.ghost = true; b.face.frown = cage;   // locked in: glum
    if (!cage) { f.p = { x: f.x, y: f.y - 3 * R, r: 0.6 * R, item: SHOP_ITEMS[(Math.random() * SHOP_ITEMS.length) | 0], sold: false, near: false, trader: f }; lv.pickups.push(f.p); }
  }
  // Folk (see FOLK): a cage opens at a touch and its blob hops for joy, paying coins or a heart by turns; the trader's thing
  // keeps over its head; critters keep clear of the hero.
  folkStep(dt) {
    const lv = this.lv, H = this.hero, R = this.R, near = (x, y, d) => Math.hypot(H.cx - x, H.cy - y) < d;
    for (let i = lv.folk.length - 1; i >= 0; i--) {
      const f = lv.folk[i], b = f.body;
      if (f.kind === 'cage' && b) {
        if (!f.open && H.maxX > b.cx - 0.95 * R && H.minX < b.cx + 0.95 * R && H.maxY > b.maxY - 1.9 * R && H.minY < b.maxY) this.free(f);
      } else if (f.kind === 'trader' && b && f.p) { f.p.x = b.cx; f.p.y = b.minY - 1.6 * R; }
      else if (f.kind === 'bat' || f.kind === 'crow') {   // a crow off its wire as a bat off its ledge
        if (!f.fly && near(f.x, f.y, FOLK.flee * R)) { f.fly = true; f.vx = (f.x < H.cx ? -1 : 1) * rand(80, 140); f.vy = -rand(140, 220); }
        if (f.fly) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y < lv.cam - 2 * R || f.x < lv.l - R || f.x > lv.r + R) lv.folk.splice(i, 1); }
      } else if (f.kind === 'bug') {
        const r = f.rect;
        if (r.gone) { lv.folk.splice(i, 1); continue; }
        if (!f.run && near(f.x, f.y, FOLK.flee * R)) { f.run = true; f.dir = f.x < H.cx ? -1 : 1; }
        f.x += f.dir * (f.run ? 3.5 : 0.5) * R * dt; f.t += dt;
        if (f.x < r.x0 + 0.2 * R || f.x > r.x1 - 0.2 * R) { if (f.run) { fx.dust(f.x, f.y, IMPACT.puffSpeed); lv.folk.splice(i, 1); continue; } f.dir = -f.dir; }   // at the end: turns round, or, running, is gone over it
      }
    }
  }
  // The freed follow the hero to the level's end as if on a thread (user): each its own place back along the hero's way
  // (a point every 0.4 R, four apart: 1.6 R), floating through everything, hurt by nothing; a stop stops them too.
  followStep() {
    const H = this.hero, R = this.R, tr = this.trail, last = tr[tr.length - 1];
    if (!last || Math.hypot(H.cx - last[0], H.cy - last[1]) > 0.4 * R) { tr.push([H.cx, H.cy]); if (tr.length > 120) tr.shift(); }
    this.followers.forEach((f, k) => { const b = f.body, [tx, ty] = tr[Math.max(0, tr.length - 1 - 4 * (k + 1))]; setVel(b, (tx - b.cx) * 8, (ty - b.cy) * 8); b.wake(); });
  }
  regroup() {   // the hero somewhere new (a door, a respawn): a way laid out beside it, toward the well's middle, for the freed to line up on
    const H = this.hero, R = this.R, lv = this.lv, d = H.cx < (lv.l + lv.r) / 2 ? 1 : -1;
    this.trail = Array.from({ length: 12 }, (_, k) => [H.cx + d * (12 - k) * 0.4 * R, H.cy]);
  }
  // Set pieces at work: a stalactite over the hero shakes and falls (a blob of lv.shots, so it hurts and breaks on what it
  // meets); an arena starts as the hero comes to its middle, sends its waves down, pays in big coins once they are all gone.
  setStep(dt) {
    const lv = this.lv, H = this.hero, R = this.R;
    for (let i = lv.icicles.length - 1; i >= 0; i--) {
      const c = lv.icicles[i];
      if (c.state === 'hang' && Math.abs(H.cx - c.x) < ICICLE.reach * R && H.minY > c.y && H.minY - c.y < ICICLE.below * R) { c.state = 'shake'; c.t = ICICLE.shake; sound.play('crumble', 0.4, 1.6); }
      else if (c.state === 'shake' && (c.t -= dt) <= 0) { lv.icicles.splice(i, 1); lv.shots.push({ x: c.x, y: c.y + 0.3 * R, vx: 0, vy: 0, r: ICICLE.r * R, icicle: true }); }
    }
    for (const a of lv.arenas) {
      if (a.done) continue;
      if (a.on && H.cy < a.y - view.h) { a.done = true; continue; }   // left behind (its waves pruned below): over, and nothing paid
      if (!a.on) { if (Math.abs(H.cx - a.x) < ARENA.reach * R && Math.abs(H.cy - a.y) < 2 * R && this.onFloor()) { a.on = true; ui.toast(t('arena'), 1600); sound.play('bubble', 1, 0.6); this.arenaWave(a); } continue; }
      if (a.foes.some((e) => lv.enemies.includes(e))) continue;
      if (a.wave < ARENA.waves.length) { ui.toast(tf('arenaWave', { n: a.wave + 1 }), 1200); this.arenaWave(a); continue; }
      if (this.rc && this.rc.mini && !a.mini) {   // the last wave a mini-boss (MINI): a big spitter, dropping in
        const floor = lv.rects.filter((r) => !r.gone && r.x0 < a.x && r.x1 > a.x && r.y0 > a.y).sort((p, q) => p.y0 - q.y0)[0], f = new Foe({ type: 'spitter', big: true, x: a.x, y: a.y - ARENA.drop * R, ledge: floor }, lv);
        a.mini = true; a.foes = [f]; lv.enemies.push(f); lv.foeTotal++; fx.ring(f.body.cx, f.body.cy, 2 * R, INK.spike); ui.toast(t('miniSpit'), 1600); sound.play('bubble', 1, 0.5); continue;
      }
      a.done = true; this.drop(a.x, a.y - R, ARENA.coins, 5); ui.toast(tf('arenaWon', { n: 5 * ARENA.coins }), 2000); sound.play('combo', 1, 1.1); shake.add(4);
    }
  }
  arenaWave(a) {   // the next wave drops in over the arena's floor: crawling enemies of this world that can be stomped
    const lv = this.lv, R = this.R, n = ARENA.waves[a.wave++], wd = this.wd, kinds = ((this.rc && this.rc.enemies) || Object.keys(wd.enemies || {})).filter((k) => ENEMY[k].move === 'crawl' && ENEMY[k].stomp && k !== 'mini');
    const floor = lv.rects.filter((r) => !r.gone && r.x0 < a.x && r.x1 > a.x && r.y0 > a.y).sort((p, q) => p.y0 - q.y0)[0];
    a.foes = [];
    for (let k = 0; k < n; k++) {
      const type = kinds.length ? kinds[(Math.random() * kinds.length) | 0] : 'crawler', f = new Foe({ type, x: a.x + (k - (n - 1) / 2) * 2.4 * R, y: a.y - ARENA.drop * R, ledge: floor }, lv);
      lv.enemies.push(f); lv.foeTotal++; a.foes.push(f); fx.ring(f.body.cx, f.body.cy, 1.2 * R, INK.spike);
    }
  }
  free(f) {
    const b = f.body, R = this.R, i = this.lv.folk.indexOf(f);
    f.open = true; b.face.frown = false; b.face.surprise = 1;
    if (i >= 0) this.lv.folk.splice(i, 1);
    b.thread = true; b.gScale = 0; this.followers.push(f);   // and off it goes after the hero (followStep)
    sparkFx(b.cx, b.maxY - R, 14, -Math.PI / 2, Math.PI, [120, 360], [1.4, 3], [0.3, 0.6], [INK.white, INK.coin], 0.6); fx.ring(b.cx, b.cy, 1.6 * R, INK.white);
    sound.play('crumble', 0.7, 1.3); sound.play('bubble', 0.9, 1.2); haptics.buzz(16);
    if (++this.freed % 2 === 0 && this.hp < this.maxHp) { this.heal(1); ui.hurt(); ui.toast(say('freed') + '\n' + t('freedHeart'), 2400); sound.play('buy'); }   // every second one a heart, if one is missing; a word from it first
    else { this.drop(b.cx, b.minY, FOLK.coins); ui.toast(say('freed') + '\n' + tf('freedCoins', { n: FOLK.coins }), 2400); }
  }
  interact(dt) {
    const lv = this.lv, H = this.hero;
    for (const e of lv.enemies.slice()) if (e.body.touchHero) this.meet(e);
    for (const e of lv.enemies.slice()) if (e.type === 'worm') this.wormTouch(e);
    this.rolling(dt);
    for (const e of lv.enemies) if (e.body.cy > lv.cam && e.body.cy < lv.cam + view.h) { if (!(save.book && save.book.foe && save.book.foe[e.type])) met('foe', e.type); if (STR.en['seen_' + e.type]) this.hint(e.type); }   // a new kind of enemy: told once, and into the book
    if (lv.boss && !lv.boss.dead && lv.boss.body.touchHero) this.meet(lv.boss);
    if (this.state !== 'play') return;
    if (this.bonus && (this.bonusT -= dt) <= 0) { this.endBonus('timeUp'); return; }
    this.spikes(); this.fireStep(dt); this.fireTouch();
    if (this.state !== 'play') return;   // the fire ended a bonus level
    this.shots(dt); this.collect(dt); this.gun(dt); this.folkStep(dt); this.followStep(); this.setStep(dt);
    for (const f of lv.folk) if (f.body && !f.open && f.y > lv.cam && f.y < lv.cam + view.h) this.hint(f.kind);   // a cage or a trader, told once
    if (!save.seen.crack) for (const r of lv.near(lv.cam + view.h * 0.2, lv.cam + view.h * 0.8)) if (r.crack) { this.hint('crack'); break; }
    if (this.combo > 0 && (H.wallMask & 8) && !H.springHit && !this.power('rainbow')) this.payCombo();   // only a floor ends a combo; a rainbow's runs on till it is over
    const near = (o, r) => Math.hypot(H.cx - o.x, H.cy - o.y) < r;
    if (lv.portal && near(lv.portal, lv.portal.r + 0.5 * H.R)) { this.levelClear(); return; }
    const inDoor = (d, m) => H.cx > d.x0 - m && H.cx < d.x1 + m && H.cy > d.y0 - m && H.cy < d.y1 + m;
    for (const b of lv.bubbles) if (b.cd <= 0 && inDoor(b, 0)) { this.enterRoom(b); return; }
    for (const sp of lv.spots) if (!sp.used && sp.kind === 'in' && near(sp, sp.r * this.R + 0.5 * H.R)) { this.enterUnder(sp); return; }
    if (lv.under && H.maxY > lv.floor - 3 && this.onFloor()) { this.leaveUnder(); return; }
    for (const sp of lv.spots) if (!sp.used && sp.kind === 'in' && sp.y > lv.cam && sp.y < lv.cam + view.h) this.hint('spot');   // told once
    if (lv.exit) {
      if (!lv.exit.armed && !inDoor(lv.exit, H.R)) lv.exit.armed = true;
      if (lv.exit.armed && inDoor(lv.exit, -0.3 * H.R)) { this.leaveRoom(); return; }
    }
    for (const p of lv.pickups) { const at = !p.sold && near(p, p.r + 0.8 * H.R * H.growth); if (at && !p.near) this.buy(p); p.near = at; }   // once per approach
    if (lv.kind === 'well' && !lv.under) { const m = (this.startY - H.cy) / (R_PER_M * this.R); if (m > this.levelM) { this.levelM = m; this.idleT = 0; } else if (!this.gated()) this.idleT += dt; }   // no new height: the fire speeds up
    if (H.minY > lv.cam + view.h - view.keep + (view.keep ? 0 : CAM.deathPad)) this.fall();   // off the bottom, or behind the touch keys
  }
  // From above it is a stomp; anything else is a hit.
  meet(e) {
    if (e.state === 'shell' || (e.type === 'mini' && e.t < 0.35)) return;   // a rolling shell, a mini just out of a splitter: harmless
    const H = this.hero, b = e.body, dy = b.cy - H.cy, dx = Math.abs(b.cx - H.cx), rel = Math.max(H.rigVy, this.heroVy0 || 0) - b.rigVy;   // coming down onto it as the step began counts: by its end the bodies' contact may have thrown the hero back up
    const above = (dy > STOMP.above * (H.R + b.R) && dy > dx * STOMP.slope && rel > STOMP.rel) || (dy > 0 && rel > 60 && dx < 0.95 * (H.R + b.R));   // from over it, or falling onto it
    const boss = e === this.lv.boss, can = boss ? e.open() : e.def.stomp;
    if (boss && e.def && e.def.top && !can && H.cy < b.cy - 0.2 * b.R && dx < b.R) { this.bounceOff(e); return; }   // the Puck's hard dome: a bounce, nothing more
    if (boss && e.def && e.def.rail && e.angry > 0) return;   // the Minecart red, just hit: it only pushes (a bounce off the moss over it lands on it again)
    if (boss && !(above && can) && (e.state === 'dazed' || e.state === 'rise')) return;   // flat on the floor, or getting up after the hero, it only pushes
    if (above && can) this.stomp(e); else if ((this.power('rainbow') || this.power('grow') || this.power('swarm')) && e !== this.lv.boss) this.zap(e, this.power('grow') ? [b.color.base, INK.white] : RAINBOW_INK);
    else if (this.ram && b.cy < H.cy && e !== this.lv.boss) this.kill(e, true);   // rammed from below: it goes like the block over it
    else if (boss && e.state === 'dive' && e.def && e.def.slide) this.hurt(-e.dir * 0.4, -1, 'boss');   // the Puck's dash: thrown up and back over it
    else if (boss && e.state === 'dive') this.hurt(Math.sign(H.cx - b.cx) || 1, 0, 'boss');   // landed on: thrown out to the side, not up into it
    else this.hurt(H.cx - b.cx, H.cy - b.cy, boss ? 'boss' : e.type);
  }
  bounceOff(e) {   // off a boss's hard top (BOSSES.puck): up and aside with a clang; the first time, a word on what does work
    const H = this.hero;
    setVel(H, H.rigVx + (Math.sign(H.cx - e.body.cx) || 1) * 2 * this.R, -0.8 * BOSS.bounce * this.vjump); unstick(H, 0.08);
    this.air = Math.max(this.air, 1); this.sinceContact = JUMP.coyote + 1; this.rising = false;
    fx.ring(H.cx, H.maxY, 1.2 * this.R, INK.white); sound.play('spring', 0.7, 1.6); haptics.buzz(10);
    if (!e.topped++) ui.toast(L2(e.def.top), 2600);
  }
  wormTouch(e) {   // a worm's tubes hurt (its knot is stomped, see meet); pouring itself over, the knot does too
    const H = this.hero, b = e.body, hr = H.R * H.growth * 0.8, pow = this.power('rainbow') || this.power('grow') || this.power('swarm');
    const hit = (x, y) => { if (pow) this.zap(e, [INK.flame, INK.spike, PAL.purple]); else this.hurt(H.cx - x, H.cy - y, 'worm'); };
    for (const tube of e.tubes(this.R, this.lv.t)) for (const [x, y, w] of tube) if (Math.hypot(H.cx - x, H.cy - y) < hr + w) { hit(x, y); return; }
    if (b.thread && Math.hypot(H.cx - b.cx, H.cy - b.cy) < hr + b.R) hit(b.cx, b.cy);
  }
  zap(e, inks) {   // a rainbow hero's touch: the enemy pops, in all the inks (a giant's: in its own)
    const b = e.body;
    this.kill(e, true);
    sparkFx(b.cx, b.cy, 18, -Math.PI / 2, Math.PI, [200, 600], [1.6, 3.6], [0.35, 0.7], inks, 0.8); fx.ring(b.cx, b.cy, 1.4 * this.R, INK.white);
    this.hitstop = Math.max(this.hitstop, 0.03); shake.add(3); sound.play('stomp', 0.9, 1.15 + 0.06 * Math.min(this.combo, 10));
  }
  stomp(e) {
    const H = this.hero, lv = this.lv, boss = e === lv.boss;
    if (boss) this.hitBoss();
    else if (e.type === 'shell') this.shellUp(e);
    else {
      this.kill(e, true);
      if (this.mods.blast) {
        const br = STOMP.blast * this.R * (this.diving && this.mods.meteor ? 2 : 1);   // a Meteor: twice as wide from a dive
        fx.ring(e.body.cx, e.body.cy, br, [1, 0.9, 0.6]);
        for (const o of lv.enemies.slice()) if (o.def.stomp && Math.hypot(o.body.cx - e.body.cx, o.body.cy - e.body.cy) < br) this.kill(o, true);
      }
    }
    setVel(H, H.rigVx * STOMP.keepVx, -(boss ? BOSS.bounce : STOMP.bounce * this.mods.bounce * (this.diving ? 1.3 : 1)) * this.vjump);   // from a dive, higher
    this.diving = false;
    unstick(H, 0.08); H.kickSquash(0, 1, 1.4);
    this.air = Math.max(this.air, 1); this.sinceContact = JUMP.coyote + 1; this.rising = false;
    if (this.queueT > 0) { this.queueT = 0; this.air--; this.jump(true, this.queued); }   // pressed just before landing on it
    this.hitstop = STOMP.hitstop; shake.add(3.5); haptics.buzz(14);
    const bx = e.body.cx, by = e.body.minY;   // squashed flat: a spray of its colour and white, and a ring
    sparkFx(bx, by, 18, -Math.PI / 2, 1.4, [200, 650], [1.6, 3.6], [0.35, 0.75], [e.body.color.base, INK.white, e.body.color.base], 0.85);
    fx.ring(bx, by, 1.4 * this.R, INK.white); fx.ring(bx, by, 0.9 * this.R, e.body.color.base);
    if (!boss) sound.play('stomp', 1, 1 + 0.06 * Math.min(this.combo, 10));   // higher with each stomp of a combo, as in Downwell
  }
  // A shell stomped: it rolls off away from the hero, into the others, and pops in a while.
  shellUp(e) {
    const b = e.body;
    e.state = 'shell'; e.shellT = SHELL.life; e.dir = b.cx >= this.hero.cx ? 1 : -1; b.kickSquash(0, 1, 2);
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo);
  }
  rolling(dt) {   // rolling shells knock out whatever they meet, and pop when their time is up
    const lv = this.lv;
    for (const e of lv.enemies.slice()) {
      if (e.state !== 'shell' || !lv.enemies.includes(e)) continue;
      const b = e.body;
      for (const o of lv.enemies.slice()) {   // bodies touching: their boxes meet (they push apart, so a pixel or two of slack)
        const q = o.body;
        if (o !== e && q.maxX > b.minX - 3 && q.minX < b.maxX + 3 && q.maxY > b.minY - 3 && q.minY < b.maxY + 3) { this.kill(o, true); shake.add(2); }
      }
      const bs = lv.boss, q = bs && bs.body;   // into the Puck: it turns over (Boss.flip), and the shell is spent
      if (q && !bs.dead && bs.def && bs.def.slide && bs.state !== 'dazed' && bs.state !== 'rise' && q.maxX > b.minX - 3 && q.minX < b.maxX + 3 && q.maxY > b.minY - 3 && q.minY < b.maxY + 3) { this.kill(e, true); bs.flip(); continue; }
      if ((e.shellT -= dt) <= 0) this.kill(e, true);
    }
  }
  kill(e, byHero) {
    const lv = this.lv, i = lv.enemies.indexOf(e);
    if (i < 0) return;
    if (byHero && e.hp > 1) {   // a mini-boss (MINI): a heart less, by whatever the hero hit it with
      e.hp--; e.body.kickSquash(0, 1, 2.2); sound.play('bosshit', 0.8, 1.3); ui.toast(tf('bossLeft', { n: e.hp }), 900);
      this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo); return;
    }
    lv.enemies.splice(i, 1);
    const b = e.body;
    juiceFx(b.cx, b.cy, b.R, b.color.base); splatFx(b.cx, b.cy, b.R, b.color.base);   // it bursts like ripe fruit (user)
    if (e.type === 'skull') sparkFx(b.cx, b.cy - 0.3 * b.R, 16, -Math.PI / 2, Math.PI, [150, 450], [1.5, 3.2], [0.4, 0.8], [PAL.white, PAL.white, PAL.gray], 0.9);   // its bone in bits, over the goo
    this.drop(b.cx, b.cy, Math.round(e.def.coins * this.mods.coinMul));
    if (e.type === 'splitter' && byHero) for (const d of [-1, 1]) {   // in two, thrown apart
      const m = new Foe({ type: 'mini', x: b.cx + d * 0.5 * b.R, y: b.cy, ledge: e.ledge, dir: d }, lv);
      setVel(m.body, d * 3 * this.R, -4 * this.R); lv.enemies.push(m); lv.foeTotal++;
    }
    if (byHero) { lv.foeKilled++; this.kills++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo); }
    sparkFx(b.cx, b.cy, 10 + 2 * Math.min(this.combo, 8), -Math.PI / 2, Math.PI, [150, 480], [1.5, 3.5], [0.3, 0.6], [b.color.base, INK.white], 0.8);   // every kill bursts, the more the longer the combo
    if (byHero) shake.add(1.5 + 0.5 * Math.min(this.combo, 8));
  }
  hitBoss() {
    const bs = this.lv.boss, b = bs.body;
    bs.hp--; this.drop(b.cx, b.cy, 5); shake.add(5); sound.play('bosshit', 1, bs.hp > 0 ? 1 : 0.7); splatFx(b.cx, b.maxY - b.R * 0.3, b.R * 0.5, b.color.base, 6);
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); ui.comboPop(this.combo);
    if (bs.hp > 0) { bs.angry = BOSS.angry; b.color = FOE_COLOR.red; b.growthTarget = 1 - 0.06 * (bs.max - bs.hp); ui.toast(tf('bossLeft', { n: bs.hp })); if (bs.state === 'dazed') bs.rise(); return; }
    bs.dead = true; this.kills++; met('boss', this.rc && this.rc.boss ? this.rc.boss : 'lid'); delete save.camp.fails[this.failKey()];
    if (bs.def) ui.toast(L2(bs.def.defeat), 2200);
    splatFx(b.cx, b.cy, b.R * 1.4, FOE_COLOR.boss.base, 24); shake.add(9); haptics.buzz(60);
    this.drop(b.cx, b.cy, BOSS.coins);
    for (const o of this.lv.enemies.slice()) this.kill(o, false);
    this.lv.shots.length = 0;
    this.invuln = BOSS.winDelay + 1; this.winT = BOSS.winDelay;
  }
  drop(x, y, n, v = 1) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = COIN.burst * rand(0.6, 1.25);
      this.lv.coins.push({ x, y, v, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drop: true, moving: true, t: 0, ph: rand(0, TAU) });
    }
  }
  // What is about to come down into view over its top edge, by where (x) it comes in, for a sign there (the market review:
  // a death by what could not be seen angers players most; the digest §2: the player must be the one to blame). A blob over
  // the top always comes down; a stalactite over it shaking falls; an enemy only on its way down, in view within ~1 s and
  // with its surface reaching into view (none leaves its own: one settling onto a ledge over the top is no threat yet, nor
  // one standing there: the camera keeps most of the view over the hero, so it is seen in time; a rolling shell is harmless).
  // A wall's crawler goes by its own way (its pulses would make the sign blink), a circler not at all (round its block it
  // comes and goes), and a sign once up stays 0.4 s: no blink as the camera brings one in (the digest: flashes).
  threats(dt) {
    const lv = this.lv, cam = lv.cam, R = this.R, out = [];
    for (const s of lv.shots) if (s.y + s.r < cam) out.push(s.x);
    for (const c of lv.icicles) if (c.state === 'shake' && c.y < cam) out.push(c.x);
    for (const e of lv.enemies) {
      const b = e.body, l = e.ledge, wall = e.def.move === 'wall';
      const low = wall ? e.wall.y1 + b.R : l && !l.gone ? l.y0 : Infinity;   // the lowest it can get to
      const vy = wall ? e.dir * e.def.speed : b.rigVy;
      const due = e.def.move !== 'round' && e.state !== 'shell' && b.maxY < cam && low > cam && vy > R && cam - b.maxY < 1.2 * vy;
      if (due || (e.warnT > 0 && e.warnT < 0.4)) { e.warnT = (e.warnT || 0) + dt; out.push(b.cx); } else e.warnT = 0;
    }
    return out;
  }
  hurt(dx, dy, by = 'other') {
    if (this.invuln > 0 || this.power('rainbow') || this.power('swarm') || this.state !== 'play') return false;
    const H = this.hero, d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const lost = this.loseHeart();
    this.lastBy = by;
    track('hero_hit', { by, fatal: this.hp <= 0, ...this.at() });
    this.invuln = HEALTH.invuln + this.mods.invuln;
    setVel(H, dx * HEALTH.knock, Math.min(dy * HEALTH.knock, 0) - HEALTH.knock * 0.45);
    unstick(H, 0.3); H.face.surprise = 1; H.kickSquash(dx, dy, 2); this.rising = false;
    this.hitstop = HEALTH.hitstop; shake.add(7); haptics.buzz(40); if (lost) ui.hurt();
    if (this.hp > 0) sound.play('hurt');
    if (this.hp <= 0) this.die();
    return true;
  }
  // A heart lost to a hit or a fall: none in a bonus level; a plaster (an upgrade) takes a level's first; a learning level never
  // takes the last (the digest §3: no losing while learning). False: none was lost.
  loseHeart() {
    if (this.bonus) return false;
    if (this.plasters > 0) { this.plasters--; fx.ring(this.hero.cx, this.hero.cy, 1.6 * this.R, INK.white); sound.play('bubble', 0.8, 1.3); return false; }
    if (this.rc && this.rc.safe && this.hp <= 1) return false;
    this.hp--; return true;
  }
  room() { return Math.max(CAM.floorShow, view.keep + CAM.keep * 2 * this.R); }   // what the camera keeps under the hero: the keys and CAM.keep heights more
  // The last few ledges the hero stood on (null: the floor), with where on them. Crumbling
  // ones and springs do not count, nor a spot beside spikes; a ledge kept here is never
  // pruned, so a fall after a long wall climb still finds it.
  markSafe(r) {
    const H = this.hero, x = H.cx;
    if (r && (r.crumble || r.spring || r.cap || r.gone)) return;
    if (r) for (const s of this.lv.spikes) if (s.dir === 0 && Math.abs(s.y1 - r.y0) < 1 && s.x1 > x - H.R && s.x0 < x + H.R) return;
    const last = this.safes[this.safes.length - 1], dx = r ? x - r.x0 : x;
    if (last && last.r === r) { last.dx = dx; return; }
    if (r) r.safe = true;
    this.safes.push({ r, dx });
    if (this.safes.length > 4) this.safes.shift();
  }
  // Where a fall comes back to: the newest of those ledges still there, a little above it.
  safeSpot() {
    const lv = this.lv, R = this.R;
    for (let i = this.safes.length - 1; i >= 0; i--) {
      const s = this.safes[i], r = s.r;
      if (r && r.gone) continue;
      if (!r) return { x: clamp(s.dx, lv.l + R, lv.r - R), y: lv.floor - 1.1 * R };
      const lo = r.x0 + 0.9 * R, hi = r.x1 - 0.9 * R;
      return { x: lo > hi ? (r.x0 + r.x1) / 2 : clamp(r.x0 + s.dx, lo, hi), y: r.y0 - 1.1 * R };
    }
    return { x: (lv.l + lv.r) / 2, y: lv.floor - 1.1 * R };
  }
  // Off the bottom of the screen: a heart, and back onto that ledge with the camera and a
  // moment of safety; the combo under way is lost, and fire over the ledge sinks below it.
  failKey() { return this.mode === 'camp' ? this.ci : 'lid'; }   // whose losses running (save.camp.fails): a campaign boss's by its level, the summit's as one
  levelId() { return this.mode === 'camp' ? (this.world + 1) + '-' + (this.stage + 1) + ['L', '', 'R'][this.ci % 3] : this.bonus ? 'B' + (this.world + 1) : this.world >= WORLDS.length ? 'boss' : (this.world + 1) + '-' + (this.stage + 1); }
  at() { return { level_id: this.levelId(), height: Math.round(this.levelM) }; }   // the analytics' where
  lvl() { return { world: this.wd.id, level: this.mode === 'camp' ? String(this.stage + 1) : this.bonus ? 'bonus' : this.world >= WORLDS.length ? 'boss' : String(this.stage + 1) }; }   // the same, as the platform's messages take it
  learning() { return this.world === 0 && this.stage === 0 && !this.bonus && this.lv.t < 60; }   // the first minute of 1-1: a fall or the fire costs no heart (the digest §6)
  fall() {
    if (!this.learning() && this.loseHeart()) { ui.hurt(); this.lastBy = 'fall'; track('hero_hit', { by: 'fall', fatal: this.hp <= 0, ...this.at() }); }
    haptics.buzz(40); shake.add(5);
    if (this.hp <= 0) { this.die(); return; }
    sound.play('fall', 0.8);
    this.respawn();
  }
  respawn() {   // onto the last safe ledge, the camera with it
    const lv = this.lv, sp = this.safeSpot();
    this.combo = 0; ui.comboEnd(); this.rising = false;
    this.placeHero(sp.x, sp.y); this.regroup();
    this.invuln = HEALTH.invuln + this.mods.invuln; this.air = 0; this.queueT = 0; this.sinceContact = JUMP.coyote + 1;
    lv.cam = Math.max(Math.min(this.hero.cy - CAM.anchor * view.h, lv.floor + this.room() - view.h), lv.capY - CAM.top);
    if (lv.fire) { lv.fire.y = Math.max(lv.fire.y, sp.y + 0.45 * view.h); lv.fire.warn = null; }
    this.idleT = 0;
    ui.flash();
  }
  spikes() {
    const H = this.hero;
    for (const s of this.lv.spikes) {
      if (s.x1 < H.minX || s.x0 > H.maxX || s.y1 < H.minY - 1 || s.y0 > H.maxY + 1) continue;
      let hit = false;
      for (let i = 0; i < H.n && !hit; i++) hit = H.x[i] > s.x0 && H.x[i] < s.x1 && H.y[i] > s.y0 - 1 && H.y[i] < s.y1 + 1;
      if (!hit || (s.dir === 0 && this.mods.iron)) continue;
      const p = SPIKE_PUSH[s.dir];
      this.hurt(p[0], p[1], 'spikes');
      return;
    }
  }
  // The fire spits at the hero while its top is on screen (a tongue flares where the blob will come
  // out first), throws up embers, and burns the enemies it rises over.
  fireStep(dt) {
    const lv = this.lv, f = lv.fire, H = this.hero, R = this.R;
    if (!f) return;
    if (f.warn) {
      if ((f.warn.t -= dt) <= 0) {   // up to about the hero's height, across to where it is
        const x = f.warn.x, vy = -Math.sqrt(2 * SHOT_G * Math.max(2 * R, f.y - H.cy + rand(-0.5, 1) * R)), t = -vy / SHOT_G;
        lv.shots.push({ x, y: f.y, vx: (H.cx + rand(-0.8, 0.8) * R - x) / t, vy, r: FIRE.blob * R, fire: true });
        f.warn = null; sound.play('spit', 0.7);
      }
    } else if (f.y < lv.cam + view.h && (f.spitT -= dt * this.mods.fire) <= 0) {
      f.warn = { x: clamp(H.cx + rand(-2.5, 2.5) * R, lv.l + R, lv.r - R), t: FIRE.warn };
      f.spitT = rand(FIRE.spit[0], FIRE.spit[1]);
    }
    if (f.y < lv.cam + view.h + R && Math.random() < dt * 14) fx.add(rand(lv.l, lv.r), f.y + rand(0, 6), rand(-25, 25), rand(-150, -50), rand(2, 3.5), rand(0.5, 0.9), Math.random() < 0.5 ? INK.fire : INK.flame, 1, 0);
    for (let i = lv.enemies.length - 1; i >= 0; i--) {
      const b = lv.enemies[i].body;
      if (b.cy > f.y) { splatFx(b.cx, f.y, b.R, INK.flame, 8); lv.enemies.splice(i, 1); }   // marmalade burns: no coins for it
    }
  }
  // Fire burns: a heart, and a throw back up even through a hit's safe moment; then it sinks a little.
  fireTouch() {
    const f = this.lv.fire, H = this.hero;
    if (!f || H.maxY < f.y) return;
    if (this.bonus) { this.endBonus('caught'); return; }   // the fire race: caught is the end of it
    if (this.fireFree > 0 && this.invuln <= 0) { this.fireFree--; this.invuln = HEALTH.invuln; fx.ring(H.cx, H.cy, 1.6 * this.R, INK.white); setVel(H, H.rigVx, -0.9 * this.vjump); sound.play('burn'); return; }   // a Fire walker: its first touch a level, free
    if (!this.learning()) this.hurt(0, -1, 'fire');
    sound.play('burn');
    if (this.state !== 'play') return;
    setVel(H, H.rigVx * 0.5, -FIRE.launch * this.vjump); unstick(H, 0.2); this.rising = false;
    splatFx(H.cx, f.y, this.R * 0.7, INK.flame, 6);
    f.y = Math.max(f.y, H.maxY + FIRE.back * view.h); f.warn = null;   // and sinks back: a throw into a ceiling must not land in it again
  }
  // A fizz candy taken, the hero shoots by itself for a while: at the nearest enemy or blob in range.
  power(k) { return this.gunT > 0 && this.pow === k; }   // a candy at work
  take(kind) {   // one candy at a time: a new one takes over, the same one starts again
    if (this.gunT > 0 && this.pow !== kind) this.powerEnd();   // a rainbow or a giant cut short still ends safely
    met('candy', kind);
    this.pow = kind; this.gunMax = this.gunT = CANDY[kind].time + this.mods.gun; this.gunCD = 0; this.ram = false;
    if (kind === 'grow') { this.hero.growthTarget = GROW.size; fx.ring(this.hero.cx, this.hero.cy, 2.4 * this.R, INK.white); sound.play('spring', 0.8, 0.6); shake.add(4); }
    if (kind === 'rainbow' || kind === 'swarm') this.invuln = 0;   // a hit's blink would let enemies through untouched
    if (kind === 'swarm') this.swarmUp();
    ui.toast(tf('got_' + kind, { s: Math.round(this.gunT) }), 2200, kind);   // each time: its picture, what it does, for how long
  }
  powerEnd() {   // run out; after the rainbow a moment of the usual safety, so the crowd it was ploughing through does not hit at once
    if (this.pow === 'rainbow') { this.invuln = Math.max(this.invuln, RAINBOW.grace); fx.ring(this.hero.cx, this.hero.cy, 1.6 * this.R, INK.white); sound.play('bubble', 0.6, 0.8); }
    if (this.pow === 'swarm') { for (const b of this.swarm) sparkFx(b.cx, b.cy, 6, -Math.PI / 2, Math.PI, [80, 220], [1.2, 2.4], [0.2, 0.4], [b.color.base, INK.white], 0.4); this.swarm = []; this.invuln = Math.max(this.invuln, RAINBOW.grace); sound.play('bubble', 0.6, 1.1); }   // home, and a moment of safety
    if (this.pow === 'grow') { this.hero.growthTarget = 1; this.invuln = Math.max(this.invuln, GROW.grace); fx.ring(this.hero.cx, this.hero.cy, 2.4 * this.R, INK.white); sound.play('bubble', 0.7, 0.7); }   // back to size, and a while blinking
    this.pow = null; this.ram = false;
  }
  gun(dt) {
    const lv = this.lv, H = this.hero, R = this.R;
    for (const p of lv.fizz || []) if (!p.taken && Math.hypot(H.cx - p.x, H.cy - p.y) < p.r + 0.8 * H.R * H.growth) {   // (a giant's reach is its size)
      p.taken = true; this.take(p.kind || 'fizz');
      fx.ring(p.x, p.y, 1.4 * R, INK.coin); sound.play('buy'); haptics.buzz(14);
    }
    if (this.gunT > 0 && (this.gunT -= dt) <= 0) this.powerEnd();
    if (this.power('fizz') && (this.gunCD -= dt) <= 0) {
      let best = null, bd = GUN.range * R;
      for (const e of lv.enemies) { const d = Math.hypot(e.body.cx - H.cx, e.body.cy - H.cy); if (d < bd) { bd = d; best = [e.body.cx, e.body.cy]; } }
      for (const s of lv.shots) { const d = Math.hypot(s.x - H.cx, s.y - H.cy); if (d < bd) { bd = d; best = [s.x, s.y]; } }
      if (best) {
        const dx = (best[0] - H.cx) / bd, dy = (best[1] - H.cy) / bd;
        lv.bullets.push({ x: H.cx + dx * H.R, y: H.cy + dy * H.R, vx: dx * GUN.speed * R, vy: dy * GUN.speed * R, t: 0 });
        this.gunCD = GUN.every; sound.play('shot', 0.35, 0.9 + Math.random() * 0.2);
      }
    }
    for (let i = lv.bullets.length - 1; i >= 0; i--) {   // a bullet: through the air until it meets an enemy, a blob or a block
      const b = lv.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
      let gone = b.t > 1 || b.y < lv.cam - R || b.y > lv.cam + view.h + R;
      for (const r of lv.near(b.y, b.y)) if (!r.plank && b.x > r.x0 && b.x < r.x1) { gone = true; if (r.crumble) r.hit = true; }
      if (b.x < lv.l || b.x > lv.r) gone = true;
      for (const e of lv.enemies.slice()) { const q = e.body; if (!gone && b.x > q.minX && b.x < q.maxX && b.y > q.minY && b.y < q.maxY) { this.kill(e, true); gone = true; } }
      for (let k = lv.shots.length - 1; k >= 0 && !gone; k--) { const s = lv.shots[k]; if (Math.hypot(s.x - b.x, s.y - b.y) < s.r + GUN.r * R) { splatFx(s.x, s.y, s.r * 2, INK.spike, 4); lv.shots.splice(k, 1); gone = true; } }
      if (gone) lv.bullets.splice(i, 1);
    }
  }
  shots(dt) {
    const lv = this.lv, H = this.hero, sh = lv.shots;
    for (let i = sh.length - 1; i >= 0; i--) {
      const s = sh[i];
      s.vy += SHOT_G * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      let gone = s.y > lv.floor || s.y > lv.cam + view.h + 100 || (s.vy > 0 && lv.fire && s.y > lv.fire.y);   // a blob falls into the fire
      for (const r of lv.near(s.y, s.y)) if (!r.plank && s.x > r.x0 && s.x < r.x1) gone = true;
      if (Math.hypot(H.cx - s.x, H.cy - s.y) < H.R * H.growth * 0.8 + s.r) { this.hurt(H.cx - s.x, H.cy - s.y, s.icicle || s.rock ? 'icicle' : s.fire ? 'fire_blob' : 'shot'); gone = true; }
      if (gone) { splatFx(s.x, s.y, s.r * 2, s.fire ? INK.flame : INK.spike, 4); sh.splice(i, 1); }
    }
  }
  collect(dt) {
    const H = this.hero, cs = this.lv.coins, mR = COIN.magnet * this.R * this.mods.magnet, cr = COIN.r * this.R, k = Math.exp(-COIN.drag * dt);
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      const dx = H.cx - c.x, dy = H.cy - c.y, d = Math.hypot(dx, dy) || 1;
      if (!c.drop && !c.moving && d < mR) { c.moving = true; c.t = COIN.home; }   // in the magnet's reach: on its way in for good
      const home = c.drop ? (c.t += dt) > COIN.home : c.moving && (c.t += dt);
      if (home) {   // an enemy's, its burst over, or one the magnet caught: on to the hero wherever it is, ever faster
        const sp = COIN.seek * (1 + 3 * (c.t - COIN.home)) + Math.hypot(H.rigVx, H.rigVy), f = 1 - Math.exp(-COIN.steer * dt);
        c.vx += ((dx / d) * sp - c.vx) * f; c.vy += ((dy / d) * sp - c.vy) * f;
      }
      if (c.moving) { if (!home) { c.vx *= k; c.vy *= k; } c.x += c.vx * dt; c.y += c.vy * dt; }
      if (d < H.R * H.growth * 0.85 + (c.v > 1 ? 1.4 : 1) * cr && !(c.drop && c.t < COIN.home)) {   // a dropped one only once its burst is over: a combo's fountain is seen
        cs.splice(i, 1); this.coins += c.v; if (!c.drop) this.lv.coinsTaken++; fx.ring(c.x, c.y, cr * 1.6, INK.coin); sparkFx(c.x, c.y, c.v > 1 ? 14 : 8, -Math.PI / 2, Math.PI, [110, c.v > 1 ? 420 : 300], [1.2, 2.4], [0.25, 0.5], [INK.coin, INK.white, INK.coinD], 0.1); ui.coinBump(); sound.play('coin', 0.6, c.v > 1 ? 0.8 : 1); }
    }
  }
  payCombo() {
    const n = this.combo, s = this.mods.comboShift;
    this.combo = 0; ui.comboEnd();
    let rw = null;
    for (const c of COMBO) if (n >= c.at - s) rw = c;
    if (!rw) return;
    const pay = rw.coins * ((this.bonus && this.bonus.comboMul) || 1), H = this.hero;
    this.drop(H.cx, H.minY, pay / 5, 5);   // out of the hero as big coins that fly back in: the reward seen (every reward is a multiple of 5)
    sparkFx(H.cx, H.minY, Math.min(36, 6 + 3 * n), -Math.PI / 2, 0.9, [250, 650], [1.5, 3.5], [0.4, 0.8], [INK.coin, INK.coinD, INK.white], 1); shake.add(rw.hp ? 6 : 3);
    if (rw.hp) this.heal(rw.hp);
    ui.toast(tf('comboPay', { n, c: pay }) + (rw.hp ? '  ' + t('comboHp') : ''), 1600);
    haptics.buzz(18); sound.play('combo');
  }
  // The first touch of each kind of surface, and the first sight of the fire, told once ever.
  notice() {
    const H = this.hero, lv = this.lv, m = H.wallMask, fr = H.floorRect;
    const coat = m & 1 ? lv.coatAt(1, H.cy) : m & 2 ? lv.coatAt(2, H.cy) : null;
    if (coat) this.hint(coat);
    if (fr && (m & 8)) { if (fr.crumble) this.hint('crumble'); else if (fr.slick) this.hint('ice'); }
    if (lv.fire && lv.fire.y < lv.cam + view.h) this.hint('fire');
    const how = coarse ? (save.stick ? 'S' : 'T') : 'K';   // the words for the controls in use
    if (H.stuck && (glueSide(H) === 1 || glueSide(H) === 2)) this.hint('wall', 'seen_wall' + how);   // stuck to a wall the first time: how to let go
    if (how !== 'T' && (m & 8) && this.idleT > 4 && !this.learning()) this.hint('crouch', 'seen_crouch' + how);   // standing about: there is a high jump (no down on the touch keys)
  }
  hint(kind, key = 'seen_' + kind) { if (save.seen[kind] || this.stateT < 3) return; save.seen[kind] = 1; persist(); ui.toast(t(key), 2400); }   // not over the level's banner
  spring(r) {
    const H = this.hero; this.hint('spring');
    setVel(H, H.rigVx, -(r.bouncy ? BOUNCY.v : SPRING.v) * this.vjump); unstick(H, 0.15); H.kickSquash(0, 1, -2.4); this.rising = false;   // (a bouncy plank: a softer throw)
    r.t = SPRING.anim; this.sinceContact = JUMP.coyote + 1; sound.play('spring', 0.8);
    fx.ring((r.x0 + r.x1) / 2, r.y0, this.R, this.lv.theme.spring); haptics.buzz(12);
  }
  // Off a rubber wall: thrown back the way it came and a little up, a wall jump nobody pressed.
  // Rubber sings (user): a note as the hero meets it and one every bit of the way it rolls along it, up a scale while it goes on.
  chime() { const t = this.lv.t; this.noteK = t - (this.noteT || -9) < 1.5 ? Math.min((this.noteK || 0) + 1, 9) : 0; this.noteT = t; sound.note(this.noteK); }
  rubberHit(side) {
    const H = this.hero, away = side === 1 ? 1 : -1, v = H.hitR[side - 1];
    if (this.lv.t - (this.rubT || -9) > 0.1 || Math.abs(H.cy - this.rubY) > 0.8 * this.R) { this.rubY = H.cy; this.chime(); }
    this.rubT = this.lv.t;
    if (v < RUBBER.min * this.R) return;
    setVel(H, away * Math.max(RUBBER.x * this.R, 0.8 * v), Math.min(H.rigVy, -RUBBER.up * this.vjump));
    unstick(H, 0.15); H.kickSquash(away, 0, 0.8); this.rising = false;
    sound.play('spring', 0.6, 1.3); fx.ring(side === 1 ? this.lv.l : this.lv.r, H.cy, 0.8 * this.R, this.lv.theme.rubber); haptics.buzz(10);
  }

  // ── Rooms behind bubbles (time stands still in the shaft meanwhile) ──
  enterRoom(bub) {
    if (!bub.room) {
      const room = new Level();
      room.reset({ kind: bub.kind, w: view.w, h: view.h, R: this.R, seed: (this.lv.rng() * 4294967296) >>> 0, world: this.lv.world, theme: bub.kind === 'treasure' ? THEMES.stash : THEMES.room, hard: this.hard });
      bub.room = room;
    }
    if (this.combo > 0) this.payCombo();
    this.bankDrops();   // in the purse at once: they are for the shop in there
    this.well = this.lv; this.door = bub; this.lv = bub.room; this.lv.exit.armed = false;
    this.placeHero(this.lv.exit.x, this.lv.exit.y - 0.2 * this.R); this.regroup();
    this.thrown = this.lv.exit.side === 1 ? 1 : -1; setVel(this.hero, this.thrown * ROOM_THROW.vx * this.R, -ROOM_THROW.up * this.vjump); this.rising = false;   // thrown hard across, onto the far wall, and stuck there (user)
    aimCancel(); ui.flash(); ui.toast(t(bub.kind), 1400); sound.play('bubble'); sound.play('airjump', 0.7, 0.6);
  }
  // Into the flip side (UNDER): a short shaft made whole at once, of this world's chunks, in the dark, with coins as rain and no
  // fire; the hero at its top. Its floor, a spot's pool, brings it back up (leaveUnder).
  enterUnder(sp) {
    const R = this.R, wd = Object.assign({}, this.bonus || this.wd, { bonus: true, rain: true, fire: 0, intro: null, coat: null, maxD: 2, foes: 0.7 * (this.wd.foes || 0.5) });
    sp.used = true;
    if (this.combo > 0) this.payCombo();
    this.bankDrops();
    const lv = new Level();
    lv.reset({ kind: 'well', w: view.w, h: view.h, R, seed: (this.lv.rng() * 4294967296) >>> 0, world: wd, stage: Math.min(this.stage, 2), hard: this.hard, height: UNDER.len * R_PER_M * R, theme: wd.theme });
    lv.ensure(-1e9); lv.portal = null; lv.under = true; lv.dark = true;   // all of it now; its way out is down; dark, lit by the hero and what glows (user: not white)
    const pool = lv.floor - 3 * R;   // its bottom an open pool: nothing over the floor there to stand on short of it
    lv.rects = lv.rects.filter((r) => r.cap || r.y1 < pool); lv.spikes = lv.spikes.filter((q) => q.y1 < pool); lv.spawns = lv.spawns.filter((q) => q.y < pool - R);
    lv.spots = [{ x: (lv.l + lv.r) / 2, y: lv.floor - 0.3 * R, r: 1.6, kind: 'out', used: false }];
    this.well = this.lv; this.door = sp; this.lv = lv;
    this.placeHero((lv.l + lv.r) / 2, lv.capY + 1.6 * R); this.regroup(); this.safes = [];
    lv.cam = this.hero.cy - 0.35 * view.h;
    aimCancel(); ui.flash(); ui.toast(t('under'), 1600); sound.play('bubble', 1, 0.6); haptics.buzz(20);
  }
  leaveUnder() {   // back up the level, UNDER.lift m over where it went in, on the highest steady ledge there
    const sp = this.door, well = this.well, R = this.R, ys = Math.max(sp.y - UNDER.lift * R_PER_M * R, well.endY + 6 * R);
    this.bankDrops();
    this.lv = well; this.well = null; this.door = null;
    well.ensure(ys - 2 * view.h);
    const r = well.rects.filter((q) => !q.cap && !q.plank && !q.crumble && !q.move && !q.spring && !q.crack && !q.gone && q.x1 - q.x0 > 2 * R && q.y0 >= ys && q.y0 < sp.y).sort((a, b) => a.y0 - b.y0)[0];
    if (r) { this.placeHero((r.x0 + r.x1) / 2, r.y0 - 1.1 * R); this.safes = [{ r, dx: (r.x1 - r.x0) / 2 }]; } else this.placeHero(sp.x, sp.y);
    well.cam = Math.max(this.hero.cy - CAM.anchor * view.h, well.capY - CAM.top); well.ensure(well.cam - view.h * LEVEL.ahead);
    this.regroup(); aimCancel(); ui.flash(); ui.toast(t('back'), 1400); sound.play('portal', 0.8, 1.2); haptics.buzz(20);
  }
  leaveRoom() {
    const bub = this.door, room = this.lv;
    this.lv = this.well; this.well = null; this.door = null;
    this.placeHero(bub.side === 1 ? bub.x1 + 1.2 * this.R : bub.x0 - 1.2 * this.R, bub.y1 - 1.1 * this.R); this.regroup();   // beside the door, on its ledge
    bub.cd = 1.2; aimCancel(); ui.flash(); ui.labels(null); sound.play('bubble', 0.8, 0.85);
    if (bub.kind === 'treasure' && !room.coins.length) {   // a stash with all its coins taken: its way in closes behind the hero
      this.lv.bubbles.splice(this.lv.bubbles.indexOf(bub), 1);
      sparkFx(bub.x, bub.y, 14, -Math.PI / 2, Math.PI, [80, 240], [1.5, 3], [0.3, 0.6], [this.lv.theme.wall, INK.white], 0.6); fx.dust(bub.x, bub.y1, IMPACT.puffSpeed + 500);
    }
  }
  buy(p) {
    const price = this.priceOf(p);
    if (p.item.can && !p.item.can(this)) { ui.toast(t('noNeed'), 1200); sound.play('deny', 0.7); return; }
    if (this.coins < price) { ui.toast(tf('poor', { n: price - this.coins }), 1200); haptics.buzz(8); sound.play('deny', 0.7); return; }
    this.coins -= price; p.sold = true; p.item.apply(this); sound.play('buy');
    track('item_bought', { id: p.item.id, price, from: p.trader ? 'trader' : this.lv.kind, level_id: this.levelId() });
    if (p.trader && p.trader.body) { const b = p.trader.body; b.face.surprise = 1; setVel(b, 0, -0.5 * this.vjump); }   // the trader hops: a sale
    splatFx(p.x, p.y, p.r * 2, p.item.color, 8); haptics.buzz(16);
    if (p.item.id !== 'upgrade') ui.toast(L2(p.item.name) + '\n' + tf('moti', { s: say('moti') }), 2200);   // and a word from Aunt Moti
  }

  // ── The run's turns ──
  levelClear() {
    joyEnd();   // a stick held into the hole lets go
    this.markDay();
    if (!this.bonus) { pmsg('level_completed', this.lvl()); track('level_stats', { level_id: this.levelId(), seconds: Math.round(this.lv.t), coins_taken: this.lv.coinsTaken, coins_total: this.lv.coinTotal, hp: this.hp }); }   // (a bonus level is done in endBonus, by its hole or not)
    this.state = 'clear'; this.stateT = 0;
    const H = this.hero;
    H.gScale = 0; H.sticky = false; unstick(H, 9); H.face.surprise = 1;   // and into the hole (see suck)
    if (this.combo > 0) this.payCombo();
    this.bankDrops();
    const lv = this.lv, allCoins = lv.coinsTaken >= lv.coinTotal, half = lv.coinsTaken >= STARS.half * lv.coinTotal;   // the stars, paid at once (not for a bonus level)
    if (!this.bonus) {
      this.stars = { n: 1 + half + allCoins, coins: [lv.coinsTaken, lv.coinTotal] };
      this.stars.pay = STARS.coins[this.stars.n - 1]; this.coins += this.stars.pay;
    }
    this.climbed += this.levelM; this.levelM = 0;
    if (this.mode === 'camp' && !this.bonus) this.campDone(this.stars.n);
    haptics.buzz(20); sound.play('portal');   // no toast: it would hide the hole
  }
  // The way out swallows the hero: pulled to the hole's middle on a tightening spiral, shrinking away.
  suck(dt) {
    const H = this.hero, p = this.lv.portal, dx = p.x - H.cx, dy = p.y - H.cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, this.stateT * 2);
    const sp = Math.min(PORTAL.pull * this.R * k, d * 10), turn = PORTAL.spin * this.R * (1 - k * 0.6);
    setVel(H, (dx / d) * sp - (dy / d) * turn, (dy / d) * sp + (dx / d) * turn);
    H.growthTarget = Math.max(0.04, 1 - this.stateT / PORTAL.shrink);
    for (const f of this.followers) f.body.growthTarget = H.growthTarget;   // the freed go in after it
  }
  pick(u) {
    if (this.state !== 'clear') return;   // a second tap
    this.takeUpgrade(u); track('upgrade_picked', { id: u.id, level_id: this.levelId() });
    if (this.mode === 'camp') { const b = save.camp.builds; (b[this.world] = b[this.world] || []).push(u.id); persist(); }   // the world's build
    this.state = 'wait'; ui.hideAll();   // (an ad may come here: nothing goes on under it)
    ads.between(() => {
      if (this.mode === 'camp') { ui.map(); return; }   // the map, to choose the way on
      this.state = 'play'; this.stateT = 0;
      if (this.stage === 2 && BONUS[this.world]) { this.startBonus(BONUS[this.world]); return; }   // a world done: its bonus level first
      if (++this.stage >= 3) { this.stage = 0; this.world++; }
      this.buildLevel(false); this.saveRun();
      ui.hideAll(); ui.banner();
    });
  }
  // A bonus level: against the clock, no hearts lost; then on to the next world.
  startBonus(b) {
    this.bonus = b; this.bonusT = (this.rc && this.rc.time) || b.time; this.bonusCoins = this.coins;   // (a campaign's on its recipe's clock)
    this.buildLevel(false); this.saveRun();
    ui.hideAll(); ui.toast(L2(b.name) + '\n' + L2(b.goal) + ' · ' + this.bonusT + ' ' + t('sec'), 2600);
  }
  markDay() {   // the day's first level cleared: the week's mark, and its pay at 3, 5 and 7 (MARKS)
    const m = save.marks = weekCard();
    if (m.days.includes(today)) return;
    m.days.push(today);
    const n = m.days.length, k = MARKS.at.indexOf(n);
    if (k >= 0) { this.coins += MARKS.pay[k]; setTimeout(() => ui.toast(tf('markPay', { n, c: MARKS.pay[k] }), 2200), 900); }   // after the hole's moment
    else setTimeout(() => ui.toast(tf('mark', { n }), 1800), 900);
    persist();
  }
  // An enemy's coins still on their way to the hero as a level or the run ends get there all the same.
  bankDrops() {
    for (const c of this.lv.coins) if (c.drop) this.coins += c.v;
    this.lv.coins = this.lv.coins.filter((c) => !c.drop);
  }
  // Out by the hole, out of time or caught: the level stands still under what it paid and an offer to double that for an ad.
  endBonus(why) {
    if (!this.bonus || this.state === 'reward') return;
    if (this.combo > 0) this.payCombo();   // a combo running (a rainbow holds one) is paid
    this.bankDrops(); input.clear();
    pmsg('level_completed', this.lvl());
    if (this.mode === 'camp') { const lv = this.lv, f = lv.coinsTaken / Math.max(1, lv.coinTotal); this.campDone(1 + (f >= 0.4) + (f >= 0.8)); }   // its stars: by the share of its coins
    this.state = 'reward'; this.stateT = 0; this.bonusWhy = why || 'bonusDone'; this.bonusGot = this.coins - this.bonusCoins; this.adBusy = false;
    ui.bonusEnd(this.bonusWhy, this.bonusGot, false);
  }
  doubleBonus() {   // only once the ad was watched to its end
    if (this.adBusy || this.state !== 'reward') return;
    this.adBusy = true;
    ads.reward((ok) => { this.adBusy = false; if (!ok || this.state !== 'reward') return; this.coins += this.bonusGot; sound.play('buy'); haptics.buzz(16); ui.bonusEnd(this.bonusWhy, this.bonusGot, true); });
  }
  nextWorld() {
    if (this.state !== 'reward') return;
    this.state = 'wait'; ui.hideAll();
    ads.between(() => this.goOn());
  }
  goOn() {
    if (this.mode === 'camp') { this.campKeep(); persist(); ui.map(); return; }   // (the doubled coins in the purse); the map, to choose the way on
    this.bonus = null; this.levelM = 0; this.stage = 0; this.world++; this.state = 'play'; this.stateT = 0;
    this.buildLevel(false); this.saveRun();
    ui.hideAll(); ui.banner();
  }
  // The run kept at the start of every level (Playgama's checklist: progress outlives a reload; losing a long run is what
  // players of the climbing games hate most), dropped once the run ends. Quitting to the menu keeps it, for Continue.
  saveRun() {
    if (this.mode === 'run') save.run = { world: this.world, stage: this.stage, bonus: this.bonus ? BONUS.indexOf(this.bonus) : -1, seed: this.seed, hp: this.hp, maxHp: this.maxHp, coins: this.coins, kills: this.kills,
      bestCombo: this.bestCombo, climbed: this.climbed, revives: this.revives, freed: this.freed, hard: this.hard, mods: Object.assign({}, this.mods), taken: this.taken.slice(), daily: this.daily, tier: this.tier, endless: this.endless, loop: this.loop };
    persist();
    pmsg('level_started', this.lvl());
  }
  continueRun() {   // back where the kept run's level began: the same level (its seed), hearts, coins and upgrades
    const r = save.run;
    if (!r) return;
    this.newRun(); padUsed = performance.now(); track('run_continued', { level_id: r.bonus >= 0 ? 'B' + (r.world + 1) : r.world >= WORLDS.length ? 'boss' : (r.world + 1) + '-' + (r.stage + 1) });
    for (const k of ['world', 'stage', 'hp', 'maxHp', 'coins', 'kills', 'bestCombo', 'climbed', 'revives', 'freed', 'hard']) this[k] = r[k];
    this.daily = r.daily != null ? r.daily : null; this.tier = r.tier || 0; this.endless = !!r.endless; this.loop = r.loop || 0;
    this.mods = Object.assign(MODS(), r.mods); this.taken = r.taken.slice();
    this.state = 'play'; this.stateT = 0; nextSeed = r.seed;
    if (r.bonus >= 0) { this.startBonus(BONUS[r.bonus]); return; }
    this.buildLevel(true); this.saveRun();
    ui.hideAll(); ui.banner();
  }
  // ── The campaign ──
  // A level of it (CAMPAIGN): from its recipe and seed (or `seed`: the bot's), with its world's upgrades so far (after the
  // colour's own), all the hearts and the purse. Dying costs that level only: Again starts it over (ui.campDead).
  playLevel(i, seed) {
    const { w, s, rc } = campAt(i);
    this.newRun(); this.mode = 'camp'; this.ci = i; save.camp.last = i; this.world = w; this.stage = s; this.rc = rc; this.hard = false;   // (the random run's hard mode is its own)
    for (const id of save.camp.builds[w] || []) { const u = UPGRADES.find((x) => x.id === id); if (u) this.takeUpgrade(u); }
    this.hp = this.maxHp; this.coins = this.kept = save.camp.wallet; this.first = ![0, 1, 2].some((d) => save.camp.stars[w * 30 + s * 3 + d] > 0);   // its tier's first clear (an upgrade then: one a tier, whichever way up)
    padUsed = performance.now(); this.state = 'play'; this.stateT = 0; nextSeed = seed != null ? seed : rc.seed != null ? rc.seed : null;
    if (rc.bonus != null) { this.startBonus(BONUS[rc.bonus]); return; }
    this.buildLevel(true); this.saveRun();
    ui.hideAll(); ui.banner();
    if (w === 0 && s === 0 && this.first) ui.toast(t(coarse ? (save.stick ? 'hintStick' : 'hintTouch') : JUMP.mouse ? 'hintMouse' : 'hintKeys'), 3500);   // the very first level: how to play
  }
  // The coins held into the purse; those come in since the last time count toward the colours too (save.bank).
  campKeep() { const d = this.coins - this.kept; if (d > 0) save.bank += d; this.kept = this.coins; save.camp.wallet = this.coins; }
  // A level cleared: its best stars, the next one open, the purse; kept at once (a reload loses none of it).
  campDone(n) {
    const c = save.camp, i = this.ci;
    c.stars[i] = Math.max(c.stars[i] || 0, n);
    this.campKeep(); persist();
  }
  campNext() { if (this.state !== 'clear') return; this.state = 'wait'; ui.hideAll(); ads.between(() => ui.map()); }   // on from a level played again: the map, to choose the way on
  campAgain() { if (this.state !== 'dead') return; pmsg('level_failed', this.lvl()); this.state = 'wait'; ui.hideAll(); ads.between(() => this.playLevel(this.ci)); }
  die() {   // the run ends here, unless there are coins enough to go on (see revive)
    if (this.state !== 'play') return;
    this.bankDrops();
    this.hp = Math.max(0, this.hp); this.state = 'dead'; this.stateT = 0; this.result = null;
    this.dieT = this.deathWhy() === 'fall' ? 0 : DIE.beat; if (this.dieT) sound.play('hurt'); else this.pop();   // held a beat in what did it (the hit heard at once), then the pop (frame)
    input.clear(); haptics.buzz(30);
    if (this.lv.boss) save.camp.fails[this.failKey()] = (save.camp.fails[this.failKey()] || 0) + 1;   // a loss at a boss, counted (help after three)
    if (this.mode === 'camp') { this.campKeep(); persist(); return; }   // the purse keeps what was picked up; then Again, or on for coins (ui.campDead)
    if (this.coins < this.revivePrice()) this.finish(false);
  }
  pop() {   // the burst, each death its own: where it can be seen (a fall ends below the screen), in the colour it was held in
    const H = this.hero, lv = this.lv, R = this.R, x = H.cx, y = clamp(H.cy, lv.cam + R, lv.cam + view.h - R), why = this.deathWhy();
    burstFx(x, y, R, why === 'fall' ? H.color.base : DIE.body[why].base); shake.add(12); sound.play('die');
    if (why === 'fire') sparkFx(x, y - 0.3 * R, 24, -Math.PI / 2, 0.6, [60, 220], [2.5, 5], [0.9, 1.6], [PAL.gray, PAL.gray, INK.flame], -0.2);   // toasted: smoke and embers going up
    else if (why === 'spikes') { fx.ring(x, y, 1.6 * R, INK.spike); sparkFx(x, y, 20, -Math.PI / 2, 1.2, [350, 800], [2, 3.5], [0.35, 0.7], [INK.spike, INK.spike, INK.white], 0.8); }   // popped like a balloon
    else if (why === 'fall') { splatFx(x, y, R, H.color.base, 14); fx.ring(x, y, 2.6 * R, H.color.base); fx.ring(x, y, 1.6 * R, INK.white); shake.add(6); }   // splat
    else if (why === 'icicle') { fx.ring(x, y, 1.8 * R, INK.white); sparkFx(x, y - R, 10, -Math.PI / 2, 1.4, [150, 380], [2.5, 4], [0.5, 0.9], [PAL.yellow, PAL.white], 0.2); }   // bonk: stars over the head
    else sparkFx(x, y, 18, -Math.PI / 2, Math.PI, [200, 560], [2, 3.5], [0.4, 0.8], [PAL.green, PAL.yellow], 0.6);   // too sour
  }
  deathWhy() { const by = this.lastBy; return by === 'fire' || by === 'fire_blob' ? 'fire' : by === 'spikes' || by === 'fall' || by === 'icicle' || by === 'train' ? by : 'enemy'; }   // what did it, in a word's kind
  revivePrice() { return Math.round(REVIVE.price * (1 + 0.5 * Math.min(this.world, 4)) * Math.pow(REVIVE.grow, this.revives) * (this.hard ? 1.5 : 1)); }
  // Back from the end for coins: on the last safe ledge, with all its hearts and a long moment of safety.
  revive() {
    const price = this.revivePrice();
    if (this.state !== 'dead' || this.result || this.coins < price) return;
    this.coins -= price; this.revives++; this.hp = this.maxHp;   // all the hearts, however many were bought
    track('revive', { price, revives: this.revives, ...this.at() });
    this.state = 'play'; this.stateT = 0; ui.hideAll();
    this.respawn(); this.invuln = REVIVE.invuln;
    sound.play('buy'); haptics.buzz(16);
  }
  giveUp() { this.finish(false); ui.result(this.result); }
  win() {
    if (this.mode === 'run' && this.endless) { pmsg('level_completed', this.lvl()); this.loopOn(); return; }   // the endless climb goes round again
    pmsg('level_completed', this.lvl()); this.state = 'won'; this.stateT = 0; input.clear(); sound.play('combo', 1, 0.8);
    if (this.mode === 'camp') { const lost = this.maxHp - this.hp, rn = save.camp.runes; delete save.camp.fails[this.ci]; if (!rn.includes(this.world)) rn.push(this.world); this.campDone(lost <= 0 ? 3 : lost <= 2 ? 2 : 1); this.result = null; return; }   // a boss's stars: by the hearts it cost
    this.finish(true);
  }
  loopOn() {   // past the summit: the worlds again from the first, a tier harder each time round
    this.loop++; this.world = 0; this.stage = 0; this.hard = true; this.state = 'wait'; ui.hideAll();
    ads.between(() => { this.state = 'play'; this.stateT = 0; this.buildLevel(false); this.saveRun(); ui.hideAll(); ui.toast(tf('loop', { n: this.loop + 1 }), 2200); });
  }
  finish(won) {
    const bank0 = save.bank, total = Math.floor(this.climbed + this.levelM), firstWin = won && save.wins === 0;
    save.bank += this.coins; save.best = Math.max(save.best, total);
    if (won) save.wins++;
    let tierUp = 0;
    if (won && this.tier >= (save.tierMax || 0) && (save.tierMax || 0) < 5) { save.tierMax = this.tier + 1; tierUp = save.tierMax; }   // a win at the top tier opens the next (up to 5)
    if (this.endless) save.endlessBest = Math.max(save.endlessBest || 0, total);
    delete save.run;   // over: nothing to continue
    if (!won) pmsg('level_failed', this.lvl());   // only now: a death with a revive after it is the same go at the level
    track('run_over', { won, level_id: this.levelId(), height: total, coins: this.coins, kills: this.kills, revives: this.revives });
    persist();
    let daily = null;
    if (this.daily != null) {   // the day's best kept, its score to the leaderboard where there is one
      const d = save.days = save.days || {};
      d[this.daily] = Math.max(d[this.daily] || 0, total); daily = { best: d[this.daily], day: this.daily };
      if (ads.ok && bridge.leaderboards && bridge.leaderboards.type !== 'not_available') bridge.leaderboards.setScore('daily_height', this.daily * BOARD + d[this.daily]).catch(() => {});   // the day's best, whether the board keeps the best or the last
    }
    const fresh = UNLOCKS.filter((u) => u.at > bank0 && u.at <= save.bank);
    this.result = { won, total, coins: this.coins, kills: this.kills, combo: this.bestCombo, where: this.where(), fresh, firstWin, daily, tierUp, why: this.deathWhy() };
  }
  where() { return this.mode !== 'camp' && this.world >= WORLDS.length ? L2(SUMMIT.name) : L2(this.wd.name) + ' ' + (this.world + 1) + '-' + (this.stage + 1); }
  togglePause(on) {
    if (on && this.state === 'play') { this.paused = this.state; this.state = 'pause'; input.clear(); ui.pause(); }
    else if (!on && this.state === 'pause') { this.state = this.paused; loop.last = performance.now(); ui.hideAll(); }
  }

  // ── Once per drawn frame ──
  impact(b, nx, ny, speed, x, y, floor) {   // as in Gum's World: an impact squashes, a hard one puffs and shakes
    if (b.impactCD > 0) return;
    b.impactCD = IMPACT.cooldown;
    b.kickSquash(nx, ny, Math.min(SQUASH.impactMax, speed * SQUASH.impactGain));
    if (!b.isHero) return;
    sound.play('land', clamp((speed - IMPACT.minSpeed) / 1400, 0.15, 0.8));
    if (speed > IMPACT.buzzSpeed) haptics.buzz(Math.min(28, speed / 90));
    if (floor && speed > IMPACT.puffSpeed) fx.dust(x, y, speed);
    if (speed > IMPACT.shakeSpeed) shake.add(Math.min(IMPACT.shakeMax, (speed - IMPACT.shakeSpeed) * IMPACT.shakePer + 1.5));
    if (speed > 900) b.face.surprise = Math.max(b.face.surprise, 0.55);
  }
  frame(dt, alpha, now) {
    const lv = this.lv, b = this.hero;
    const rb = this.power('rainbow') && this.state !== 'dead', tl = this.tail, last = tl[tl.length - 1];   // frame runs on under the revive dialog, gun() does not
    b.color = this.state === 'dead' && this.dieT > 0 ? DIE.body[this.deathWhy()] : rb ? RAINBOW_BODY[Math.floor(lv.t / (this.gunT < 1 ? RAINBOW.slow : RAINBOW.cycle)) % 6] : colorById(save.color);   // the rainbow cycles the inks, slower in its last second
    b.helmet = this.power('smash') && this.state !== 'dead' && !(this.gunT < 1 && Math.floor(this.gunT * 6) % 2 === 0) ? HELMET : null;   // the smash's helmet (user: in place of its pips), blinking in its last second
    if (last && Math.hypot(b.cx - last[0], b.cy - last[1]) > 4 * this.R) tl.length = 0;   // a respawn or a door: no streak across the screen
    else if (rb && (!last || Math.hypot(b.cx - last[0], b.cy - last[1]) > RAINBOW.gap * this.R)) tl.push([b.cx, b.cy]);
    while (tl.length > (rb ? Math.ceil(RAINBOW.n * Math.min(1, this.gunT / RAINBOW.fade)) : 0)) tl.shift();   // shorter at the end, gone after
    this.stateT += dt;
    if (this.dieT > 0 && (this.dieT -= dt) <= 0 && this.state === 'dead') this.pop();
    if (this.state === 'clear' && this.stateT > 0.8 && !ui.open) { if (this.bonus) this.endBonus(); else if (this.mode === 'camp' && !this.first) ui.cleared(); else ui.cards(this.offer()); }   // an upgrade the first time a campaign level is cleared
    if (this.state === 'dead' && this.stateT > 1 && !ui.open) { if (this.mode === 'camp') ui.campDead(); else if (this.result) ui.result(this.result); else ui.revive(this.revivePrice(), this.coins); }
    if (this.state === 'won' && this.stateT > 0.4 && !ui.open) { if (this.mode === 'camp') ui.runes(); else ui.result(this.result); }
    if (this.winT > 0 && this.state === 'play' && (this.winT -= dt) <= 0) this.win();
    if (lv.under && this.state === 'play') {   // the flip side is fallen: the hero high in the view, to see what is under it
      const target = clamp(b.cy - 0.35 * view.h, lv.capY - CAM.top, lv.floor + this.room() - view.h);
      lv.cam += (target - lv.cam) * (1 - Math.exp(-8 * dt));
      lv.cam = Math.max(lv.cam, Math.min(b.maxY + view.keep + this.R - view.h, lv.floor + this.room() - view.h));   // never near the keys
    } else if (lv.kind === 'well' && this.state === 'play') {   // keep the drawn hero at the anchor; only ever climb
      let cy = 0;
      for (let i = 0; i < b.n; i++) cy += b.sy[i] + (b.y[i] - b.sy[i]) * alpha;
      cy /= b.n;
      const target = cy - CAM.anchor * view.h;
      if (target < lv.cam) lv.cam += (target - lv.cam) * (1 - Math.exp(-CAM.follow * dt));
      const down = Math.min(b.maxY + this.room() - view.h, lv.floor + this.room() - view.h);   // and down with a fall, keeping the hero well over the touch keys, as far as the floor:
      if (down > lv.cam) lv.cam += (down - lv.cam) * (1 - Math.exp(-10 * dt));   // smoothly (a hard follow jerked with every bounce),
      lv.cam = Math.max(lv.cam, Math.min(b.maxY + view.keep + this.R - view.h, lv.floor + this.room() - view.h));   // but never letting it near the keys
      lv.cam = Math.max(lv.cam, lv.capY - CAM.top);
    }
    lv.ensure(lv.cam - view.h * LEVEL.ahead);
    if ((this.pruneT += dt) > 0.5) { this.pruneT = 0; if (lv.kind === 'well' && !lv.under) lv.prune(lv.cam + view.h * (1 + LEVEL.behind)); }
    const d = input.dir;   // the hero looks where it runs
    if (d && this.state === 'play') { this.heroLook.x = b.cx + d * 240; this.heroLook.y = b.cy - 40; this.heroLook.t = now; }
    b.face.update(dt, b, this.heroLook, now);
    this.look.x = b.cx; this.look.y = b.cy; this.look.t = now;
    for (const e of lv.enemies) e.body.face.update(dt, e.body, this.look, now);
    for (const f of lv.folk || []) if (f.body) f.body.face.update(dt, f.body, this.look, now);
    for (const f of this.followers) f.body.face.update(dt, f.body, this.look, now);
    if (lv.boss && !lv.boss.dead) lv.boss.body.face.update(dt, lv.boss.body, this.look, now);
    ui.frame(this);
  }
}

// ── UI ───────────────────────────────────────────────────────
// The HUD, toasts and the four panels (menu, upgrade cards, pause, result) are DOM over
// the canvas column, and so is the touch pad.
const $ = (id) => document.getElementById(id);
const rgb = (c) => 'rgb(' + c.map((v) => Math.round(v * 255)).join(',') + ')';
// ── Type ──
// Text is set in VT323 (Latin, es and pt included) and DotGothic16 (Japanese), both shipped in assets/fonts (see
// index.html and tools/fonts.py). What VT323 has not got, the arrows, triangles and the speaker, stays drawn by hand:
// 7 pixels tall, rows top to bottom, '#' ink, each an SVG path sized by CSS --p (CSS px per pixel) and coloured by
// currentColor, as all the text was before.
const FONT = {
  '●': '...../.###./#####/#####/#####/.###./.....',
  '✓': '...../....#/...##/#.##./###../.#.../.....',
  '←': '...../..#../.#.../#####/.#.../..#../.....',
  '→': '...../..#../...#./#####/...#./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../..#..',
  '↓': '..#../..#../..#../..#../#.#.#/.###./..#..',
  '▲': '...../..#../..#../.###./.###./#####/.....',
  '▼': '...../#####/.###./.###./..#../..#../.....',
  '◀': '...#/..##/.###/####/.###/..##/...#',
  '▶': '#.../##../###./####/###./##../#...',
  '\u{E000}': '...#.../..##.#./####..#/####..#/####..#/..##.#./...#...',
  '\u{E001}': '...#.../..##.../####.#./#####.#/####.#./..##.../...#...',   // the last two: sound on / off
};
for (const c in FONT) FONT[c] = FONT[c].split('/');
const GLYPHS = new RegExp('([' + Object.keys(FONT).join('') + '])', 'u');
// Rows of '#' as an SVG path, at (x, y) in font pixels.
function inkPath(rows, x, y) {
  let d = '';
  rows.forEach((row, ry) => { for (let k = 0; k < row.length;) { if (row[k] !== '#') { k++; continue; } let e = k; while (e < row.length && row[e] === '#') e++; d += `M${x + k} ${y + ry}h${e - k}v1h${k - e}z`; k = e; } });
  return d;
}
const pxSvg = (W, H, paths) => `<svg aria-hidden="true" viewBox="0 0 ${W} ${H}" style="--w:${W};--h:${H}" shape-rendering="crispEdges">${paths}</svg>`;
// Text, centred line under line (or `left`); `max` (--p CSS px each, the old pixel font's measure) wraps it at spaces, as
// a '\n' does. Sized by --p too: its capitals as tall as that font's 7 pixels (see .tx in index.html).
function px(text, max = Infinity, left = false) {
  const e = document.createElement('span');
  e.className = 'px tx' + (left ? ' left' : '');
  if (max < Infinity) e.style.maxWidth = 'calc(var(--p) * ' + max + 'px)';
  for (const part of String(text).split(GLYPHS)) {
    if (!FONT[part]) { if (part) e.append(part); continue; }
    const g = document.createElement('i'), rows = FONT[part];
    g.className = 'px'; g.innerHTML = pxSvg(rows[0].length, rows.length, `<path fill="currentColor" d="${inkPath(rows, 0, 0)}"/>`);
    e.append(g);
  }
  return e;
}
// A heading's or a button's words in the other script, small under it (the user: Japanese by the Latin, for the vibe;
// English by the Japanese). `k` is the STR key it says.
function cap(e, k, o) {   // (`o`: the values for its {n}s, as tf takes them)
  const c = document.createElement('small'), ja = lang !== 'ja' || k === 'title', raw = k === 'title' ? 'アップウェル' : STR[ja ? 'ja' : 'en'][k];
  c.className = 'cap'; c.lang = ja ? 'ja' : 'en'; c.textContent = o ? raw.replace(/\{(\w+)\}/g, (_, n) => o[n]) : raw;
  e.classList.add('capped'); e.append(c);
  return e;
}
// An ICONS picture as pixel SVG, a path per ink in the page's palette colours.
function iconEl(id) {
  const rows = ICONS[id], e = document.createElement('i');
  let paths = '';
  for (const c in ICON_INK) {
    const d = inkPath(rows.map((r) => r.replace(/./g, (q) => (q === c ? '#' : '.'))), 0, 0);
    if (d) paths += `<path fill="var(--${ICON_INK[c] === 'black' ? 'ink' : ICON_INK[c]})" d="${d}"/>`;
  }
  e.className = 'px ico'; e.innerHTML = pxSvg(rows[0].length, rows.length, paths);
  return e;
}
const HEART = { full: '.##.##./#######/#######/.#####./..###../...#...'.split('/'), empty: '.##.##./#..#..#/#.....#/.#...#./..#.#../...#...'.split('/') };
// A disc of radius `r` px in 2-px pixels: a gray rim a pixel wide round an inside of ink (or, for the knob, white) at `fill`.
function pixelDisc(r, fill) {
  const q = r / 2, rows = (k) => { let d = ''; for (let y = 0; y < 2 * k; y++) { const h = Math.round(Math.sqrt(Math.max(0, k * k - (y + 0.5 - k) ** 2))); if (h) d += 'M' + (q - h) + ' ' + (q - k + y) + 'h' + 2 * h + 'v1h-' + 2 * h + 'z'; } return d; };
  const t = document.createElement('template');
  t.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + 2 * r + '" height="' + 2 * r + '" viewBox="0 0 ' + r + ' ' + r + '" shape-rendering="crispEdges">'
    + '<path class="rim" fill-rule="evenodd" d="' + rows(q) + rows(q - 1) + '"/><path class="in" fill-opacity="' + fill + '" d="' + rows(q - 1) + '"/></svg>';
  return t.content.firstChild;
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null && text !== '') e.append(px(text)); return e; }
function button(text, cls, fn) {
  const b = el('button', cls, text);
  b.addEventListener('click', (e) => { e.stopPropagation(); sound.unlock(); sound.play('click', 0.6); fn(); });
  if (/\bbig\b/.test(cls)) queueMicrotask(() => fitBig(b));   // once it is in its panel
  return b;
}
// A big button's words stay on one line: a size smaller at a time (down to --p 2) while they are wider than the button
// ("×2 con un anuncio", a world's name after Continue on a small phone).
function fitBig(b, min = 2) {   // (min: the smallest --p it may go to)
  const tx = b.querySelector('.tx');
  for (let p = parseFloat(getComputedStyle(b).getPropertyValue('--p')) || 4; tx && tx.offsetWidth > b.clientWidth - 24 && p > min;) { p -= 0.5; b.style.setProperty('--p', p); }
}
const ui = {
  open: null, hp: -1, max: -1, coins: -1, m: -1, stage: '', labelEls: [],
  panel(id) { this.hideAll(); const p = $(id); p.replaceChildren(); p.classList.add('on'); this.open = id; return p; },
  hideAll() { for (const id of ['menu', 'cards', 'pause', 'result', 'map']) $(id).classList.remove('on'); this.open = null; },
  menu() {
    const p = this.panel('menu');
    const title = cap(el('h1', 'title', 'UPWELL'), 'title'); title.lang = 'en'; p.append(title);   // the name in VT323 whatever the language
    const colors = el('div', 'pickers');   // the hero shows through above; under it its five colours, what the chosen one starts with, and Play
    for (const u of UNLOCKS) {
      const open = opened(u), b = button('', 'chip swatch' + (save.color === u.id ? ' on' : '') + (open ? '' : ' locked'), () => {
        if (!open) return;
        save.color = u.id; persist(); game.makeHero(); this.menu();
      });
      b.style.background = rgb(colorById(u.id).base);
      if (!open) b.append(el('small', null, u.at));   // what it costs, in coins of all runs
      colors.append(b);
    }
    p.append(colors);
    const perk = UPGRADES.find((x) => x.id === (UNLOCKS.find((u) => u.id === save.color) || {}).perk);
    if (perk) { const line = el('div', 'perk'); line.append(iconEl(perk.id), px(L2(perk.name)[1], 130, true)); p.append(line); }
    const r = save.run, c = save.camp, ni = campNextId(), next = campAt(ni), begun = c.stars.some((n) => n > 0), done = c.stars[CAMP_END] > 0;
    const grid = el('div', 'grid2');   // once the campaign is begun, the rest in one grid of equal cells, two across (the user: not a pyramid)
    if (begun && !done) grid.append(cap(button(t('map'), 'chip', () => this.map()), 'map'));
    if (begun) grid.append(cap(button(t('book'), 'chip', () => this.book()), 'book'));
    if (begun) grid.append(cap(button(t('daily') + (save.days && save.days[today] ? ' · ' + save.days[today] + ' ' + t('m') : ''), 'chip', () => game.startRun(true)), 'daily'));   // the day's well, and its best
    if (r) grid.append(cap(button(t('random') + ' · ' + (r.world >= WORLDS.length ? L2(SUMMIT.name) : (r.world + 1) + '-' + (r.stage + 1)), 'chip', () => game.continueRun()), 'random'));   // a kept run to go on with, or a new one
    else if (begun) grid.append(cap(button(t('random'), 'chip', () => game.startRun()), 'random'));
    if (save.wins > 0) {   // a run won: its hard mode's tier, and the endless climb
      const top = Math.max(1, save.tierMax || 1), tier = Math.min(save.tier != null ? save.tier : save.hard ? 1 : 0, top);
      grid.append(cap(button(t('hard') + ': ' + (tier ? tier : t('off')), 'chip' + (tier ? ' on' : ''), () => { save.tier = (tier + 1) % (top + 1); save.hard = save.tier > 0; persist(); this.menu(); }), 'hard'),
        cap(button(t('endless') + (save.endlessBest ? ' · ' + save.endlessBest + ' ' + t('m') : ''), 'chip', () => game.startRun(false, true)), 'endless'));
    }
    const wk = weekCard(), week = el('div', 'week');   // the week's card: its seven marks and what the next one pays
    week.append(px(t('week')));
    for (let k = 0; k < 7; k++) week.append(el('i', k < wk.days.length ? 'on' : MARKS.at.includes(k + 1) ? 'pay' : null));
    if (begun) p.append(week);
    if (grid.children.length) { p.append(grid); for (const c of grid.children) fitBig(c, 1.5); }   // a long one smaller, on one line
    if (done) p.append(cap(button(t('map'), 'big thumb', () => this.map()), 'map'));   // the world is all done: its map, to play its levels again
    else if (!begun) p.append(cap(button(t('play'), 'big thumb', () => game.playLevel(1)), 'play'));   // one tap to the first level (CrazyGames: one at most)
    else p.append(cap(button(t('continue') + ' · ' + (next.w + 1) + '-' + (next.s + 1), 'big thumb', () => game.playLevel(ni)), 'continue'));   // the width of the screen, 12 px in from its edges
    const s = button('', 'iconBtn', () => { sound.toggle(); this.menu(); });   // sound on and off, a speaker in the corner
    s.append(px(save.sound === false ? '\u{E001}' : '\u{E000}')); s.setAttribute('aria-label', t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'));
    p.append(s);
    const y0 = p.getBoundingClientRect().top, split = Math.min(0.58 * view.h, colors.getBoundingClientRect().top - y0 - 8), head = title.getBoundingClientRect().bottom - y0, R = game.R;   // the backdrop's edge over the colours (they climb as rows come, once won),
    p.style.setProperty('--split', split + 'px'); if (game.state === 'menu') game.lv.cam = game.lv.floor - Math.min(split, Math.max(split - 0.12 * view.h + R, head + 2 * R + 2));   // and the hero standing over it, under the title (a short screen: less floor), so a new look shows
  },
  cards(list) {
    const p = this.panel('cards');
    this.starRow(p);
    p.append(cap(el('div', 'head', t('pick')), 'pick'));
    for (const u of list) {
      const [name, desc] = L2(u.name), c = button('', 'card', () => game.pick(u)), d = el('span');
      d.append(px(desc, 118, true));
      c.append(iconEl(u.id), el('b', null, name), d);
      p.append(c);
    }
  },
  cleared() {   // a campaign level played again: its stars, then on (an upgrade is for the first time only)
    const p = this.panel('cards');
    this.starRow(p);
    p.append(cap(el('div', 'head', t('cleared')), 'cleared'), cap(button(t('next'), 'big thumb', () => game.campNext()), 'next'));
  },
  starRow(p) {
    const st = game.stars;
    if (st) {   // the level's stars, what they paid and what they were for
      const row = el('div', 'stars');
      for (let k = 0; k < 3; k++) {   // one after another, popping in; each earned one rings higher, then twinkles
        const s = iconEl(k < st.n ? 'star' : 'starOff');
        s.classList.add(k < st.n ? 'won' : 'lost'); s.style.animationDelay = 0.15 + 0.3 * k + 's' + (k < st.n ? ', ' + (1.2 + 0.2 * k) + 's' : '');
        row.append(s);
        if (k < st.n) setTimeout(() => sound.play('coin', 0.8, 1 + 0.18 * k), 300 + 300 * k);
      }
      const pay = px('+' + st.pay); pay.classList.add('pay'); row.append(pay);
      p.append(row, el('div', 'label', tf('starLine', { c: st.coins.join('/') })));
    }
  },
  campDead() {   // a campaign level lost: why, in a word; again (free), on from the last ledge for coins (not at a boss), or the menu
    const p = this.panel('result'), g = game, price = g.revivePrice(), boss = !!(g.rc && g.rc.boss), why = g.deathWhy();
    const def = g.lv.boss && g.lv.boss.def;
    p.append(def ? el('div', 'head', L2(def.quip[(save.camp.fails[g.failKey()] || 0) % def.quip.length])) : cap(el('div', 'head', t('dead_' + why)), 'dead_' + why));   // a boss has a word of its own
    if (!boss && g.coins >= price) p.append(cap(button(tf('reviveHere', { n: price }), 'chip wide', () => g.revive()), 'revive'));
    p.append(cap(button(t('menu'), 'big thumb alt', () => { pmsg('level_failed', g.lvl()); g.toMenu(); }), 'menu'), cap(button(t('again'), 'big thumb', () => g.campAgain()), 'again'));
  },
  runes() {   // a world's boss beaten: its tapestry, three runes and what Aunt Moti reads in them (each its own ink); on at a tap
    const p = this.panel('result'), cw = CAMPAIGN[game.world], cloth = el('div', 'cloth');
    for (const [k, ch] of [...cw.runes].entries()) { const r = document.createElement('span'); r.className = 'rune r' + k; r.textContent = ch; cloth.append(r); }
    cloth.setAttribute('aria-hidden', 'true');
    p.append(cloth, el('div', 'label', t('motiReads')), el('div', 'lore', L2(cw.lore)), cap(button(t('next'), 'big thumb', () => this.worldDone()), 'next'));
  },
  worldDone() {   // its boss beaten, after its tapestry: on into the next world, or word of it coming
    const p = this.panel('result'), n = game.world + 2, next = n <= CAMPAIGN.length;
    p.append(cap(el('div', 'head', t('worldDone')), 'worldDone'), el('div', 'label', tf(next ? 'worldNext' : 'soon', { n })));
    if (next) p.append(cap(button(t('map'), 'chip wide', () => this.map(n - 1)), 'map'), cap(button(t('continue') + ' · ' + n + '-1', 'big thumb', () => game.playLevel((n - 1) * 30 + 1)), 'continue'));
    else p.append(cap(button(t('menu'), 'chip wide', () => game.toMenu()), 'menu'), cap(button(t('map'), 'big thumb', () => this.map()), 'map'));
  },
  // The book of what has been met (the plan after the sandbox: an encyclopedia), one feed down under its headers (the user:
  // no tabs, bigger blocks, each in detail): upgrades and their pairs, candies, enemies, bosses, a card each with its picture,
  // its name and what it does or says; what is not met yet a dim '?'. The feed scrolls by touch (it alone: see the touch guard).
  book() {
    const p = this.panel('map'), bk = save.book || {}, has = (k, id) => !!(bk[k] && bk[k][id]), feed = el('div', 'feed');
    const got = (k) => t('got_' + k).split(/[!！]/), sections = [
      ['up', 'bookUp', UPGRADES.map((u) => [u.id, u.id, ...L2(u.name)]).concat(SYNERGIES.map((sy) => [sy.id, sy.of[0], ...L2(sy.name)]))],
      ['candy', 'bookCandy', Object.keys(CANDY).map((k) => [k, k, got(k)[0].replace('¡', ''), (got(k)[1] || '').split('·')[0].trim()])],
      ['foe', 'bookFoe', Object.keys(ENEMY).map((k) => [k, 'foe_' + k, L2(FOE_NAMES[k]), L2(FOE_DESC[k])])],
      ['boss', 'bookBoss', Object.keys(BOSSES).map((k) => [k, 'boss_' + k, L2(BOSSES[k].name), L2(BOSSES[k].intro[0])])],
    ];
    for (const [k, head, items] of sections) {
      feed.append(el('div', 'sect', t(head) + ' · ' + items.filter(([id]) => has(k, id)).length + '/' + items.length));   // how many found
      for (const [id, icon, name, desc] of items) {
        const known = has(k, id), card = el('div', 'card2' + (known ? '' : ' locked')), pic = el('div', 'pic'), txt = el('div', 'txt');
        pic.append(known ? iconEl(icon) : px('?'));
        txt.append(el('b', null, known ? name : '???'), el('span', null, known ? desc : t('unknown')));
        card.append(pic, txt); feed.append(card);
      }
    }
    p.append(cap(el('div', 'head', t('book')), 'book'), feed, cap(button(t('menu'), 'big thumb', () => game.toMenu()), 'menu'));
  },
  // The campaign's map (see campAt): a world's levels up its tiers, the first at the foot and the boss on top, the paths between
  // them (lit where a cleared one leads); each its tier's number, a side's its mark instead (a heart on the calm left, an enemy on
  // the fierce right; a bonus race a coin, the boss its face), over its stars; the open ones to tap, the next one yellow; it scrolls
  // by touch to the next one, and on to that one under the thumb.
  map(w = campAt(campNextId()).w) {
    const p = this.panel('map'), c = save.camp, ni = campNextId(), next = campAt(ni), done = c.stars[CAMP_END] > 0, worlds = campWorlds();
    p.append(cap(el('div', 'head', tf('world', { n: w + 1 }) + ' · ' + L2(CAMPAIGN[w].world.name)), 'world', { n: w + 1 }));
    if (worlds > 1) { const tabs = el('div', 'duo'); for (let k = 0; k < worlds; k++) tabs.append(button(String(k + 1), 'chip' + (k === w ? ' on' : ''), () => this.map(k))); p.append(tabs); }   // the worlds open so far, a tab each
    const tree = el('div', 'tree'), inner = el('div', 'in'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), X = (col) => 50 + col * 100, Y = (s) => 960 - s * 102;
    svg.setAttribute('viewBox', '0 0 300 1000'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
    for (let s = 0; s < 9; s++) for (let col = 0; col < 3; col++) {
      const i = w * 30 + s * 3 + col;
      if (campHas(i)) for (const u of ups(s, col)) {
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        for (const [k, v] of [['x1', X(col)], ['y1', Y(s)], ['x2', X(u)], ['y2', Y(s + 1)]]) ln.setAttribute(k, v);
        if (c.stars[i] > 0) ln.setAttribute('class', 'on');
        svg.append(ln);
      }
    }
    inner.append(svg);
    let nextEl = null;
    for (let s = 9; s >= 0; s--) for (let col = 0; col < 3; col++) {
      const i = w * 30 + s * 3 + col;
      if (!campHas(i)) continue;
      const { rc } = campAt(i), open = campOpen(i), n = c.stars[i] || 0, icon = rc.boss ? 'boss' : rc.bonus != null ? 'coin' : col === 0 ? 'heal1' : col === 2 ? 'foe_crawler' : null;
      const b = button(icon ? '' : String(s + 1), 'chip lvl' + (i === ni && !n ? ' on' : '') + (open ? '' : ' locked'), () => { if (open) game.playLevel(i); });
      if (icon) b.append(iconEl(icon));
      if (open) { const st = el('div', 'mini'); for (let k = 0; k < 3; k++) st.append(iconEl(k < n ? 'star' : 'starOff')); b.append(st); }
      b.style.left = (X(col) / 3) + '%'; b.style.top = (Y(s) / 10) + '%';
      b.setAttribute('aria-label', (w + 1) + '-' + (s + 1) + ['L', '', 'R'][col]); inner.append(b);
      if (i === ni) nextEl = b;
    }
    tree.append(inner); p.append(tree);
    if (nextEl) requestAnimationFrame(() => { tree.scrollTop = nextEl.offsetTop - tree.clientHeight / 2; });
    if (done) p.append(cap(button(t('menu'), 'big thumb', () => game.toMenu()), 'menu'));
    else p.append(cap(button(t('menu'), 'chip wide', () => game.toMenu()), 'menu'), cap(button(t('continue') + ' · ' + (next.w + 1) + '-' + (next.s + 1), 'big thumb', () => game.playLevel(ni)), 'continue'));
  },
  pause() {
    const p = this.panel('pause');
    const snd = cap(button(t('sound') + ': ' + t(save.sound === false ? 'off' : 'on'), 'big thumb alt', () => { sound.toggle(); track('settings_changed', { setting: 'sound', value: save.sound !== false }); this.pause(); }), 'sound');
    const shk = cap(button(t('shake') + ': ' + t(shakeOn() ? 'on' : 'off'), 'big thumb alt', () => { save.shake = !shakeOn(); persist(); track('settings_changed', { setting: 'shake', value: save.shake }); this.pause(); }), 'shake');
    const langs = el('div', 'langs');   // the language, each by its own name (the user: chosen here)
    langs.setAttribute('role', 'group'); langs.setAttribute('aria-label', t('lang'));
    for (const [k, name] of LANGS) { const b = button(name, 'chip' + (k === lang ? ' on' : ''), () => { save.lang = k; persist(); setLang(k); track('settings_changed', { setting: 'language', value: k }); this.pause(); }); b.lang = k; langs.append(b); }
    const build = el('div', 'build');   // the upgrades taken (the world's build, in the campaign), as their pictures
    for (const id of game.taken) build.append(iconEl(id));
    for (const id of game.syns) { const i = iconEl(SYNERGIES.find((q) => q.id === id).of[0]); i.classList.add('syn'); build.append(i); }   // a synergy: its first card, ringed
    p.append(cap(el('div', 'head', t('paused')), 'paused'), ...(game.taken.length ? [build] : []), langs, snd, shk, cap(button(t('menu'), 'big thumb alt', () => game.toMenu()), 'menu'), cap(button(t('resume'), 'big thumb', () => game.togglePause(false)), 'resume'));   // Resume at the bottom, under the thumb
  },
  bonusEnd(why, n, doubled) {   // a bonus level's coins; ×2 for an ad while there are some and an ad to be had
    const p = this.panel('result');
    p.append(cap(el('div', 'head', t(why)), why), el('div', 'label', tf('bonusGot', { n: doubled ? 2 * n : n }) + (doubled ? '  ×2' : '')));
    if (!doubled && n > 0 && ads.canReward) p.append(cap(button(t('next'), 'chip wide', () => game.nextWorld()), 'next'), cap(button(t('double'), 'big thumb', () => game.doubleBonus()), 'double'));   // the ad's button under the thumb
    else p.append(cap(button(t('next'), 'big thumb', () => game.nextWorld()), 'next'));
  },
  revive(price, coins) {   // before the result: go on for coins, or end the run
    const p = this.panel('result');
    p.append(cap(el('div', 'head', t('reviveQ')), 'reviveQ'), el('div', 'label', tf('reviveCost', { n: price, c: coins })),
      cap(button(t('giveUp'), 'chip wide', () => game.giveUp()), 'giveUp'), cap(button(t('revive'), 'big thumb', () => game.revive()), 'revive'));   // the main button last, under the thumb
  },
  result(r) {
    const p = this.panel('result'), box = el('div', 'summary');   // the results in the middle of the room over the buttons
    const cuts = [], fit = () => { cuts.sort((a, b) => a[0] - b[0]); while (cuts.length && box.firstElementChild.getBoundingClientRect().top < p.getBoundingClientRect().top + 8) cuts.shift()[1].remove(); };   // a short screen: the least of it goes, till the top shows (touch scrolls nothing here)
    const def = !r.won && game.lv.boss && game.lv.boss.def;   // a loss: a word on what did it (a boss has its own, as in ui.campDead),
    box.append(def ? el('div', 'head', L2(def.quip[(save.camp.fails[game.failKey()] || 0) % def.quip.length])) : cap(el('div', 'head', r.won ? t('won') : t('dead_' + r.why)), r.won ? 'won' : 'dead_' + r.why));
    if (!r.won) { const l = el('div', 'label', t('dead')); box.append(l); cuts.push([3, l]); }   // and that the run is over
    const rows = [[t('height'), r.total + ' ' + t('m')], [t('reached'), r.where], [t('coins'), r.coins], [t('kills'), r.kills], [t('combo'), r.combo]];
    const tb = el('div', 'rows');
    rows.forEach(([k, v], i) => { const row = el('div', 'row'); row.append(el('span', null, k), el('b', null, String(v))); tb.append(row); if (i > 1) cuts.push([3 - i / 10, row]); });   // the combo first, then the enemies, the coins
    box.append(tb);
    if (r.daily) {
      const row = el('div', 'medals');
      MEDALS.forEach((m, k) => { const c = el('div', 'medal'); c.append(iconEl(r.daily.best >= m ? ['medalB', 'medalS', 'medalG'][k] : 'medalOff'), px(m + ' ' + t('m'))); row.append(c); });
      box.append(el('div', 'label', tf('dailyBest', { n: r.daily.best })), row);
      if (ads.ok && bridge.leaderboards && bridge.leaderboards.type === 'in_game') bridge.leaderboards.getEntries('daily_height').then((all) => {
        const day = (e) => Math.floor(Number(e.score) / BOARD), es = all.filter((e) => day(e) === r.daily.day), ahead = all.filter((e) => day(e) > r.daily.day).length;   // today's only (see BOARD), ranked among themselves (a clock set ahead sends days to come)
        const me = es.findIndex((e) => bridge.player && e.id === bridge.player.id), from = me < 0 ? 0 : Math.max(0, me - 2), b = el('div', 'rows');   // the neighbours, not the top hundred (the digest §6)
        const n = Math.min(5, es.length - from), mid = Math.min(Math.max(me, from + 1), from + n - 2);   // the three that stay on a short screen: about the hero
        for (const e of es.slice(from, from + 5)) {
          const i = es.indexOf(e), q = el('div', 'row' + (i === me ? ' me' : '')); q.append(el('span', null, '#' + (e.rank - ahead) + ' ' + (e.name || '').slice(0, 14)), el('b', null, (Number(e.score) % BOARD) + ' ' + t('m'))); b.append(q);
          if (Math.abs(i - mid) > 1) cuts.push([1 - Math.abs(i - mid) / 10, q]);   // the neighbours farthest away go first
        }
        if (es.length) { box.append(el('div', 'label', t('board')), b); fit(); }
      }).catch(() => {});
    }
    if (r.fresh.length || r.firstWin || r.tierUp > 1) {
      const u = el('div', 'fresh');
      u.append(el('div', 'label', t('unlocked')));
      for (const f of r.fresh) { const c = el('span', 'chip swatch on'); c.style.background = rgb(colorById(f.id).base); u.append(c); }
      if (r.tierUp > 1) u.append(el('div', null, tf('tierOpen', { n: r.tierUp }))); else if (r.firstWin) u.append(el('div', null, t('hardOpen')));
      box.append(u);
    }
    const then = (f) => () => { if (game.state === 'wait') return; game.state = 'wait'; this.hideAll(); ads.between(f); };   // the run over: an ad may come first
    p.append(box, cap(button(t('menu'), 'big thumb alt', then(() => game.toMenu())), 'menu'), cap(button(t('again'), 'big thumb', then(() => game.startRun(!!r.daily, game.endless))), 'again'));   // Again (the same kind of run) at the bottom, Menu as big over it
    fit();
  },
  toastTimer: 0,
  toast(text, ms = 1500, icon) {   // `icon`: an ICONS picture before the words
    const e = $('toast');
    e.replaceChildren(...(icon ? [iconEl(icon)] : []), px(text, Math.floor((view.w - (icon ? 110 : 64)) / 2))); e.classList.add('show');
    clearTimeout(this.toastTimer);
    if (ms) this.toastTimer = setTimeout(() => e.classList.remove('show'), ms);   // 0 keeps it up
  },
  banner() {
    const bs = game.lv.boss;
    if (bs && bs.def) { const n = save.camp.fails[game.failKey()] || 0; this.toast(L2(bs.def.name) + '\n' + (n >= 3 ? (bs.def.how ? L2(bs.def.how) : t('bossHow')) : L2(bs.def.intro[n % bs.def.intro.length])), 2200); return; }   // a boss: its name and a line
    if (game.mode !== 'camp' && game.world >= WORLDS.length) { this.toast(L2(SUMMIT.name), 1800); return; }
    const intro = game.mode === 'camp' ? game.rc : (game.wd.intro && game.wd.intro[game.stage]) || {}, news = [intro.news && L2(intro.news), game.lv.dark && t('dark')].filter(Boolean).join(', ');
    this.toast(tf('world', { n: game.world + 1 }) + ' · ' + L2(game.wd.name) + '  ' + (game.world + 1) + '-' + (game.stage + 1) + (news ? '\n' + tf('news', { n: news }) : ''), news ? 2800 : 1800);   // and what this level brings
  },
  comboPop(n) { const e = $('combo'); e.replaceChildren(px('×' + n)); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop', 'show'); },
  comboEnd() { $('combo').classList.remove('show'); },
  hurt() { const e = $('hearts'); e.classList.remove('hit'); void e.offsetWidth; e.classList.add('hit'); },
  coinBump() { const e = $('purse'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); },
  flash() { const e = $('fade'); e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); },
  // Price tags over the items of a shop (they stay put: a room's camera does not move); the
  // middle one stands a tag higher, so long names next to each other do not overlap.
  labels(lv) {
    const box = $('labels');
    if (!lv || !lv.pickups.length) { if (this.labelEls.length) { box.replaceChildren(); this.labelEls = []; } return; }
    if (this.labelEls.length !== lv.pickups.length) { box.replaceChildren(); this.labelEls = lv.pickups.map(() => box.appendChild(el('div', 'tag'))); }
    lv.pickups.forEach((p, i) => {
      const e = this.labelEls[i], price = game.priceOf(p), text = L2(p.item.name) + '\n' + (p.sold ? t('sold') : price ? price : t('free'));
      if (e.dataset.text !== text) { e.dataset.text = text; e.replaceChildren(px(text, 34)); e.h = 0; }
      if (!e.h) e.h = e.offsetHeight;
      e.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y - p.r - 8 - e.h - lv.cam) + 'px) translateX(-50%)';
      e.classList.toggle('dim', p.sold || price > game.coins);
    });
  },
  frame(g) {
    const playing = g.state !== 'menu' && g.state !== 'boot';
    $('hud').classList.toggle('on', playing);
    if (playing && !view.hudB) view.hudB = Math.max(...[...$('hud').children].map((e) => e.getBoundingClientRect().bottom));   // the threat signs go under it, the level's name too (see Game.threats)
    $('pad').classList.toggle('on', coarse && g.state === 'play');
    $('pad').classList.toggle('stick', !!save.stick);   // with the stick, a round jump key alone, in the corner
    $('pad').classList.toggle('idle', performance.now() - padUsed > 2500);   // unused, the keys go faint
    const fh = $('floorHint'), lv = g.lv, fy = lv.floor - lv.cam;   // how to jump, written on the first level's floor, in the band over the keys
    const onFloor = g.state === 'play' && lv.kind === 'well' && g.world === 0 && g.stage === 0 && !g.bonus && fy < view.h - view.keep;
    fh.classList.toggle('on', onFloor);
    if (onFloor) {
      if (!fh.firstChild) fh.append(px(t(coarse ? 'tapJump' : 'keyJump')));
      fh.style.transform = 'translate(' + Math.round(view.w / 2) + 'px,' + Math.round(fy + (view.h - view.keep - fy) / 2) + 'px) translate(-50%, -50%)';
    }
    if (g.hp !== this.hp || g.maxHp !== this.max) {
      this.hp = g.hp; this.max = g.maxHp;
      const h = $('hearts');
      h.replaceChildren();
      for (let i = 0; i < g.maxHp; i++) { const k = i < g.hp ? 'full' : 'empty', s = el('i', k); s.innerHTML = pxSvg(7, 6, `<path fill="currentColor" d="${inkPath(HEART[k], 0, 0)}"/>`); h.append(s); }
    }
    if (g.coins !== this.coins) { this.coins = g.coins; $('coins').replaceChildren(px(g.coins)); }
    const bh = $('bossHp'), bs = g.lv.boss, bon = !!bs && !bs.dead && playing;   // a boss's hearts, under the HUD (Lucky Tower's players asked for them)
    bh.classList.toggle('on', bon);
    if (bon && (bs.hp !== this.bhp || bs.max !== this.bmax)) { this.bhp = bs.hp; this.bmax = bs.max; bh.replaceChildren(...Array.from({ length: bs.max }, (_, i) => el('i', i < bs.hp ? null : 'off'))); }
    if (bon) bh.style.top = Math.round(view.hudB + 6) + 'px';
    const gun = $('gun'), left = g.gunT > 0 && g.state === 'play' ? Math.ceil((g.gunT / g.gunMax) * 10) : 0;   // the fizz left, in tenths, blinking near the end
    gun.classList.toggle('on', left > 0);
    if (left) { gun.dataset.k = g.pow; gun.firstChild.style.width = left * 10 + '%'; gun.classList.toggle('low', g.gunT < 1 && Math.floor(g.gunT * 6) % 2 === 0); }
    const m = Math.floor(g.climbed + g.levelM);
    if (m !== this.m) { this.m = m; $('height').replaceChildren(px(m + ' ' + t('m'))); }
    const st = g.bonus ? t('bonus') + ' ' + Math.max(0, Math.ceil(g.bonusT)) : g.lv.kind === 'shop' || g.lv.kind === 'treasure' ? t(g.lv.kind) : g.mode !== 'camp' && g.world >= WORLDS.length ? L2(SUMMIT.name) : (g.world + 1) + '-' + (g.stage + 1);   // a bonus level counts its seconds down
    if (st !== this.stage) { this.stage = st; $('stage').replaceChildren(px(st)); }
    const c = $('combo');
    if (g.combo > 0 && g.hero) c.style.transform = 'translate(' + Math.round(g.hero.cx) + 'px,' + Math.round(g.hero.minY - g.lv.cam - 30) + 'px) translateX(-50%)';
    this.labels(g.lv.pickups.length ? g.lv : null);   // a room's things, or a trader's in the shaft
  },
};

// ── Controls ─────────────────────────────────────────────────
// As in Downwell: left, right and jump, plus down to let go of a wall or a ceiling.
// Keyboard: the arrows and space. Touch: a pad along the bottom, left and right under the
// left thumb (it can slide from one to the other), down and jump under the right one.
const input = {
  left: false, right: false, down: false, jump: false, swipe: false, joy: false,   // swipe: the side is a drag over the game, not a key; joy: the stick's
  get dir() { return (this.right ? 1 : 0) - (this.left ? 1 : 0); },
  set(what, on) {
    if (this[what] === on) return;
    this[what] = on;
    if (what === 'jump') { if (on) game.requestJump(); else game.releaseJump(); }
    else if (what === 'down' && on) game.pressDown();
  },
  clear() {
    aimCancel();
    for (const k of ['left', 'right', 'down', 'jump']) this.set(k, false);
    this.swipe = false; joyEnd();
    for (const e of document.querySelectorAll('#pad .on')) e.classList.remove('on');
  },
};
const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', Space: 'jump' };
document.addEventListener('keydown', (e) => {
  const k = KEYS[e.code];
  if (!k || game.state !== 'play') return;
  e.preventDefault();
  if (!e.repeat) {
    input.set(k, true);
    if (k === 'left' || k === 'right') { const d = k === 'right' ? 1 : -1; if (lastTap.d === d && e.timeStamp - lastTap.t < 280) game.dash(d); lastTap = { d, t: e.timeStamp }; }   // a double tap: a dash
  }
});
document.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input.set(k, false); });
// A part of the pad follows the finger that pressed it until that finger lets go.
let padUsed = 0;   // when a touch key was last pressed: unused for a while, the keys fade (see ui.frame)
function padPart(part, onTouch) {
  let id = -1;
  part.addEventListener('pointerdown', (e) => {
    padUsed = performance.now();
    if (id !== -1) return;
    id = e.pointerId; e.preventDefault();
    try { part.setPointerCapture(id); } catch (err) { /* fine */ }
    onTouch(e);
  });
  part.addEventListener('pointermove', (e) => { if (e.pointerId === id) { padUsed = performance.now(); onTouch(e); } });
  for (const type of ['touchstart', 'touchmove']) part.addEventListener(type, (e) => e.preventDefault(), { passive: false });   // no selection, loupe or callout in Safari
  part.addEventListener('contextmenu', (e) => e.preventDefault());
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) part.addEventListener(type, (e) => { if (e.pointerId === id) { id = -1; onTouch(null); } });
}
const dpad = $('dpad');
dpad.children[0].append(px('◀')); dpad.children[1].append(px('▶')); $('jumpBtn').append(px('▲'));
let lastTap = { d: 0, t: -1e9 }, padDir = 0;   // the last press of a side, for a double tap (keys and pad alike)
padPart(dpad, (e) => {
  if (aim.on && aim.hyb) {   // ▲ aiming: the finger on ◀ ▶ is the aim's stick, from where it is now
    if (e) aimStick('pad', e.clientX, e.clientY); else if (aim.stk && aim.stk.id === 'pad') aim.stk.id = -1;
    padDir = 0; input.set('left', false); input.set('right', false); dpad.children[0].classList.remove('on'); dpad.children[1].classList.remove('on');
    return;
  }
  const r = dpad.getBoundingClientRect(), right = !!e && e.clientX > r.left + r.width / 2, d = e ? (right ? 1 : -1) : 0;
  if (d && !padDir) { if (lastTap.d === d && e.timeStamp - lastTap.t < 280) game.dash(d); lastTap = { d, t: e.timeStamp }; }   // a fresh press: a second one quick is a dash
  padDir = d;
  input.set('left', !!e && !right); input.set('right', right);
  dpad.children[0].classList.toggle('on', input.left); dpad.children[1].classList.toggle('on', input.right);
});
const act = $('act'), jumpBtn = $('jumpBtn');
// ▲ (either scheme) tells a tap from a long press on the first press, as UIKit does (a tap counts as the finger
// lifts, a long press once held `hold` s): let go before that, the plain jump, a quick second tap another; held on
// (or moved past `slop` px: a pull), that very jump is aimed: the hero hangs where it is (or stands) and the dots show
// the arc, the plain jump's to begin with; a second finger anywhere leans it like a stick (see aimStick), or ▲ pulled
// back like a slingshot (the further, the stronger: `min` of a jump to all of it at `full` of the width); let go of ▲
// and it goes. `hold` is half UIKit's 0.5 s: a jump must not wait long to be told apart. `on`: the aim is put away
// for now (user); off, ▲ is the plain key: a jump as it goes down, higher the longer it is held.
const HYB = { on: false, hold: 0.25, slop: 10, full: 0.18, min: 0.6 };
let hyb = null;   // ▲ down, not yet told apart: since when, where
padPart(act, (e) => {
  jumpBtn.classList.toggle('on', !!e);
  if (!HYB.on) { input.set('jump', !!e); return; }
  const g = game, x = e ? e.clientX - view.left : 0;
  if (e && aim.on && aim.hyb) { aim.x = x; aim.y = e.clientY; return; }   // pulling
  if (!e) {   // let go: an aimed jump goes where aimed; a tap is the plain jump
    if (aim.on && aim.hyb) { const p = aim.p, vx = aim.vx, vy = aim.vy; aimCancel(); g.requestJump(p > 0 ? { vx, vy } : null); }
    else if (hyb) { hyb = null; g.requestJump(); }
    return;
  }
  if (!hyb) hyb = { t0: performance.now(), x0: x, y0: e.clientY, x, y: e.clientY };
  hyb.x = x; hyb.y = e.clientY;
  if (Math.hypot(x - hyb.x0, e.clientY - hyb.y0) > HYB.slop) hybAim(performance.now());   // pulled at once: a slingshot
});
function hybCheck(now) { if (HYB.on && hyb && !aim.on && now - hyb.t0 >= HYB.hold * 1000) hybAim(now); }   // held: a long press
function hybAim(now) {   // ▲ held or pulled: aim the jump it is (off what the hero touches, or one left in the air)
  const g = game;
  if (aim.on || g.state !== 'play' || (g.sinceContact > JUMP.coyote && g.air <= 0)) return;
  Object.assign(aim, { on: true, hyb: true, sx: hyb.x0, x: hyb.x, sy: hyb.y0, y: hyb.y, p: 0, t0: now - HYB.hold * 1000 });   // the plain arc shows at once
}
// Gestures over the game (not on the keys), beside them: a finger held off to the left or the right of
// where it came down runs that way (the centre follows a long drag, so turning back is quick), a quick
// swipe to a side dashes (as soon as it is fast enough, or on letting go of a quick one); a quick flick up jumps (held, it goes higher), a quick flick down lets go; a
// tap jumps, a second finger's too. With the stick on (see JOY), a first finger is the stick instead.
const GEST = { dead: 12, flick: 30, quick: 320, tap: 230, still: 12, swipe: 28, fast: 500 };
let gest = null, tap2 = null;
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || e.target.closest('#pad, button, .panel')) return;
  if (aim.on && aim.hyb) { aimStick(e.pointerId, e.clientX, e.clientY, true); return; }   // ▲ aiming: a finger anywhere is the aim's stick
  if (gest || joy) { tap2 = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp }; return; }
  if (save.stick) { joyStart(e); return; }
  gest = { id: e.pointerId, x0: e.clientX, y0: e.clientY, ax: e.clientX, t0: e.timeStamp, dir: 0, flick: '', moved: false, dashed: false };
});
document.addEventListener('pointermove', (e) => {
  if (aim.on && aim.hyb && ((aim.stk && aim.stk.id === e.pointerId) || (gest && gest.id === e.pointerId))) {   // the aim's stick (the running finger turns into it)
    if (gest && gest.id === e.pointerId) { gest = null; input.swipe = false; input.set('left', false); input.set('right', false); }
    aimStick(e.pointerId, e.clientX, e.clientY); return;
  }
  if (joy && e.pointerId === joy.id) { joyMove(e); return; }
  const g = gest;
  if (!g || e.pointerId !== g.id) return;
  const ox = e.clientX - g.x0, dy = e.clientY - g.y0, quick = e.timeStamp - g.t0 < GEST.quick, upright = Math.abs(dy) > 1.5 * Math.abs(ox);
  if (Math.abs(ox) > GEST.still || Math.abs(dy) > GEST.still) g.moved = true;
  if (!g.flick && quick && upright && -dy > GEST.flick) { g.flick = 'up'; input.set('jump', true); }
  else if (!g.flick && quick && upright && dy > GEST.flick) { g.flick = 'down'; game.pressDown(); }
  const dx = e.clientX - g.ax;
  if (Math.abs(dx) > 2 * GEST.dead) g.ax = e.clientX - Math.sign(dx) * 2 * GEST.dead;
  const dir = Math.abs(dx) < GEST.dead ? 0 : Math.sign(dx);
  if (dir !== g.dir) { g.dir = dir; input.swipe = dir !== 0; input.set('left', dir < 0); input.set('right', dir > 0); if (dir) game.nudge(dir); }   // a drag moves at once, on the ground or in the air
  const t = e.timeStamp - g.t0;
  if (!g.dashed && t < GEST.quick && Math.abs(ox) > GEST.swipe && Math.abs(ox) > Math.abs(dy) && Math.abs(ox) > (GEST.fast * t) / 1000) { g.dashed = true; game.dash(Math.sign(ox)); }   // a fast swipe: a dash now, not on letting go
});
const gestEnd = (e) => {
  if (aim.stk && aim.stk.id === e.pointerId) { aim.stk.id = -1; if (joy && joy.id === e.pointerId) joyEnd(); return; }   // the aim's stick let go: it keeps its aim
  if (tap2 && e.pointerId === tap2.id) {   // a second finger's tap
    if (e.type === 'pointerup' && e.timeStamp - tap2.t < GEST.tap && Math.hypot(e.clientX - tap2.x, e.clientY - tap2.y) < GEST.still) game.requestJump();
    tap2 = null; return;
  }
  const j = joy;
  if (j && e.pointerId === j.id) { joyEnd(); if (!j.moved && e.type === 'pointerup' && e.timeStamp - j.t0 < GEST.tap) game.requestJump(); return; }   // a tap: a jump
  const g = gest;
  if (!g || e.pointerId !== g.id) return;
  gest = null;
  if (g.dir) {   // let go: a quick swipe was a dash that way, a held drag just stops
    input.swipe = false; input.set('left', false); input.set('right', false);
    if (!g.dashed && e.timeStamp - g.t0 < GEST.quick + 100 && Math.abs(e.clientX - g.x0) > GEST.swipe) game.dash(g.dir);
  }
  if (g.flick === 'up') input.set('jump', false);
  else if (!g.moved && e.type === 'pointerup' && e.timeStamp - g.t0 < GEST.tap) game.requestJump();   // a tap: a whole jump (no button to let go of)
};
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, gestEnd);
// The stick (the round ▲ key beside it): it comes up where a finger comes down, anywhere, and runs left or right as
// the finger leans that way: past `on` of its `reach` (px), and on till it is back under `off` (so it
// doesn't flicker at the edge); all or nothing, as on a d-pad, easing in `accel` times as fast as the keys.
// Two quick leans the same way dash; pulled down past `down` (more down than to the side) it lets go of a
// wall; leaning up does nothing (user: no jump on the stick). Dragged past its rim it follows the finger, so
// turning back is never more than a reach away. Jumps are the ▲ key, a tap, a second finger's tap.
const JOY = { reach: 56, on: 0.125, off: 0.06, down: 0.45, accel: 2 };   // twice as sensitive as at first (user: it felt sticky)
let joy = null;
const joyEl = $('stick'), joyKnob = joyEl.firstElementChild;
joyEl.prepend(pixelDisc(56, 0.6)); joyKnob.append(pixelDisc(26, 0.9));   // the base under the knob
function joyShow() {
  joyEl.style.transform = 'translate(' + joy.bx + 'px,' + joy.by + 'px)';
  joyKnob.style.transform = 'translate(' + (joy.x - joy.bx) + 'px,' + (joy.y - joy.by) + 'px)';
  joyKnob.classList.toggle('on', joy.dir !== 0);
}
function joyStart(e) {
  if (game.state !== 'play') return;
  const x = e.clientX, y = e.clientY;
  padUsed = performance.now();
  joy = { id: e.pointerId, bx: x, by: y, x, y, dir: 0, low: false, moved: false, t0: e.timeStamp }; input.joy = true;
  joyShow(); joyEl.classList.add('on');
}
function joyMove(e) {
  const j = joy, R = JOY.reach, x = e.clientX, y = e.clientY;
  padUsed = performance.now();   // the ▲ key stays bright while the stick is in use
  if (aim.on && aim.hyb) {   // ▲ aiming: the stick leans the arc, from its base
    if (!aim.stk || aim.stk.id !== j.id) aim.stk = { id: j.id, sx: j.bx, sy: j.by, x, y }; else { aim.stk.x = x; aim.stk.y = y; }
    if (j.dir) { j.dir = 0; input.set('left', false); input.set('right', false); }
    j.x = x; j.y = y; stkShow(); return;
  }
  let dx = x - j.bx, dy = y - j.by;
  const d = Math.hypot(dx, dy);
  if (d > GEST.still) j.moved = true;
  if (d > R) { j.bx = x - (dx * R) / d; j.by = y - (dy * R) / d; dx = x - j.bx; dy = y - j.by; }   // past the rim: the base comes along
  const dir = Math.abs(dx) > (Math.sign(dx) === j.dir ? JOY.off : JOY.on) * R ? Math.sign(dx) : 0;
  if (dir) j.moved = true;   // a lean, however short, is not a tap
  if (dir && dir !== j.dir) { if (lastTap.d === dir && e.timeStamp - lastTap.t < 280) game.dash(dir); lastTap = { d: dir, t: e.timeStamp }; }   // a fresh lean: a second one quick is a dash
  if (dir !== j.dir) { j.dir = dir; input.set('left', dir < 0); input.set('right', dir > 0); }
  const low = dy > JOY.down * R && dy > Math.abs(dx);
  if (low !== j.low) input.set('down', low);   // pulled down: lets go of a wall, on a floor a crouch while held
  j.low = low; j.x = x; j.y = y; joyShow();
}
function joyEnd() {
  if (!joy) return;
  joy = null; input.joy = false; input.set('left', false); input.set('right', false); input.set('down', false); joyEl.classList.remove('on');
}
for (const type of ['touchend', 'touchcancel']) document.addEventListener(type, (e) => {   // iOS can lose a finger's pointerup (off the top of the screen, say): no finger on the glass, nothing held
  if (e.touches.length) return;
  joyEnd();
  if (gest) { if (gest.dir) { input.swipe = false; input.set('left', false); input.set('right', false); } if (gest.flick === 'up') input.set('jump', false); }
  gest = null; tap2 = null;
}, { passive: true });

// ── Sound ────────────────────────────────────────────────────
// Effects and music made with ElevenLabs (tools/audio.py). One Web Audio context, made on the first key press or
// touch (browsers keep sound off until then). Effects play with a little random pitch; music loops and cross-fades:
// calm in the menu and the shop, a climb of each world's own in the shaft, the bonus levels', the stash's, boss at the
// summit, quieter while paused or over (each fetched when first wanted, the last four kept: all of them decoded are ~170 MB). It sleeps
// while the page is hidden; "sound" in the menu and the pause turns it off and on (saved).
const SOUNDS = ['jump', 'airjump', 'walljump', 'land', 'stomp', 'coin', 'hurt', 'fall', 'die', 'spring', 'crumble', 'combo',
  'buy', 'deny', 'bubble', 'portal', 'click', 'bosshit', 'burn', 'spit', 'shot'];
const MUSIC_VOL = 0.4, FX_VOL = 0.7, CLIMBS = ['climb', 'ice', 'mine', 'void'], PENTA = [0, 2, 4, 7, 9];
const WORLD_MUSIC = { tokyo: 'tokyo', blocks: 'blocks', sky: 'sky', junk: 'junk' };   // the campaign's worlds 4-7, each its own climb (tools/audio.py)
const sound = {
  ctx: null, out: null, fx: null, mus: null, bufs: {}, track: null, src: null, gain: null, duck: 1, asked: {}, used: [],
  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running' && this.ctx.state !== 'closed' && !document.hidden && !ads.quiet) this.ctx.resume(); return; }   // suspended, or 'interrupted' (iOS: a call, a notification, another app's sound)
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.out = c.createGain(); this.out.gain.value = save.sound === false ? 0 : 1; this.out.connect(c.destination);
    this.fx = c.createGain(); this.fx.gain.value = FX_VOL; this.fx.connect(this.out);
    this.mus = c.createGain(); this.mus.gain.value = MUSIC_VOL; this.mus.connect(this.out);
    for (const n of SOUNDS) this.load(n, 'assets/sfx/' + n + '.mp3');
    for (const n of ['calm', 'climb']) this.fetchMusic(n);
  },
  load(name, path) { return fetch(path).then((r) => r.arrayBuffer()).then((a) => this.ctx.decodeAudioData(a)).then((b) => { this.bufs[name] = b; }).catch(() => {}); },
  fetchMusic(name) {
    if (this.asked[name]) return;
    this.asked[name] = true;
    this.load('m:' + name, 'assets/music/' + name + '.mp3').then(() => {   // over four kept: the longest unplayed one goes (fetched again if wanted)
      const kept = Object.keys(this.bufs).filter((k) => k.startsWith('m:')).map((k) => k.slice(2));
      if (kept.length <= 4) return;
      const old = kept.filter((n) => n !== this.track && n !== name).sort((a, b) => this.used.indexOf(a) - this.used.indexOf(b))[0];
      if (old) { delete this.bufs['m:' + old]; this.asked[old] = false; }
    });
  },
  note(k, vol = 0.35) {   // a soft bell, the k-th step of a major pentatonic up from C5
    if (!this.ctx || save.sound === false || this.ctx.state !== 'running') return;
    const c = this.ctx, t = c.currentTime, f = 523.25 * Math.pow(2, PENTA[k % 5] / 12 + Math.floor(k / 5)), g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    for (const [m, type, a] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3.01, 'sine', 0.12]]) {   // a triangle and two overtones: a marimba-ish ping
      const o = c.createOscillator(), og = c.createGain();
      o.type = type; o.frequency.value = f * m; og.gain.value = a;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.75);
    }
    g.connect(this.fx);
  },
  play(name, vol = 1, rate = 1) {
    const b = this.bufs[name];
    if (!b || save.sound === false || this.ctx.state !== 'running') return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = b; s.playbackRate.value = rate * (0.96 + 0.08 * Math.random()); g.gain.value = vol;
    s.connect(g); g.connect(this.fx); s.start();
  },
  // A loop starts and ends where its sound does (an MP3 has a little silence padded at both ends).
  music(name) {
    const b = this.bufs['m:' + name];
    if (this.track === name) return;
    if (!b) { this.fetchMusic(name); return; }   // the one playing goes on till it is here
    this.used = this.used.filter((n) => n !== name).concat(name);
    const c = this.ctx, t = c.currentTime, d = b.getChannelData(0);
    if (this.src) { this.gain.gain.setTargetAtTime(0, t, 0.25); this.src.stop(t + 1.5); }
    let a = 0, z = d.length - 1;
    while (a < z && Math.abs(d[a]) < 1e-4) a++;
    while (z > a && Math.abs(d[z]) < 1e-4) z--;
    const src = c.createBufferSource(), gain = c.createGain();
    src.buffer = b; src.loop = true; src.loopStart = a / b.sampleRate; src.loopEnd = z / b.sampleRate;
    gain.gain.value = 0; gain.gain.setTargetAtTime(1, t, 0.4);
    src.connect(gain); gain.connect(this.mus); src.start(t, src.loopStart);
    this.track = name; this.src = src; this.gain = gain;
    src.onended = () => { if (this.src === src) { this.src = null; this.track = null; } };   // stopped by the system (iOS can): the next frame starts it again
  },
  frame(g) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const kind = g.lv.kind;
    this.music(g.state === 'menu' || g.state === 'boot' || kind === 'shop' ? 'calm' : kind === 'treasure' ? 'stash' : kind === 'boss' ? 'boss' : g.bonus ? 'bonus' : g.wd === CRYPT ? 'void' : WORLD_MUSIC[g.wd.id] || CLIMBS[g.world] || 'climb');   // the Crypt to the Void's drone
    const duck = g.state === 'play' || g.state === 'menu' ? 1 : 0.35;
    if (duck !== this.duck) { this.duck = duck; this.mus.gain.setTargetAtTime(MUSIC_VOL * duck, this.ctx.currentTime, 0.2); }
  },
  toggle() {
    save.sound = save.sound === false; persist();
    if (this.out) this.out.gain.setTargetAtTime(save.sound ? 1 : 0, this.ctx.currentTime, 0.05);
  },
  sleep(hidden) { if (this.ctx) { if (hidden) this.ctx.suspend(); else this.ctx.resume(); } },
};
for (const type of ['keydown', 'pointerdown', 'touchend', 'click']) document.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });

// ── Ads (Playgama Bridge) ─────────────────────────────────────
// Waited for at boot (see boot; given up on after BRIDGE_WAIT ms, and the game goes on without it). Ads: a rewarded one
// doubles a bonus level's coins; an interstitial at a natural pause (a level done, a bonus done, a run over), one a
// minute at most. The platform's pause and sound requests are kept (an ad open, a tab switched). Off a platform (GitHub
// Pages, here) the Bridge is a mock with no ads: there the rewarded button doubles at once, so the way it goes can be
// tried. No Bridge at all: no rewarded button, no interstitials.
// Analytics (the digest §9: telemetry says what, playtests why): the level's start, end and failure go as the platform's own
// messages (Bridge records them); what only the game knows goes through analytics.send. Without the Bridge, nothing.
const pmsg = (m, data) => { if (ads.ok) try { bridge.platform.sendMessage(m, data); } catch (e) { /* not on this platform */ } };
const track = (name, data) => { if (ads.ok && bridge.analytics) try { bridge.analytics.send(name, data); } catch (e) { /* not on this platform */ } };
const BRIDGE_WAIT = 4000, AD_GAP = 180000, AD_AFTER = 3;   // an interstitial three minutes apart at most, from the third pause on (CrazyGames; the digest §6)
const ads = {
  ok: false, quiet: false, off: false, held: false, lastAd: 0, pauses: 0,   // quiet: the platform's sound off, or its pause on; lastAd: when one was last up
  init() {   // resolves true once the Bridge is up, false if it never came (no script in time, or its initialize failed)
    return new Promise((done) => {
      const t0 = performance.now();
      const go = () => {
        if (!window.bridge) { if (performance.now() - t0 < BRIDGE_WAIT) setTimeout(go, 50); else done(false); return; }
        const late = setTimeout(() => done(false), BRIDGE_WAIT);
        bridge.initialize().then(() => {
          clearTimeout(late); this.ok = true;
          bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, (on) => { this.off = !on; this.hush(); });
          bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, (p) => { this.held = p; this.hush(); if (p) game.togglePause(true); });
          this.off = !bridge.platform.isAudioEnabled; this.hush();
          done(true);
        }).catch(() => { clearTimeout(late); done(false); });
      };
      go();
    });
  },
  between(done) {   // an interstitial, if one is due and to be had; `done` once it is closed, or at once if none comes
    const now = performance.now();
    if (!this.ok || !bridge.advertisement.isInterstitialSupported || ++this.pauses < AD_AFTER || now - this.lastAd < AD_GAP) { done(); return; }
    const EV = bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED;
    let over = false, timer = 0;
    const end = () => { if (over) return; over = true; clearTimeout(timer); bridge.advertisement.off(EV, on); done(); };
    const on = (s) => { if (s === 'opened') { clearTimeout(timer); this.lastAd = performance.now(); } else if (s === 'closed' || s === 'failed') end(); };
    bridge.advertisement.on(EV, on); timer = setTimeout(end, 3000);   // none opened in time: on without it
    bridge.advertisement.showInterstitial();
  },
  hush() { this.quiet = this.off || this.held; sound.sleep(this.quiet || document.hidden); },
  get mock() { return this.ok && bridge.platform.id === 'mock'; },
  get canReward() { return this.ok && (this.mock || bridge.advertisement.isRewardedSupported); },
  reward(done) {   // done(true) once it was watched to its end; done(false) if it was closed early or failed
    if (this.mock) { done(true); return; }
    let got = false;
    const on = (s) => {
      if (s === 'rewarded') got = true;
      if (s === 'closed' || s === 'failed') { bridge.advertisement.off(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, on); done(got); }
    };
    bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, on);
    bridge.advertisement.showRewarded();
  },
};

// ── Slingshot ────────────────────────────────────────────────
// With a mouse, as well as the keys: press anywhere, pull back, let go, and the squishy
// leaps the other way, off whatever it is on (a floor, a wall, a ceiling — never into it)
// or with its jump in the air. The pull sets the power, up to a full jump; one inside the
// dead zone is a cancel. While aiming, the body is squeezed along the launch line, it
// looks where it is going and dots show the arc. Touch keeps the pad.
const aim = { on: false, id: -1, sx: 0, sy: 0, x: 0, y: 0, p: 0, ux: 0, uy: -1, vx: 0, vy: 0 };
const dots = new Float32Array(JUMP.dots * 2);
let nDots = 0;
function aimUpdate() {
  const k = aim.stk, byStk = !!k && Math.hypot(k.x - k.sx, k.y - k.sy) >= JUMP.deadZone;   // a stick points where to go; ▲ pulled back points the other way
  const dx = byStk ? k.x - k.sx : aim.sx - aim.x, dy = byStk ? k.y - k.sy : aim.sy - aim.y, len = Math.hypot(dx, dy);
  if (len < JUMP.deadZone) {   // not pulled: no dots, but in the hybrid after a moment the plain jump's
    aim.p = 0;
    if (aim.hyb && performance.now() - aim.t0 > HYB.hold * 1000) {   // off a wall up and away from it, in the air straight up
      const t = game.touch, wall = game.sinceContact <= JUMP.coyote && (t === 1 || t === 2);
      aim.p = 1; aim.ux = 0; aim.uy = -1; aim.vx = wall ? (t === 1 ? 1 : -1) * JUMP.wallX * game.R : game.hero.rigVx; aim.vy = -game.vjump * (wall ? JUMP.wallUp : 1);
    }
    return;
  }
  let ux = dx / len, uy = dy / len;
  const n = game.surfaceNormal();
  if (n) {   // at least `minUp` out of the surface, still to the side it was aimed
    const tx = -n[1], ty = n[0], out = ux * n[0] + uy * n[1], along = ux * tx + uy * ty;
    if (out < JUMP.minUp) { const s = (along < 0 ? -1 : 1) * Math.sqrt(1 - JUMP.minUp * JUMP.minUp); ux = JUMP.minUp * n[0] + s * tx; uy = JUMP.minUp * n[1] + s * ty; }
  }
  aim.ux = ux; aim.uy = uy;
  aim.p = Math.min(1, (len - JUMP.deadZone) / (byStk ? JOY.reach - JUMP.deadZone : (aim.hyb ? HYB.full : JUMP.dragFrac) * view.w));
  const lo = aim.hyb ? HYB.min : JUMP.minPower, v = game.vjump * (lo + (1 - lo) * aim.p);
  aim.vx = ux * v; aim.vy = uy * v;
}
function aimCancel() { aim.on = false; aim.hyb = false; hyb = null; aim.p = 0; nDots = 0; if (game.hero) game.hero.squeezeIn = 0; if (aim.stk) { aim.stk = null; stkShow(); } }
// The hybrid's other finger while ▲ aims: a stick from where it came down (or where it was), drawn as the stick
// is, all of the jump at its reach; let go, it keeps its aim till ▲ is let go.
function aimStick(id, x, y, fresh) {
  if (fresh || !aim.stk || aim.stk.id !== id) aim.stk = { id, sx: x, sy: y, x, y }; else { aim.stk.x = x; aim.stk.y = y; }
  stkShow();
}
function stkShow() {
  const k = aim.stk;
  if (!k) { if (!joy) joyEl.classList.remove('on'); return; }
  const dx = k.x - k.sx, dy = k.y - k.sy, d = Math.hypot(dx, dy), s = d > JOY.reach ? JOY.reach / d : 1;
  joyEl.style.transform = 'translate(' + k.sx + 'px,' + k.sy + 'px)'; joyKnob.style.transform = 'translate(' + dx * s + 'px,' + dy * s + 'px)';
  joyKnob.classList.toggle('on', d >= JUMP.deadZone); joyEl.classList.add('on');
}
function aimFrame(now) {
  hybCheck(now);
  if (!aim.on) return;
  if (game.state !== 'play') { aimCancel(); return; }
  aimUpdate();
  const b = game.hero, look = game.heroLook;
  b.squeezeIn = JUMP.squeeze * aim.p;
  if (aim.p > 0) { b.sqAx = aim.ux; b.sqAy = aim.uy; look.x = b.cx + aim.ux * 240; look.y = b.cy + aim.uy * 240; look.t = now; }
}
// The arc as dots, from just outside the body until it meets a wall, a block or the floor.
function aimPreview() {
  nDots = 0;
  if (!aim.on || aim.p <= 0 || game.state !== 'play') return;
  const b = game.hero, lv = game.lv, g = WORLD.gravity, T = JUMP.preview / JUMP.dots, r2 = (1.2 * b.R) ** 2;
  for (let k = 1; k <= JUMP.dots; k++) {
    const s = k * T, x = b.cx + aim.vx * s, y = b.cy + aim.vy * s + 0.5 * g * s * s;
    if (x < lv.l || x > lv.r || y > lv.floor) break;
    let hit = false;
    for (const r of lv.near(y, y)) if (!r.plank && x > r.x0 && x < r.x1) { hit = true; break; }
    if (hit) break;
    if ((x - b.cx) ** 2 + (y - b.cy) ** 2 < r2) continue;
    dots[2 * nDots] = x; dots[2 * nDots + 1] = y; nDots++;
  }
}

// ── Setup ────────────────────────────────────────────────────
const canvas = $('gl');
const uiEl = $('ui');
const view = { w: 1, h: 1, left: 0, keep: 0 };   // keep: px at the bottom under the touch keys
const perf = { ctxLoss: 0, lost0: 0, t0: 0, last: 0, active: 0, ft: [] };   // the renderer counts lost contexts here (Gum sends them as telemetry); the rest: see perfFrame
const fx = new FX();
const game = new Game();
const renderer = new Renderer(canvas);
let paused = document.hidden, started = false, firstFrame = false, layoutQueued = false;
{ const s = new URLSearchParams(location.search).get('seed'); if (s != null && s !== '' && Number.isFinite(+s)) nextSeed = +s; }

// The view is a portrait column: the whole screen on a phone held upright, a 9:16
// column in the middle of a wider window.
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw < 120 || vh < 120) return;   // a collapsed frame or hidden host: keep the last layout
  const W = vw < vh ? vw : Math.min(vw, Math.round(vh * 0.5625)), H = vh, left = Math.round((vw - W) / 2);   // a phone held upright: all of its width
  view.w = W; view.h = H; view.left = left; view.hudB = 0;   // (the HUD measured again: see ui.frame)
  const pad = $('pad');   // what the touch keys cover at the bottom (their height and the pad's padding, safe area and all)
  view.keep = coarse ? Math.max(...[...pad.querySelectorAll('.key')].map((k) => parseFloat(getComputedStyle(k).height))) + parseFloat(getComputedStyle(pad).paddingBottom) + 8 : 0;   // the tallest key
  for (const e of [canvas, uiEl]) { e.style.width = W + 'px'; e.style.height = H + 'px'; e.style.left = left + 'px'; }
  renderer.resize(W, H, window.devicePixelRatio || 1);   // the canvas a device pixel per pixel: the game pixels are copied up onto it
  game.applyMods();
  if (started && Math.abs(W - game.builtW) > 2) game.resized();
  else if (started && ui.open === 'menu') ui.menu();   // only taller or shorter: the menu's rows, and the hero over them, placed again
  if (started && coarse && vw > vh) game.togglePause(true);   // held sideways: paused under the 'turn it upright' screen
}
// Resizing the canvas clears it, so a resize is only flagged here and applied at the
// start of the next frame, right before drawing.
function queueLayout() { layoutQueued = true; }

canvas.addEventListener('pointerdown', (e) => {
  if (!JUMP.mouse || e.pointerType === 'touch' || !started || paused || e.button > 0 || game.state !== 'play' || aim.on) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  aim.on = true; aim.id = e.pointerId; aim.sx = aim.x = e.clientX - view.left; aim.sy = aim.y = e.clientY; aim.p = 0;
});
canvas.addEventListener('pointermove', (e) => { if (aim.on && e.pointerId === aim.id) { aim.x = e.clientX - view.left; aim.y = e.clientY; } });
function aimRelease(e, cancel) {
  if (!aim.on || e.pointerId !== aim.id) return;
  aim.x = e.clientX - view.left; aim.y = e.clientY;
  aimUpdate();
  const p = aim.p, vx = aim.vx, vy = aim.vy;
  aimCancel();
  if (!cancel && p > 0) game.requestJump({ vx, vy });
}
canvas.addEventListener('pointerup', (e) => aimRelease(e, false));
canvas.addEventListener('pointercancel', (e) => aimRelease(e, true));
canvas.addEventListener('lostpointercapture', (e) => aimRelease(e, false));
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
$('pauseBtn').addEventListener('click', (e) => { e.stopPropagation(); game.togglePause(true); });
document.addEventListener('gesturestart', (e) => e.preventDefault());
// Safari (user: it got in the way): a finger anywhere over the game, the stick and swipes included, must never start a
// selection, the loupe or a callout. Only buttons keep their default: their click needs it. Pointer events still come.
for (const type of ['touchstart', 'touchmove']) document.addEventListener(type, (e) => { if (!(e.target.closest && e.target.closest('button, .feed, .tree'))) e.preventDefault(); }, { passive: false });   // (the book's feed scrolls)
for (const type of ['selectstart', 'contextmenu']) document.addEventListener(type, (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  paused = document.hidden; loop.last = performance.now(); sound.sleep(document.hidden || ads.quiet);
  if (paused) { if (perf.active >= 5000) perfSend(loop.last); perf.last = 0; }
  if (paused) { input.clear(); game.togglePause(true); }
});
window.addEventListener('blur', () => input.clear());
window.addEventListener('resize', queueLayout);
window.addEventListener('orientationchange', queueLayout);
if (window.visualViewport) window.visualViewport.addEventListener('resize', queueLayout);

// ── Loop ─────────────────────────────────────────────────────
const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
const loop = { last: 0, acc: 0, n: 0, ema: 16.7, prevRaw: 0, frozen: false, dpr: window.devicePixelRatio };
function frame(now) {
  requestAnimationFrame(frame);
  const raw = now - (loop.prevRaw || now);
  loop.prevRaw = now;
  if (raw > 0 && raw < 100) loop.ema += (raw - loop.ema) * 0.1;
  if (!started || paused || loop.frozen || renderer.lost || !renderer.ok) { loop.last = now; perf.last = 0; return; }
  if (coarse && loop.ema < 10 && (++loop.n & 1)) return;   // 120 Hz touch screens: draw at ~60
  runFrame(now); perfFrame(now);
}
// performance_sample (Playgama's telemetry guide): the drawn frames of play only, menus, pauses and hidden time left out
// (a gap there is no frame), sent as one sample about every 30 s.
function perfFrame(now) {
  if (!ads.ok || game.state !== 'play' || document.hidden) { perf.last = 0; return; }
  if (!perf.t0) perf.t0 = now;
  if (perf.last) { const d = now - perf.last; perf.ft.push(d); perf.active += d; }
  perf.last = now;
  if (now - perf.t0 >= 30000) perfSend(now);
}
function perfSend(now) {
  const ft = perf.ft.sort((a, b) => a - b), n = ft.length, q = (p) => ft[Math.min(n - 1, Math.floor(p * n))], over = (ms) => ft.filter((d) => d > ms).length, r1 = (v) => Math.round(v * 10) / 10;
  if (n) track('performance_sample', { target_fps: 60, window_ms: Math.round(now - perf.t0), active_ms: Math.round(perf.active), frame_count: n,
    fps_avg: r1((n * 1000) / perf.active), fps_p10: r1(1000 / q(0.9)), frame_time_p50_ms: r1(q(0.5)), frame_time_p95_ms: r1(q(0.95)), frame_time_p99_ms: r1(q(0.99)), frame_time_max_ms: r1(ft[n - 1]),
    frames_over_50ms: over(50), frames_over_100ms: over(100), frames_over_250ms: over(250), frames_over_500ms: over(500), frames_over_1000ms: over(1000), webgl_context_loss_count: perf.ctxLoss - perf.lost0, game_version: VERSION });
  perf.t0 = now; perf.active = 0; perf.ft = []; perf.lost0 = perf.ctxLoss;
}
// One frame: input → fixed-step physics → camera → draw. `fixedDt` is for the debug tick.
function runFrame(now, fixedDt) {
  if (window.devicePixelRatio !== loop.dpr) { loop.dpr = window.devicePixelRatio; layoutQueued = true; }   // moved to another screen
  if (layoutQueued) { layoutQueued = false; layout(); }
  let dt = fixedDt != null ? fixedDt : (now - loop.last) / 1000;
  loop.last = now;
  if (!(dt > 0)) dt = 0;
  if (dt > 0.25) dt = 0.25;
  if (game.state === 'pause') dt = 0;
  loop.acc += dt;
  let steps = 0;
  while (loop.acc >= STEP && steps < PHYS.maxSteps) { game.step(STEP); loop.acc -= STEP; steps++; }
  if (steps === PHYS.maxSteps) loop.acc = Math.min(loop.acc, STEP);   // slow down rather than spiral
  const alpha = loop.acc / STEP;
  game.frame(dt, alpha, now);
  sound.frame(game);
  aimFrame(now);
  aimPreview();
  fx.update(dt); updateBits(dt);
  shake.update(dt);
  renderer.draw(game, alpha, dots, nDots);
  if (!firstFrame) { firstFrame = true; canvas.classList.remove('wait'); }
}

// Boot (Playgama checklist): the Bridge up first, the save loaded from its storage in one call (a save from before it, kept by
// the browser, is taken over once), then the menu, then game_ready — the game playable.
async function boot() {
  const br = await ads.init();
  let s = null;
  if (br) try { const [v] = await bridge.storage.get([SAVE_KEY]); s = v ? (typeof v === 'string' ? JSON.parse(v) : v) : null; } catch (e) { s = null; }
  const old = !s;
  if (old) try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
  loadSave(s);
  if (br) bridge.platform.getServerTime().then((ms) => { today = Math.floor(ms / 86400000); }).catch(() => {});
  ads.lastAd = performance.now();   // the first interstitial a minute in at the earliest
  try { await Promise.race([Promise.all([document.fonts.load('25px VT323'), document.fonts.load('16px DotGothic16', 'アップウェル')]), new Promise((ok) => setTimeout(ok, 1500))]); } catch (e) { /* the system's type then */ }   // the type in before the first screen
  start();
  if (br) { if (old && s) persist(); bridge.platform.sendMessage('game_ready'); }
}
// The words in another language: the page's (the type follows it, see .tx in index.html), and the HUD written again.
function setLang(l) {
  lang = l; document.documentElement.lang = l;
  $('rotate').replaceChildren(px(t('rotate')));
  $('floorHint').replaceChildren(); ui.m = -1; ui.stage = ''; ui.coins = -1;
}
function start() {
  if (started) return;
  setLang(STR[save.lang] ? save.lang : detectLang());
  if (!renderer.ok) { ui.toast(t('nogl'), 0); return; }
  layout();
  started = true;
  game.toMenu();
  if (/[?&]play=crypt\b/.test(location.search)) window.__up.go(CRYPT.at[0], CRYPT.at[1]);   // the Crypt by itself, to look at
  if (/[?&]play=tokyo\b/.test(location.search)) { game.preview = TOKYO; window.__up.go(1, 0); }   // Tokyo by itself, to look at (a run in it)
  if (/[?&]play=blocks\b/.test(location.search)) { game.preview = BLOCKS; window.__up.go(2, 0); }   // the Tower Blocks by themselves
  if (/[?&]play=sky\b/.test(location.search)) { game.preview = SKY; window.__up.go(2, 0); }   // the Skyscraper by itself
  if (/[?&]play=junk\b/.test(location.search)) { game.preview = JUNK; window.__up.go(2, 0); }   // the Junkyard by itself
  loop.last = performance.now();
}

// Debug handle for automated checks (read-only state and a few helpers).
window.__up = {
  version: VERSION,
  get started() { return started; },   // booted (the Bridge waited for, the save loaded)
  tuning: { HERO, MOVE, JUMP, LEVEL, CAM, HEALTH, STOMP, COMBO, COIN, STICK, WORLD, ENEMY, WORLDS, BOSS },
  get game() { return game; },
  candy(kind) { game.take(kind); return { pow: game.pow, t: game.gunT }; },   // a candy's power at once, for checks
  get state() {
    const g = game, lv = g.lv;
    return { state: g.state, kind: lv.kind, world: g.world, stage: g.stage, seed: g.seed, cam: Math.round(lv.cam), hp: g.hp, maxHp: g.maxHp, coins: g.coins,
      combo: g.combo, kills: g.kills, air: g.air, climbed: +(g.climbed + g.levelM).toFixed(1), rects: lv.rects.length, enemies: lv.enemies.length,
      spawns: lv.spawns.length, coinsLeft: lv.coins.length, bubbles: lv.bubbles.length, portal: lv.portal && Math.round(lv.portal.y), ui: ui.open };
  },
  get hero() {
    const b = game.hero;
    return b && { x: Math.round(b.cx), y: Math.round(b.cy), R: +b.R.toFixed(1), minY: Math.round(b.minY), maxY: Math.round(b.maxY), mask: b.wallMask, stuck: b.stuck, vx: Math.round(b.rigVx), vy: Math.round(b.rigVy), contact: game.sinceContact === 0, invuln: +game.invuln.toFixed(2) };
  },
  get view() { return { w: view.w, h: view.h, left: view.left, canvasW: canvas.width, canvasH: canvas.height }; },
  play(seed) { nextSeed = seed == null ? null : seed; game.startRun(); return game.seed; },
  // jump straight to world w (0-based; 4 is the boss), level s
  bonus(w, seed) { this.go(w, 2, seed); game.startBonus(BONUS[w]); return this.state; },   // straight into world w's bonus level
  camp(i, seed) { game.playLevel(i, seed); ui.hideAll(); return this.state; },   // straight into campaign level i (0-based)
  go(w, s = 0, seed) { if (game.state === 'menu') game.startRun(); game.mode = 'run'; game.rc = null; game.world = w; game.stage = s; nextSeed = seed == null ? null : seed; game.state = 'play'; game.buildLevel(false); ui.hideAll(); return this.state; },
  god(on = true) { game.invuln = on ? 1e9 : 0; return game.invuln; },
  give(n) { game.coins += n; return game.coins; },
  // Press or let go of a control as a player would: 'left', 'right', 'down' or 'jump'.
  key(what, on = true) { input.set(what, !!on); return { dir: input.dir, down: input.down, jump: input.jump }; },
  // A slingshot pull (dx, dy) in CSS px from where the mouse went down, let go at once.
  pull(dx, dy) {
    aim.on = true; aim.sx = 0; aim.sy = 0; aim.x = dx; aim.y = dy;
    aimUpdate();
    const p = aim.p, vx = aim.vx, vy = aim.vy;
    aimCancel();
    if (p > 0) game.requestJump({ vx, vy });
    return { p: +p.toFixed(2), vx: Math.round(vx), vy: Math.round(vy) };
  },
  // Headless checks: freeze the real-time loop, advance by fixed frames even when the
  // page is hidden or paused, and grab the canvas as a JPEG.
  freeze(on = true) { loop.frozen = !!on; return loop.frozen; },
  tick(frames = 1, ms = 1000 / 60) {
    if (!started || !renderer.ok) return false;
    for (let i = 0; i < frames; i++) runFrame(performance.now(), ms / 1000);
    return true;
  },
  snapshot(width = 640, quality = 0.8) {
    if (!started || !renderer.ok) return null;
    runFrame(performance.now(), 0);
    const c = document.createElement('canvas'), k = width / canvas.width;
    c.width = width; c.height = Math.round(canvas.height * k);
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  },
};

requestAnimationFrame(frame);
boot();
