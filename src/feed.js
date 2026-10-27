// Feed Moti (owner, 2026-10-27: «делаем мини игру при клики на моти на главном экране»; his brief feed_moti_match3_technical_brief v1.0, kept in
// research/feed-moti): a small match-3 on the home screen, Moti fed what the player matches. Phase A of the brief: the board (5 x 5, four foods, eight
// moves), its rules, a tap on Moti into it and the way back, the home screen as it was. Only with ?feed while it is built (FEED_ON).
// The rules and the board are pure (FL, on a flat array of 25), loaded by node too for tools/feed-test.mjs; the view is the menu panel's (ui.menu,
// feed.mount), its foods SVG at the game's own pixel (PIX.size a dot), Moti the menu's own hero over it (game.menuFit).
const FEED_ON = typeof location !== 'undefined' && /[?&]feed\b/.test(location.search);
const FEED = {
  n: 5, moves: 8, pts: 10, cap: 4,   // the board's side; the moves a run; points a food cleared, times its cascade's depth (x1, x2, x3, at most x4)
  stars: [30, 50, 70],   // fullness for one, two, three stars (the brief's 6/12/18 can't miss: eight moves clear 24 at least). tools/feed-test.mjs: random
  // moves reach them 97% / 51% / 13% of the time, the biggest line each move 100% / 82% / 38%
  food: 32, cell: 36,   // a food's sprite and its cell, in game pixels (PIX.size CSS px each)
  swap: 110, back: 150, pop: 140, fall: 190, row: 26, hint: 4,   // ms: a swap, an invalid one's way back, a food eaten, a fall (and each row more), s idle before a hint
};
const FEED_SET = ['sakura', 'matcha', 'taiyaki', 'imo'];   // the brief's first four (#01, #02, #05, #19): four shapes and colours apart
// The foods and blockers (the owner's concept sheet, research/feed-moti/foods-sheet.webp, re-pixelated to 32 x 32 on each one's own grid by
// research/feed-moti/cut_foods.py, its own colours, at most seven): [its palette 'letter+hex,…', its rows '/'-joined, '.' clear]. Asked: З12.
const FOODS = {
  sakura: ['a2f3d0c,b4b5d1b,c84843f,dee7488,ef999ab,ffcc1ce', '................................/................................/................................/................................/................................/................................/................................/...............bbb............../............bbbbbbaaa.........../........bbbbbbbbccbbbb........../.......aacbbbbbcbbbbbba........./......eeeacbcccbbbbbbca........./......fffdcbcbcbbbbbbba........./.....ffffeabbbcbbcbbbaa........./....ffffffabbcbbbcabaaad......../...ffeffffeddbbbbcaaaaad......../..efffffffffeabbbcaabaaed......./..eefffffffffdaaaacaabdee......./..eeeffefffffedaaacaaadee......./..dddffeffffeeedaaaaaafed......./..deeeeffeeeefedaaabadede......./...edeeeeeeeeeeedaacadedd......./....ddeeeeeefeeeddaaaedd......../......ddeedeeededdaaddd........./.......ddddddddddddadd........../.........ddededddaaaa.........../................aabbb.........../..................aaab........../................................/................................/................................/................................'],
  matcha: ['a455b12,b778f30,c9ba770,db8d153,ec7cda8,febecdc', '................................/.............ffffe.fff........../...........affdfefddfeff......../.........fffefddfddffedeff....../.......fffeefdefddffdddddeef..../......ffdffdeffddfddddddfddeee../....ffffedfffffdfddddedddededee./...fffeffffffffffedfdddddffffce./...fffffffffffffffffefedffeceee./..ffffffeecaaaacefffffffedecccee/..fffffcaaabbabaaeefffffdddeceee/.fffffaabbbbbbbbbaaefffddfddeece/.fffeaabbbbbabbbbbbaefffdefecccc/fffeabbaabdddbbaabbbaafffceeecbe/fffabbadffdddddbbabbbafffceeeecc/ffeabadfffdedddddbabbaaffefeeeec/ffbaabeffdddddddddbabbaffeeeceee/feabadddddddddddeddbaaaffeceecec/feabaddddddddddddddbaaaffeeeeeec/feabaddbddddddddbdddaaafffeececc/efabbdddbdddddddddddbaafefeebccb/.faaabdddddddddddbdddabcefceeccb/.eeaaadddddddddddbbddabcefcecccb/..ecaaaabbbdddddddddbaacefccbcbc/..ceffebaaabbdddddbdbaacefcbcbbc/...bbceeeecbaaabdbbbaaaeefbcbbbc/.......bbbeeeecba.aaaaaefcbbbbc./..........bbbeeffebaaaaeecbbcc../..............bbeeeffeeebbbcb.../.................b.ceeecbb....../................................/................................'],
  yuzu: ['a4b2e09,b8d5112,cb27a23,dd99527,ef9d444,ffdf4c8', '................................/.............................f../............................edb./.....................eeee..fdb../....................eeeeedddb.../...................eefefeeeb..../...................effeeeeee..../...................efeeeeeee..../..................eefeeeeeedd.../..................efeeeeeeedd.../...............eeeceeeeeeeedd.../..............eeeeeceeeeeeedd.../.............eefeeeeceeeeeede.../............eeffeeeeeeeeeddd..../...........eeffeeeeeeeddddd...../...........deeeeeeeeeebddd....../........deecceeeeeeedd........../.......eeeeeeeeeeeeede........../.....eefffeeeeeeeeedd.........../....eeeffeeeeeeeddddd.........../...eeefeeeeeeeedcdde............/...eeefeeeeeeeed................/...eeeeeeeeeeedd................/...eeeeeeeeeeddd................/.....ebeeeeeedd................./.....dfddddddde................./...dfdb.dddee.................../..dfcb........................../.cfdb.........................../..bb............................/..bb............................/................................'],
  ichigo: ['a8e080e,b9d7674,ce8bab2,deb2c31,ef68680,ff9e5dd', '.................fff............/..............ffffffffff......../............ffffffffffffcf....../..........fffffcccfffffffcc...../.........fffffcccccfffffcccc..../.......fffffccccaaaccffffcccc.../......ffffcccccddddcccfffccccc../.....ffffcccccadeedacccfffccccc./....ffffccccaddeceedacccffcfcccc/...fffcccccaddcefeeddacccfcccccc/...fffccccadedecefdedacccffccccc/..fffcccccadeedcefecdaaccffccccc/..ffcccccadddceeefcdddacccffcccc/..ffccccaddedecfefceddaeccffcccc/.ffccccadddeeefcefcceddacccfcccc/.ffccccadddeecfeecfedddacccfcccc/.ffcccaadeddcffeeefcdedaeccffccc/bffcccaddeedcfceeefeedddaccffccc/cfcccaddddeeffeeeeffdeddacccfccc/ffcccaddeddcffeeceffceddacccfccc/ffcccaddccdcffccccfcddddacccfccc/ffcccadddcccffcccfffdeedacccfccc/ffcccaddddeffffcfffcceddacccfccc/.ffcccaddeecfffffffcddddacccfccc/.cfcccaddddccfffffceeddaacccfccc/.cfccccaadddccccfceeddaaacccfccc/..cfcccccaaaddeeceeddaaaccccfccc/...ccccccccccccceaaaaaaccccfcccc/....cccccccccffffccccccccccccccc/.................ccccfffcccc..../................................/................................'],
  taiyaki: ['a893a0e,baf5418,ccb6f26,de58a36,ef7a647,ffdc76a', '................................/................................/................................/................................/................................/...........d..........cd......../..........efe.c......dffb......./.........efdeff......ffeb......./........ffebdece....ffeeb......./.......dcdbbbadce...feddb......./.......edefffddabc.feaefb......./.....ffffeeefefeeaaebdeedc....../...effeeeeceebeedeeaeededc....../..efeeebdffccebecceccadedc....../..fecdeebeeeaffcfbcfadfedd....../..feffcedbeebeeaedbebddbeec...../.feeaabdeacefbdebdfbeabeeee...../.efecccefaceebeebdecdaadbbee..../.aafeeeefadeceebbbbbdaccffddb.../.febeeceeabcfccbeebeaaddebdcb.../.cceebeeafdfceabdbbdbbbbbbb...../..cddeeadecceaaeaeeaa.........../...cccaebdeeeaddcdcb............/....cbcdddaaabdddabc............/.....ccddddcbddcacec............/.......bbddcddbb.bc............./.........bbbbb................../................................/................................/................................/................................/................................'],
  onigiri: ['a050604,b373d2e,c93897d,dd4bba1,ee9d9c6,ff9f1e7', '................................/.................ffef.........../...............fffffeee........./.............ffffeeffeeee......./............ffffffefffeeee....../...........ffefffffffefede....../..........ffefffddffefffeeea..../.........fffffffddffffffedee..../........ffffedfffffffffffdde..../.......feffffefffffeffffffeee.../......fffffffffefffeefffffeee.../......fefffffffffffffffeeffdee../.....fffefeffeffeeffffedeffeee../....ffffffefeeffeeeffffffffeeee./...fffeffa.....aa..aadffefefdde./...ffeeffacbbb.bbbbbb.efffefedee/..fffffefabb.bbbb.b.baeeffedfeee/..feeffefab.bb..b..a.aeffffdfeed/.fffdffec.b.b.b..bbabaefeffeffed/.ffffffe.bbbbbbb.b.bbaefffffffed/ffefffee.b.bbb.bbbbb.beeffffefed/ffefffde.bb.b..bb.bbaceedffeffee/fffdffef.b....b.bb..adffeffddffe/eefeffef...b...bb.b.aefffffddffd/edefefeeab.a..bb..a.aeffffeeffee/eddfeffea..abbb.ab..aefffefffeed/.edeeeeea.bb....bb..aeeffdefeedc/.eddeedda.......b.a.aeeeeedeeddd/...ddddda.aabb.....aabedeeeedddd/.........aaaaaa.....aaddddddddda/.....................aaaaaaaaa../................................'],
  dorayaki: ['a4a161d,b783441,cac4916,dcb6828,ee58c3f,ffbcf7e', '................................/................................/................................/................................/................................/................................/............dddddd............../..........cddcccccccc.........../........ddddddddcccccc........../......ddddddddddddcccccc......../....ddddeeedddddddccccccd......./...ddeeeeeeeedddddcccccce......./..ddeeeeeeeeeddddddccccfd......./.ffeeeeeeeeeeddddddfeffe......../..ffffdeeedddddeefffeeaac......./...bfffffffffffffeeaaaaac......./..eebaaeeeeeeeea.aaabbaafe....../..ebbbaaaaabaaaaabbaabacfc....../.ffeaabbbbaaabbbabbaaaefcc....../.efffdababababaaaaaedfecc......./..efffeddccaaaaceeffeeccd......./..ddfffffeedeeeffffeccccd......./....dfffffffffffffeccccd......../....dddeeffffeecccccccd........./.....eeddeddccccccdddd........../.........dddddddd.............../................................/................................/................................/................................/................................/................................'],
  mitarashi: ['a852008,bb1440f,cd96714,de79950,ef5c487,ffdf1ec', '................................/.............................d../......................bb...edb../....................aaaab.edb.../...................daffaabab..../..................caffaaaaaa..../.................bbaaaaaaaab..../.................cbfaaaaadacb.../..............bbbaabaaaabaacb.../.............caaaacaaaabbabda.../............caaaaaababbccbcda.../...........cafffeaaaabccccddb.../...........baffaaaaaabbcdeeb..../..........caafbaaaaaaacdeedb..../..........cafaaaaaaaaabdedb...../.......bbbaaaaaaaadaadabb......./.....daabaaabaabcccbbd........../....cafffaaaabbcccccdd........../...caffffaaaaaacceeedb........../...cbafaaaaaaabbdeeeb.........../..ccbfbaaaaabacbdeeb............/..ddbbbbbbbaabdbbbb............./..decbbbbcccbceb................/...decccccccceda................/...cedccccddeec................./....eebdceeeed................../...de.abddddb.................../..dec...bbbb..................../..ec............................/.dbb............................/................................/................................'],
  senbei: ['a57200b,ba5430e,cd1691b,dee9030,ef7d596,ffab250', '..............ddddddddd........./...........fdffeffdfcdffdd....../.........ffeedddddcdccfcbbcd..../........fefffdcbbcccddbbaabdd.../......feeffdfccabbddfdbc.abcddd./.....feffdffdcbabcdefdcbabbcdfdc/....fefdfcefcbbbbdefdcbbbbdcdffd/....efffdfebacdccffdcbceeccdfffd/...ffffffbaabddf.fffbdeeebddffdf/..ffdcdfdcccdcf..bffbddbbcffdddf/..ffcbbccdddffef.bdccccddfffe.cf/..fbeaabcdddfffffddcbcdffdc...cd/.dfcaaabd.e.ffddfdbbbceffdcb.bdd/.dfcbabbd.a.bdfffbeabdffdcbbbccd/.ffccbccfd.bcdddc.a.bcddb.ccdcfd/deffccdfdffcdddcbc.acdc...bcdddd/defedcdefddfdaabbcddcfcb..cfcfba/fedffeedfdfdbe.acbdffdbcccdddbea/fedfdebdfdceb..bfdccdbcfcdffdba./dffdfdbddfbbabceecbbbdedddfffcba/ddefddcbccb..ceecbeabcddeffcfccb/.dfddce.bbdcccbcbaa.bbcfceebccdd/.dfdebaaacddfdbcbb.accffdecbcdfc/.dfdcbaabffdffcccbbcdcfddbbcdfdd/..ffcbbcddceadfddcddffdcbccddddf/..dfcccdfd.a.bccfddfdfdaabcdcdfd/...ddcffddb.bbdcdcdffdbeaabcdffd/...dffdddccbbdddebcddcba.abcdfdc/....dfdddccdfddeebbbbcdbabbdfdcc/....ccffcdcdfcdfffaabddcbcdfdccc/.....ccfffdffdcdcaaaccfdddfdcc../......ccdffeffddcbabcccffddcc...'],
  tamago: ['a434438,ba28349,cc7bebb,defe8df,ef8bf2e,ffce466', '................................/................................/................................/................................/................................/................................/................................/................................/.................feeee........../................fffeeee........./...............fffffffeee......./...........aaaa.ffeeeffffee...../..........aaaaaa.ffffffeeee...../........ee..aaaaa.fffeeeeeef..../.......ffffe.aaaaa.eeefffffe..../......fffffef.aaaaa.fffeeeee..../.....ffffffffe.aa.aa.eeeeeee..../...fffffffffffe.aa...eeeeeee..../..fffffffffffffea....eeeeee...../..ffdfffffffffee.....bbcccc...../..eeefffffffeeee.....cccdcc...../..eeffeefffeeeeea....cdddcc...../...eeeefefeeeeeb.....cddcd....../....eeeeefeeeecc.....cdcdc....../....ceeeefeeeccd.....dcddc....../....ddceefeeccdc.....cccc......./.....ddcccccddcc.....cc........./.....ddddcdddddc.....c........../......ddddddcdcc................/........cdddcc................../..........ccc.................../................................'],
  nikuman: ['a695d50,bd9b68b,cebcea7,df0d8b6,efaead2,ffdf7ec', '................................/................................/................................/................................/................................/................................/................................/...............eed............../..............efedc............./...........dddfffdcb............/.........fedecefeccbbcd........./.......ffddbcfebcecbebbccd....../.....fffdbbffecbbeebeecbcdd...../....eeedbdffedbebdfbbdedbbc...../....fedcfffedbbfbcfebbdedbcc..../...eedeffffdbbeebbeecbbdedbc..../..eeeffffecdbcffdbefecbbeedcc.../.eeeffffedcbeffecbefeedbcedcc.../.eeeffffdbdffffecbefeeddbeddcc../deeffffecfffffeebbefeeecbeddbb../deeefffefffffeeebefeeeeddddbbb../deeeeeffffffeeeecefeeeeddddbbb../ddeeeeeffffffeeeeeeeeeddddbcbb../dddeeeeeeffeeeeeeeeeedddddbbbb../.cddeeeeeeeeeeeeeeeeddddddbbb.../.bddddeeeeeedeeedddddddddbbbb.../..bddddeeeeedeeddddddddbbbbbc.../...bbbcdddddddddddddbbbbbbbc..../......cbbbdddbbbbbbbbbbbbb....../........bbbbbbbbbbbbbb........../............bbbbbbb............./................................'],
  melonpan: ['a573813,ba57441,cdf7820,df6a43b,efbce65,ffde694', '................................/................................/................................/................................/................................/..............eeee............../............dffffeef............/...........ecdfffedeed........../..........ffecdfedcccce........./.........ffffeddcceecefe......../.........fffedcccfffecefe......./........ffffdccdfffffdcee......./.......cdffdccfcdffffeccee....../.......dcedceffedefffddcdc....../......ffedcdffffcdeeddccccd...../.....fffeddffffeecddcccccfe...../....effedccdfffedcccfffecce...../....effdcfcdeeedcccffffedcdd..../....ffecfffcdedccfcefffeecdd..../....efdffffdcdcffffcdfeeecdd..../...edddffffdcdeffffcceeedccc..../...edddefeccfdcfffedccdccccd..../...eeffcedcffecdfedcccddfed...../...dfffcccfffeccedccccffedc...../....fefeccffeeecdccdecdeedc...../....eeeecdeefeeccdfeeccedcc...../....ddeecedeeeccdfeeddcdcc....../......dddedddcddceeddcccc......./.......dddddcdedcdddcccc......../..........ccddddcccc............/............cccccc............../................................'],
  kakigori: ['a1c9cf4,b3977b7,c68b4ed,db6ceec,eee62ad,ff1d7ee', '................................/................................/............eee................./..........ffeeeee.............../.........feeeeeee.............../........feeeeeeeeee............./......feeeeeeeeeeeeef.........../.....ffeeeeeeeeeeeeecd........../.....feeeeeeeeeeeeecac........../....feeeeeeeeeeeeeccaac........./...feeeefeeeeeeeeccccaa........./..fffeeeeeeeeeeeddacaaaa......../..fffeefeeeeefeedccaaaaad......./..fffefffeeeeeeedccaaaacc......./.fffeffffeeefffdddaaaaaacd....../.fffeffffeffffddfcacaccaccf...../fffffffffffffffdcccccccccbf...../dfffffffffffdddddcccccaabfc...../.fffffffffddddddccacaaadbb....../.cccfffffcccccaaaffffddbbc....../..cfcdddfffffffffddddbcbc......./..cfffeffffdddddddeedddbc......./..dcfeeeefffdddddeeeeedb......../...cffeeffffbbdddeeeedd........./...ccfeeeffbbbbddeeeebc........./.....cccddddbbddddcccc........../......bbcccbccccbbbb............/.......ddfdcccbcdbd............./.........dcdddbcc.............../................................/................................/................................'],
  edamame: ['a234605,b446b15,c628e20,d87b92d,eb2e14b,febfbbd', '................................/................................/................................/................................/................................/................................/............................e.../...........................ec.../..........................ead.../.......................decabeb../......................edcaabeba./.....................eaaaabbebb./....................e.eeedabebb./...................ebeffeedaebb./..................dbaefeeedacb../...............eebaaefeeeddaeb../..............ecaaaadeeeedaebb../............ecaaeeedddeedcacb.../...........ccaaefeeeddddcaebb.../.......decbaaaeeeeeedabcedcb..../....ecaaeeeedadeeeeddc.aecb...../..ecaaeefeeeeccdedddca.ecb....../..eaadeffeeeed.ddddcc.ecbb....../.ebbadeeeeeeddcacbccaebbb......./.cebabddeeeeddc..aeecbbb......../..ceaaaddddddbbaedbbbbc........./...ceeeeaccc.eeecbbbbb........../....bbcdeeeeeccbbaa............./.....bbbcccccbbbb.............../.........bbbbb................../................................/................................'],
  takoyaki: ['a632b0d,b9a5a23,cbe1d2d,dd9873d,ee9b073,ffae4c1', '................................/................................/................................/................................/................................/................................/................................/................................/................................/....................e.........../..............e...bedeaaa......./............bbdd..fbbffbff....../...........edbebbadfffaf.af...../.....e.e..beefbabaa.affeaaab..../......edaa.dffffaaff.ba.aaad..../.....fabbabafaefff.e.aaabbbe..../....ffafaaadaafaffaabaabdddd.f../...ffaffafaaf.abaaabd.bbddddf.../...faeafaffafbaaadbae.ddddbac.../...dabaff.fffa.aaeddd.bddd.fc.../...ebabffaafaa.addddd.bbbffc..../.fdedeeffaabbd.bdddd..fffccc..../..fbdeedaaaded.abdb.ffccccc...../..ccfdedbadddd.a.fffccccccc...../...ccfbbddddbaa.fccccccccc....../...cccffbbbbafffccccccccc......./...cccccfffffccccccccca........./....cccccccccccccccc............/......ccccccccccc.............../........cccccc................../.........cca..................../................................'],
  ringo: ['a600607,ba53d37,caf0308,de6525b,eeb1520,ffcdecc', '................................/................ff............../................fd............../................fb............../................fd............../................fd............../................fb............../................fb............../.............addfded............/...........ddeccfbceee........../........ddeeedaaabaaeccc......../........deeffeeddddecccce......./.......deefffeeeeeccceccc......./.......deffffeeeeeccecccce....../......deefffeeeeeeeeeecccc....../......deeeeeeeeeeeececcccce...../.....ddeffeeeeeeeeeeccccdce...../.....deeffeeeeeeeeccccccdcd...../.....deefeeeeeeeeececcccdce...../.....deeeeeeeeeeeeeccccddcd...../.....deedeeeeeeeeeccccccccd...../......deeeeeeeeeeccccccccc....../......beeeeeecceccccccbccd....../.......eceeeeeccccccccccc......./........ecccccccccccccce......../.........ecccccccccccce........./.........ecacaaceeecaac........./.........eeeaccaaaaaacd........./...........cefeeccccc.........../.............cccccc............./................................/................................'],
  anpan: ['a481619,b733435,cab4c1b,dcd6a2a,eec994a,ff5ce9b', '................................/................................/................................/................................/................................/................................/................................/..............cfaacc............/..........ccfbabeabcbccc......../........dddbaafbafabbaaccc....../.....dddddbccfbafbafbcabccccd.../....dddeddddabfaafbaf.bcccccc.../....dddddddacfbddacacccccccccd../...edddfddddedaddaccddcccccccd../..deddfffdddddddddddddcdcccccdd./..ededffcfddddddddddeddddddcddd./.eededdffddddddeeefefeeeeddddcd./.eedeeeddddddefffffffffffeddddd./eeeededddddeffffffaafffffffedddd/eeeededdedeffffaaaaaaabfffffdddd/eeeeeeeeedffffaaaaaaaaaafffffddd/eeeeeeeeefffaaababbbbbbbaafffedd/efeeeeeefffaabaabbbbaabaaaffffdd/.ffeeeeefffabebaabaaaaaaaadfffd./.effffeefffaaabaaaabbabbaaafffd./...fffffffebbbabbbabaaaaaafffe../...efffffffabbbaaadaafceffffe.../....defffffcaaafefffffffffdd..../.....deeeffffefffffdddddd......./.......defffffedddc............./........eddddd................../................................'],
  wagashi: ['a6f3180,b9443b1,cb866d2,dce804f,ee7a9ec,ff8c66a', '................e.............../..............eeee............../.............eeecee............./............eeeeceece.........../...........eeeeebeeecc........../......eeecceeeecbeeeccc........./.....eeeeebceeebbeeccbeee......./....eeeeeeebceebbeccceeeee....../..eeeeeeeeeebceacccceeeeeee...../.eeeceeeeeeeebcbbcbeeeeeeeeee.../eeeeecbbcceeeebffbeeeeeccccee.../ceeeeeeccbbbeeffdaeecbbbceccce../ceeeeececcbbbeffdfbbbbcceeeeec../cceeeecccbbbbddffdabbceeeeeeec../ccceeecbbbceefffdfabbbcceeeecc../.cccecceeeeeefdffdeeeebbceeecc../.cccbeeeeeeebbaffaeeeeeecccccb../.bbbeeeeeeebbcbbbbbeeeeeebccbb../.bbbeeeeeebceccbcccbeeeeeebbb.../..aeeeeeebceeecbecccbeeeeecab.../..ceeeeecceeeecceeeecceeeeeaa.../..ceeeeeceeeeeceeeeeeceeeecb..../..ceeeeceeeeeeceeeeeeeceeecc..../..cceeceeeeeeecceeeeeeeeeccc..../..bcceeeeeccccbbceeeeeeeeccb..../...cceccccbccbbbcccceeeeccc...../...bceccccbccbbbcccccccccbb...../....bcccccbbbbbabcccccccbb....../.....ccbbbbbbb..bbbbcbbcb......./......bbbbb.......bbbbbbb......./....................bbbb......../................................'],
  imo: ['a6c152f,ba53558,cd05f82,de57c0f,efac420,ffce768', '................................/................................/................................/................................/..............bbd.............../.........bbcbbadfd............../.......bbbbbccdfff.ffff........./.....cbbcbcccafffeffff........../.....cbcccccadeeeffffe.adb....../....cbccbccaddeeffffeedfba....../...ccbccbcadddeeffffeeffab....../...ccbccbcddeeeefffeeefeac....../..ccbcbbbadeeeffffeeeffedc....../.bcbbbbbadeeeeffffefffeeea....../.ccbbbbbccaddeeeffeffffeeaa...../bcbbcbbbbbbbadefeeffeeeedba...../bbbbbbbbbbbadffeeffeefedbaa...../bbbbbbbbbbadeeeeffeeffedbaaa..../.bbbbaabbbdfeefebadeffeabaaa..../.babbabbbbedeeebbbbeefeaaaaa..../..baaaabbadabbbbaabdeeedaaaa..../...aaaaabaaabbbbbbbbdeeabaa...../...aaaaaaaabbbbbbbbbadeabaa...../.....aaaaaaaabbbbbbaaadaaaa...../......aaaaaaaaaaaaaaaaadaaa...../........aaaaaaaaaaaaaaaaaaa...../...........aa..aaaaaaaaaaa....../...................aaaaa......../................................/................................/................................/................................'],
  takenoko: ['a476113,b778e28,c9bba42,dc6a458,eddd078,ffae9b6', '................................/.......................e......../......................eba......./.....................bebc......./..................e.ccbcb......./..................cacbbbab....../.................cbacbbacb....../................ccbbbbbbaa....../.............b.ccecbabbbaa....../............cabceccbcabaaa....../...........ccbbcccbbbaaaaa....../...........cceabbcbbb.aaa......./..........ccccebbbbbaaa.aba...../.........ccecceabbbaaa.cbaa...../........cccecccabbbbacbbaaa...../........cceecccaabbacbbaaaa...../.......cccecccccabaebbaaaaa...../......eeefeeecccaacbbbbaaa....../.....eeefeeeececdbcbbbaaaa....../.....eeffeeeeeeeeaccbbaaaa....../....efffffffeeeeedbbdabaab....../...efffffffffefeeebddbdbb......./...ffddddeffffffeebddddbd......./...fdddeeeeefffffeeddddb......../....eddeeeeeeeeffeedddbd......../......dddeeeeeeeffedddb........./.......eddddeeeeefedddd........./.........ededeeeedfbdd........../............eddededbd.........../.............eeddddd............/................eee............./................................'],
  kaki: ['a555d10,b85af3d,ce54607,df88f44,ef9ddbb,ffa7108', '................................/................................/................................/................................/................................/................................/................................/................ff............../..........fcacaafffcc.........../........ffabbbbaacbbbbbac......./......ffdaaabaaaaaaabbbbac....../.....fddbbaaaa.aaaabbbbaccf...../....fddfbbbbaaaaaabaa.cccfcc..../....feefbbbbbabbbabbaccffffc..../...ffeedcaaaacabbbbbacfdfffc..../..fffdddffcccfcabbbaccffffccc.../..fffddeedfffffccaaacffffffcc.../.fffffdeeeddfffffcccfffffcfcc.../.fffffddededddffffffffffffccc.../.fffffdddddddffffffffffffcccd.../.fffffddfffffffffffffffffcccd.../.fffffdfffffffffffffffffccccd.../.ffffffffffffffffffffffcccccc.../..fffffffffffffffffffccccccd..../..fffffffffffffffffcfccccccd..../...ccfffffffffffffcccccccccd..../....ccffffffffffccccccccccd...../.....ccccfccfccccccccccccc....../......ccccccccccccccccc........./.........cccccccccccc.........../................................/................................'],
  kuri: ['a3f1004,b66200a,c8b3a1c,dab5e3a,eda915b,ff9cb8b', '...................c............/..................fccb........../..............ccdeecbcbb......../..........cccecfefbccccbbb....../........cccddcfffdccdbcbbbbb..../.......cdffbffefcdcddccdbbbbbd../......ddffbdfefeedceeccdcbbbbb../.....ddfefdfeffeedceedccdbcbbbd./....cdedecfeefeeeceeedbcdbcbbbb./...ccdcddcfeffdedcddddccdcbbbbbd/..ccdccccffefedddcdddccbccbbbbbd/..cccccccfeefddcccccccccbcbbcbbb/.ebbccccefefdcccccccccccbcbbbbbb/dffebcccfeffccccbbccccccbcbbbbbb/dcdffdabedfdccccbcccccccbcbbbbbb/ecbddffaddfbccccbccccccbbbbbbbbb/decdeddfbacbcccbbccccccbbbbbbbbc/.edcbcceffeaabbcccccccbbbbbbbbbc/.ececbfcddeffdaabbcbccbbbbbbbbcc/.dcedceebccddeffaaabcbbbbbbbcbcc/..cdecddbddccccdeefaaabbbbbbcbdc/..dcddcdcedbddbbccdeeaaabbbbcccd/...cbdbddecbeedbbbcddeebaacccccd/...dcccddccddccdcddbbcddeaabccda/....cccdbbcddccbdedcbbccceb..bb./.....dbbcdccbcbcddcbbccbbcdecbd./......ccbdbbbbcddbbbdcabcbbcde../.......cccbbcbccbbbcbccbcccdd.../.........dbcbbbcbcbbcbbbcd....../...........ccccbcbbccbbc......../....................c.........../................................'],
  momo: ['a4b7c23,b77ac3f,ca24747,df87d7e,efba4a4,ffce0dd', '................................/................................/................................/................................/................................/................................/................................/...................bbbb........./.................babbbbbbb....../............deedaaaaaaabbabb..../...........eeddaabbbbbbabbbb..../.........deeedaaaabbbbbbaabab.../.......edeeeeeeeedaabbbbbaaab.../.....eeeeeeeeeedeedd.a.bbbbaab../....eeeffffeeeeddeeeeedd.abaaa../...eeeffffeeeeedddeeeedddd.aba../..deeeeffeeeeeedddeeeeeeddddaaa./.eeeeeeeeeeeeededddeeeeedddddaa./.deeeeeeeeeeeeeddddeeeeeddddd.aa/ddeeeeeeeeeeeeeddddeeeeeeddddd../ddeeeeeeeeeeeeeddddeeeeeeddddd../edeeeeeeeeeeeedddddeeeeedddddd../ddeeeeeeeeeeeeddddddeeeedddddd../dddeeeeeeeeeedddddddeeeedddddd../.ddedeedeeeeedddddddeeeddddddd../.dddeeeeeeddddddddddeeddddddd.../..ddddddddddddddddcddddddddde.../...dddddddddddddddcdddddddde..../.....edddddddddddddddddddde...../........dddddddddcddddde......../..........eddee....ddd........../................................'],
  usagi: ['a783715,bc66e20,ce9953a,df5b65c,efce09c,ffccb76', '................................/................................/................................/................................/................................/.................ddc............/................eefdc.........../...............edfdfc.........../.............efdffbfc.........../............effffbbfc.........../..........eeffffbbfcb...c......./.........efffdffbcffeeefec....../.......eeffffffbeffffffffd....../......effffdfffffffcbbbbfd....../.....efffffffffffbabbcbbfc....../....eeffffffffffbbbcccbefcb...../...ffffaaaffffffbcccceefcb....../...fffffaaffffffcbbefddcb......./..decffffffffffffeefddba......../..dffdffffffffffffffffffc......./...cfffffffffffffffffffffcc...../...cccffffffffffffffffffffdc..../.....bcccffdfffffffffffdfffc..../......aeffffffffffffffffdffdc.../......ffffffffcffffdffffffddc.../....cfffdffffccffffdfdffcfddc.../....cffdfffccbffffdfffbbffdcb.../....ccccccbbbccffffffdbffcccb.../.....bbbbb....bcccffcccccccb..../................bbbcccbbbb....../................................/................................'],
  rock: ['a222533,b3a3d4e,c575967,d7a7b86,e95959f,fafb0b9', '................................/................................/..............fe................/............fffcc.............../............fddbcc............../...........fdcddccccc.........../........fdddddddaaabb.........../.......fdddcedddaabbb.........../......fdddcdcdddbabbb.........../......dddddddddababbbc........../......dddcfddddabaabbb........../.....dfdcdddddddbbabbbd........./.....dcfdddddddfbbbaaddd......../.....dccddddddfbbbaadddd......../.....dccfddddfbbbaadddda......../.....cccceddbbbbbafdddea......../....dbcbccffbbbcbabeddca......../...edccbccfbbbbcbabbedaab......./..fdddbbcccbbbbbcbbccaaab......./..cbddacccbccbbcccabcaabb......./..cccaacccbcbbcccccaaabbbb....../..ccccacccbbddccccccaabbab....../...cccaccbbbabdcccccaabbbb....../....bbaabaacbabdcccaaaabb......./........bacccabbcaaabaaab......./..........ccbabbbaabbbaa......../...........bbabbaabbb.........../..............bbaa............../................................/................................/................................/................................'],
  frozen: ['a4379b4,b4495e2,c69bdf4,d9cd9f8,ebeafb4,fdcf3fb', '................................/................................/................................/...........bbb................../.........cfccccdffddbb........../.......fffccddccccccccccdff...../.....ffccccddddddddcffdcccccf.../....ffffffdddddcccccccccdfaadb../...ffcbbccdffffffdccdddfaaaadb../..cfdccbbbbbbbbccffffffaaaaadb../..bfcffcccbbbbbbbeeeffeaaadada../..bfcfcccbcbbbbbbedeefcaaaaafa../..bfcfccbbbbbeeeeeeaafcaaaaafa../..cfbccbbbbbeeeeeeeaafcaaaaadb../..cfbccbbbbeeeeeeeeaafbaaabadb../..cfbcbbbeeeeeeeeeeeafbaaabadb../..dfbbbeeffeeeeeeeeeafaaababdb../..dfbbbeffeeeeeeeeeaafaaabbbdb../..cfbbeefeeeeeeeeeeaafaabbcbdb../..cfbbeeeeeeeeeeeeaabfabbbbbdb../..cfbbeeeeeeeeeeaaabcfabbbbbdb../..cfcbbeeeeeeeeeaaccdfabbbcbdb../..cfcbbeaeeeeeebbcfdffbccbbbdb../..cfcceaaaeeeabbcfdfffbccddcfb../..cffeaabbbbbccdfcfddfbbccdf..../...fffcccccccddcdfccbfbbbc....../....cdfffffccccffcbccfbcd......./........bbbfffffcccbcfcda......./..............bbbffffff........./...................bbb........../................................/................................'],
  fishbone: ['a40362e,b746559,c9f8c7a,dc0ac98,ee3d0bb,ff5e7d4', '................................/................................/................................/................................/................................/................................/................................/................................/......eeeeeee.................../....efffeeeed.................../...efcfeeffcb.................../..ffd.dffefb.....f............../.fff...ffecb....fd............../.bfe...fefc....fec....f........./deee...fefa...fdc...ec........../.deeefeeeedfffec...fc.........../.dddeeeefbcceeffd.ec...f......../..deeeeef...ddceeffd..f........./...ddeefb..ffc.cceefebf.......ff/...deeefb..fd...cecdffe.....ffec/....deeb..fdc..afd..cefeb.feddcc/....dddb..fd...ffc..fcddffeeddc./.....db...f....fd..ed...deeedc../..........d...eed..fd...eeeeed../..........d...fdd..f....eeecdc../..............bd...f....efedc.../...............d.........feec.../.........................dfdc.../..........................ed..../...........................d..../................................/................................'],
  twig: ['a1a0e04,b5b3c1c,c6c9032,d88542f,eb47c4c,fd7a16b', '................................/................................/................................/................................/................................/........................f......./.................f.....febd...../.................f....efeebde.../......f..........ef..efeedfff.../......dc.....f...ee.ffeedbbb..../.......fcc..ff...edefeedbb....../.......fbcc.fd..deeeeedbb......./........cbcbdd..edeeddbb......../........ccbfea..eddddbb........./.........cbfd..feeddbd........../..........eedafeeddbee........../..........feefedddbddeff......../.......f.eeeeeedbbbbddddf......./.......ffefeeebbd..ab.abde....../.......eeffdebbd...bbb........../......fffeeeddd....bccc........./.....fefddedbbb.....cccc......../....fffdeddbdeef......cc......../...fffedddbbbbdef......c......../..eaafdedbbb.bbde.............../..ebbafddbd....dde............../..edbafebb......bd............../...edbbeb........bd............./....dded......................../.....ee........................./................................/................................'],
  oni: ['a4d276f,b704428,c8649b0,dbf8147,ec17fe3,ff4c785', '................................/................................/................................/......d..................f....../......d..................f....../.....df......acaa.......df....../.....dfdd.aaccccccaaaa.dfd....../.....dffdd.aceecccaaa.dffd....../......ddfda.ceccccc.a.ffdd....../......bdd.accccccccaa..db......./...........caccccacca......c..../...eca.aaccccacccacccccaa.cca.../...ccc.aceecccaccccceccaaacaa.../...a.c.a..cecc.a.eeecca.aa.aa.../...ca..a....a..a.a..b...a..c..../...ca..e...dd.aca.ffd..aa.ac..../....c.ceea...acea.a...aeccaa..../....aaaceeccaaceaa.ceeeecaa...../....caaaa.cacececc.acccaaaa...../.....c.a...aa.ac..aaa...aa....../.......a...aca.a.aa.d...a......./.......c...d.caaa..dd..aa......./.......ca..d.......f...aa......./........c...f.....f....c......../........ac..deecccd...c........./.........aceea...accaaa........./..........ca.aacaaaaaa........../..........caaceacaaaaa........../..........acccaaccaaa.........../..........acca...acaa.........../...........aa.....aa............/................................'],
  ink: ['a1f1a32,b342e53,c4f4676,d7864a2,eb092d5,ff7edfb', '................................/................................/................................/...ccb...........ccccc........../..cfb.b.........dcbbbbc...cdb.../.cccb.b........ccb...bb...cbb.../.cbb.b.........cb......a......../..cbb.....dccbcbbbc....c......../...bb...cdcbb..bbbb............./........ccbbaa....bb............/.......ccbb.b...b...bbc......b../...c...cbba.b....b...bbbc...bb../..db...cbb............bbcc...c../..bb...cbb..........a..bbc....../......ccb............bb.bbc...../.....ccbb.bb.............bc...../...cbbbb................b.bb..../.dcbbba.a..........dfc....bbbc../ccbbb.........eb...fff...bb.bc../cb.bb..b......ff...fff....ba.bc./cbb.b.........fe....d.....bb.bc./.cbb.b........d..........bb..bc./..ccbb....................babc../.....cccbb...............bbcc.../........cbb............bbbc...../.dc......bbba...........bc....../cc.b.....cbbb.......b...c......./.bb.....cbbbccbbb......bc...c.../......dbbb....ccbb....bbc..ca.../.....cb.a.......cbbbbbbc...cc.../......bb..........ccbcc........./................................'],
};
const FL = {   // the rules, pure: a board is an array of 25 food ids, row by row from the top; null an empty cell (in a resolution only)
  adj(i, j) { const n = FEED.n; return Math.abs((i % n) - (j % n)) + Math.abs(((i / n) | 0) - ((j / n) | 0)) === 1; },
  runs(b) {   // every line of three or more of one food, across and down: arrays of cells
    const n = FEED.n, out = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n;) { const k = b[y * n + x]; let e = x + 1; while (e < n && k != null && b[y * n + e] === k) e++; if (k != null && e - x >= 3) out.push(Array.from({ length: e - x }, (_, q) => y * n + x + q)); x = e; }
    for (let x = 0; x < n; x++) for (let y = 0; y < n;) { const k = b[y * n + x]; let e = y + 1; while (e < n && k != null && b[e * n + x] === k) e++; if (k != null && e - y >= 3) out.push(Array.from({ length: e - y }, (_, q) => (y + q) * n + x)); y = e; }
    return out;
  },
  swapped(b, i, j) { const c = b.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; },
  ok(b, i, j) { return this.adj(i, j) && b[i] != null && b[j] != null && b[i] !== b[j] && this.runs(this.swapped(b, i, j)).length > 0; },   // a swap that makes a line
  legal(b) { const n = FEED.n, out = []; for (let i = 0; i < n * n; i++) { if (i % n < n - 1 && this.ok(b, i, i + 1)) out.push([i, i + 1]); if (i + n < n * n && this.ok(b, i, i + n)) out.push([i, i + n]); } return out; },
  fresh(rng, kinds) {   // a new board: no line on it, two moves at least
    const n = FEED.n;
    for (;;) {
      const b = [];
      for (let i = 0; i < n * n; i++) {
        const x = i % n, y = (i / n) | 0, no = [];
        if (x >= 2 && b[i - 1] === b[i - 2]) no.push(b[i - 1]);
        if (y >= 2 && b[i - n] === b[i - 2 * n]) no.push(b[i - n]);
        const can = kinds.filter((k) => !no.includes(k)); b.push(can[(rng() * can.length) | 0]);
      }
      if (this.legal(b).length >= 2) return b;
    }
  },
  fall(b, rng, kinds) {   // the foods down their columns over the gaps, new ones in from the top: the board, each one moved [from, to], each one come [to, its start row]
    const n = FEED.n, c = b.slice(), moved = [], come = [];
    for (let x = 0; x < n; x++) {
      let w = n - 1;
      for (let y = n - 1; y >= 0; y--) { const i = y * n + x; if (c[i] != null) { if (y !== w) { c[w * n + x] = c[i]; c[i] = null; moved.push([i, w * n + x]); } w--; } }
      for (let y = w; y >= 0; y--) { c[y * n + x] = kinds[(rng() * kinds.length) | 0]; come.push([y * n + x, y - w - 1]); }
    }
    return { b: c, moved, come };
  },
  shuffle(b, rng, kinds) {   // a board with no move left, its foods mixed till it has no line and two moves (a fresh one if that won't come)
    const ks = b.slice();
    for (let t = 0; t < 400; t++) {
      for (let i = ks.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [ks[i], ks[j]] = [ks[j], ks[i]]; }
      if (!this.runs(ks).length && this.legal(ks).length >= 2) return ks.slice();
    }
    return this.fresh(rng, kinds);
  },
  resolve(b, rng, kinds) {   // a swap made: its lines and every cascade after, in phases (what went, what fell, what came), then a shuffle if no move is left
    const phases = []; let c = b;
    for (let cascade = 1; cascade < 60; cascade++) {
      const rs = this.runs(c); if (!rs.length) break;
      const gone = [...new Set(rs.flat())], d = c.slice(); for (const i of gone) d[i] = null;
      const f = this.fall(d, rng, kinds);
      phases.push({ cascade, runs: rs, gone, foods: gone.map((i) => c[i]), moved: f.moved, come: f.come, b: f.b });
      c = f.b;
    }
    const stuck = !this.legal(c).length;
    if (stuck) c = this.shuffle(c, rng, kinds);
    return { phases, b: c, shuffled: stuck };
  },
  score(ph) { return ph.gone.length * FEED.pts * Math.min(ph.cascade, FEED.cap); },
  stars(full) { return FEED.stars.filter((s) => full >= s).length; },
};
if (typeof module !== 'undefined') module.exports = { FL, FEED, FEED_SET, FOODS };
else {
  const foodSvgs = {};
  const foodSvg = (id) => {   // a food as an SVG of its rows, a rect per run of one colour, the colours its own
    if (foodSvgs[id]) return foodSvgs[id];
    const [ps, rs] = FOODS[id], rows = rs.split('/'), pal = {};
    for (const s of ps.split(',')) pal[s[0]] = '#' + s.slice(1);
    let paths = '';
    for (const c in pal) {
      let d = '';
      rows.forEach((r, y) => { for (let x = 0; x < r.length;) { if (r[x] !== c) { x++; continue; } let e = x; while (e < r.length && r[e] === c) e++; d += 'M' + x + ' ' + y + 'h' + (e - x) + 'v1h' + (x - e) + 'z'; x = e; } });
      if (d) paths += '<path fill="' + pal[c] + '" d="' + d + '"/>';
    }
    return (foodSvgs[id] = '<svg viewBox="0 0 ' + rows[0].length + ' ' + rows.length + '" shape-rendering="crispEdges" aria-hidden="true">' + paths + '</svg>');
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const anim = (e, frames, ms, ease = 'ease-out') => (e && e.animate ? e.animate(frames, { duration: still ? Math.min(ms, 90) : ms, easing: ease }).finished.catch(() => {}) : Promise.resolve());
  var feed = {   // (var: a global, as game.js asks for it by name)
    active: false, st: null, busy: false, sel: -1, cur: -1, els: [], box: null, hud: {}, keys: false, idle: 0, hinting: false,
    newRun() {
      const seed = (Math.random() * 4294967296) >>> 0;
      this.rng = mulberry32(seed);
      this.st = { b: FL.fresh(this.rng, FEED_SET), moves: FEED.moves, score: 0, full: 0, swaps: 0, cascades: 0, done: false, t0: performance.now(), first: 0, seed };
    },
    open() {   // a tap on Moti: the board under him, a run under way taken up again
      if (this.active || game.state !== 'menu') return;
      if (!this.st || this.st.done) this.newRun();
      this.active = true; this.sel = -1; this.opened = performance.now(); this.idle = performance.now();
      const b = game.hero; if (b) { b.kickSquash(0, 1, 0.7); b.face.wide = 1; }
      sound.play('bubble', 0.7, 1.2); haptics.buzz(10);
      ui.menu();
      track('feed_open', { source: 'home', date: dayKey() });
    },
    close(toGame) {   // back home as it was; a run under way kept for the next tap (this visit only); in the middle of a move, once it is resolved
      if (!this.active) return;
      if (this.busy) { this.closeAfter = { toGame }; return; }
      const st = this.st;
      this.active = false; this.busy = false; this.sel = -1; this.els = []; this.box = null;
      track('feed_close', { moves_left: st ? st.moves : 0, duration_ms: Math.round(performance.now() - this.opened), exit_to_main_game: !!toGame });
      if (game.state === 'menu') ui.menu();
    },
    mount(p, logo) {   // its view in the menu panel (ui.menu asks, while it is open): the count, the meter and the cross over the board, Moti over them
      if (this.busy) this.dirty = true;   // (made again in the middle of a move: once more when it is over, from the board as it ends)
      const st = this.st, dot = PIX.size, cell = FEED.cell * dot, side = FEED.n * cell;
      const wrap = el('div', 'fm'); wrap.style.setProperty('--cell', cell + 'px'); wrap.style.setProperty('--side', side + 'px'); wrap.style.setProperty('--dot', dot + 'px');
      const hud = el('div', 'fm-hud'), mv = el('div', 'fm-moves'), meter = el('div', 'fm-meter'), bar = el('i'), ticks = el('div', 'fm-ticks');
      mv.append(px(String(st.moves)), el('small', 'fm-l', t('feedMoves')));
      for (const s of FEED.stars) { const k = el('b'); k.style.left = (100 * s / FEED.stars[2]) + '%'; ticks.append(k); }
      meter.append(bar, ticks); const meterTxt = el('div', 'fm-mt'); meterTxt.append(px(st.full + '/' + FEED.stars[2]));
      const x = button('', 'setBtn fm-x', () => this.close()), xi = el('img'); xi.src = 'assets/ui/close.svg'; xi.alt = ''; xi.draggable = false; x.append(xi); x.setAttribute('aria-label', t('goBack'));
      const mid = el('div', 'fm-mid'); mid.append(meter, meterTxt);
      hud.append(mv, mid, x);
      const box = el('div', 'fm-board'); box.setAttribute('role', 'grid'); box.setAttribute('aria-label', t('feedMoves'));
      wrap.append(hud, box); p.append(wrap);
      this.box = box; this.hud = { mv, bar, meterTxt }; this.els = [];
      st.b.forEach((k, i) => this.els.push(this.tile(k, i)));
      this.meter();
      this.wire(box);
      if (st.done && st.told) this.result();
      const y0 = p.getBoundingClientRect().top;
      game.menuFit(hud.getBoundingClientRect().top - y0, logo.getBoundingClientRect().bottom - y0);   // Moti over the board, smaller if he must be
    },
    tile(k, i) {   // a food's element at cell i
      const e = el('div', 'fm-t'); e.innerHTML = foodSvg(k); this.place(e, i); this.box.append(e); return e;
    },
    place(e, i) { const c = FEED.cell * PIX.size, n = FEED.n; e.style.left = (i % n) * c + 'px'; e.style.top = ((i / n) | 0) * c + 'px'; },
    meter() {
      const st = this.st, h = this.hud; if (!h.bar) return;
      h.bar.style.width = Math.min(100, (100 * st.full) / FEED.stars[2]) + '%';
      h.meterTxt.replaceChildren(px(st.full + '/' + FEED.stars[2]));
      h.mv.firstChild.replaceWith(px(String(st.moves)));
    },
    cellAt(e) { const r = this.box.getBoundingClientRect(), c = r.width / FEED.n, x = Math.floor((e.clientX - r.left) / c), y = Math.floor((e.clientY - r.top) / c); return x >= 0 && y >= 0 && x < FEED.n && y < FEED.n ? y * FEED.n + x : -1; },
    wire(box) {   // a drag from one food toward its neighbour swaps them; so does a tap on one and then on its neighbour
      let down = null;
      box.addEventListener('pointerdown', (e) => {
        this.idle = performance.now(); this.keys = false; this.mark();
        if (this.busy || this.st.done) return;
        const i = this.cellAt(e); if (i < 0) return;
        try { box.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        down = { id: e.pointerId, i, x: e.clientX, y: e.clientY, moved: false };
      });
      box.addEventListener('pointermove', (e) => {
        if (!down || e.pointerId !== down.id || down.moved) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y, c = this.box.getBoundingClientRect().width / FEED.n;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.3 * c) return;
        down.moved = true; const i = down.i, n = FEED.n, x = i % n, y = (i / n) | 0;
        const j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (x < n - 1 ? i + 1 : -1) : (x > 0 ? i - 1 : -1)) : (dy > 0 ? (y < n - 1 ? i + n : -1) : (y > 0 ? i - n : -1));
        this.sel = -1; this.mark();
        if (j >= 0) this.swap(i, j);
      });
      const up = (e) => {
        if (!down || e.pointerId !== down.id) return;
        const d = down; down = null;
        if (d.moved || this.busy || e.type === 'pointercancel') return;
        const i = this.cellAt(e); if (i !== d.i) return;
        if (this.sel >= 0 && FL.adj(this.sel, i)) { const s = this.sel; this.sel = -1; this.mark(); this.swap(s, i); }
        else { this.sel = this.sel === i ? -1 : i; this.mark(); haptics.buzz(4); }
      };
      box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    },
    mark() { this.els.forEach((e, i) => e && e.classList.toggle('sel', i === this.sel)); this.els.forEach((e, i) => e && e.classList.toggle('cur', this.keys && i === this.cur)); },
    key(e) {   // the keys: arrows move a frame, Space or Enter takes the food under it, an arrow then swaps it that way; Escape closes
      if (!this.active || ui.open !== 'menu') return false;
      if (e.code === 'Escape') { this.close(); return true; }
      if (this.busy || !this.st || this.st.done) return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code);
      const n = FEED.n, dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
      this.idle = performance.now();
      if (!this.keys) { this.keys = true; if (this.cur < 0) this.cur = 12; this.mark(); if (dir) return true; }
      if (dir) {
        const x = this.cur % n + dir[0], y = ((this.cur / n) | 0) + dir[1];
        if (x < 0 || y < 0 || x >= n || y >= n) return true;
        const j = y * n + x;
        if (this.sel >= 0) { const s = this.sel; this.sel = -1; this.cur = j; this.mark(); this.swap(s, j); }
        else { this.cur = j; this.mark(); }
        return true;
      }
      if (e.code === 'Space' || e.code === 'Enter') { this.sel = this.sel === this.cur ? -1 : this.cur; this.mark(); return true; }
      return false;
    },
    async swap(i, j) {   // try a swap: no line, it goes back and costs nothing; a line, a move spent and all it brings resolved
      const st = this.st;
      if (this.busy || st.done || !FL.adj(i, j)) return;
      this.busy = true; this.idle = performance.now(); this.unhint();
      const ei = this.els[i], ej = this.els[j], c = FEED.cell * PIX.size, n = FEED.n;
      const dx = ((j % n) - (i % n)) * c, dy = (((j / n) | 0) - ((i / n) | 0)) * c;
      this.place(ei, j); this.place(ej, i);
      await Promise.all([anim(ei, [{ transform: `translate(${-dx}px,${-dy}px)` }, { transform: 'none' }], FEED.swap), anim(ej, [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], FEED.swap)]);
      if (!FL.ok(st.b, i, j)) {   // gently back, no move spent
        this.place(ei, i); this.place(ej, j); sound.play('deny', 0.35, 1.2);
        await Promise.all([anim(ei, [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], FEED.back, 'ease-in-out'), anim(ej, [{ transform: `translate(${-dx}px,${-dy}px)` }, { transform: 'none' }], FEED.back, 'ease-in-out')]);
        this.busy = false; return;
      }
      [this.els[i], this.els[j]] = [ej, ei];
      st.b = FL.swapped(st.b, i, j); st.moves--; st.swaps++;
      if (!st.first) { st.first = 1; track('feed_first_swap', { time_since_open_ms: Math.round(performance.now() - this.opened) }); }
      if (!save.seen.feedHint) { save.seen.feedHint = 1; persist(); }
      const r = FL.resolve(st.b, this.rng, FEED_SET);
      for (const ph of r.phases) { await this.eat(ph); st.cascades = Math.max(st.cascades, ph.cascade); }
      st.b = r.b;
      if (r.shuffled) await this.reshuffle();
      this.meter();
      this.busy = false;
      if (st.moves <= 0) st.done = true;
      if (this.closeAfter) { const c = this.closeAfter; this.closeAfter = null; if (st.done) this.finish(true); this.close(c.toGame); return; }
      if (this.dirty) { this.dirty = false; ui.menu(); }
      if (st.moves <= 0) this.finish();
    },
    async eat(ph) {   // one phase: its foods eaten (Moti's bite), then the rest down and new ones in
      const st = this.st, c = FEED.cell * PIX.size, b = game.hero;
      st.full += ph.gone.length; st.score += FL.score(ph);
      const big = ph.runs.some((r) => r.length >= 4);
      sound.play('coin', 0.5, 1 + 0.08 * (ph.cascade - 1)); haptics.buzz(big ? 18 : 8);
      if (b) { b.kickSquash(0, 1, big ? 0.6 : 0.35); b.face.wide = Math.max(b.face.wide, big ? 1 : 0.6); }
      this.meter();
      await Promise.all(ph.gone.map((i) => { const e = this.els[i]; this.els[i] = null; return anim(e, still ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.35 }, { transform: 'scale(0.2)', opacity: 0 }], FEED.pop).then(() => e.remove()); }));
      const next = this.els.slice(), falls = [];
      for (const [from, to] of ph.moved) { const e = this.els[from]; next[to] = e; if (next[from] === e) next[from] = null; this.place(e, to); const rows = ((to - from) / FEED.n) | 0; falls.push(anim(e, [{ transform: `translateY(${-rows * c}px)` }, { transform: 'none' }], FEED.fall + FEED.row * rows, 'cubic-bezier(.5,0,.9,.6)')); }
      for (const [to, from] of ph.come) { const e = this.tile(ph.b[to], to), rows = ((to / FEED.n) | 0) - from; next[to] = e; falls.push(anim(e, [{ transform: `translateY(${-rows * c}px)`, opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'none', opacity: 1 }], FEED.fall + FEED.row * rows, 'cubic-bezier(.5,0,.9,.6)')); }
      this.els = next;
      await Promise.all(falls);
    },
    async reshuffle() {   // no move left: the foods mixed, as they are, to new places
      await Promise.all(this.els.map((e) => anim(e, [{ opacity: 1 }, { opacity: 0 }], 160)));
      this.els.forEach((e) => e && e.remove()); this.els = this.st.b.map((k, i) => this.tile(k, i));
      await Promise.all(this.els.map((e) => anim(e, [{ opacity: 0 }, { opacity: 1 }], 200)));
    },
    finish(quiet) {   // the eighth move resolved: his reaction and the result (quiet: closed meanwhile, the count only)
      const st = this.st; st.done = true;
      if (st.told) return; st.told = true;
      const stars = FL.stars(st.full), b = game.hero;
      if (b) { b.kickSquash(0, 1, 0.9); b.face.wide = 1; }
      sound.play(stars >= 2 ? 'buy' : 'coin', 0.8, 1); haptics.buzz(25);
      track('feed_finish', { duration_ms: Math.round(performance.now() - st.t0), score: st.score, fullness: st.full, successful_swaps: st.swaps, cascades: st.cascades, stars });
      if (!quiet && this.box) this.result();
    },
    result() {   // over the board: his words, the stars, the score; again, or home
      const st = this.st, stars = FL.stars(st.full), end = el('div', 'fm-end');
      const sr = el('div', 'fm-stars'); for (let k = 0; k < 3; k++) sr.append(iconEl(k < stars ? 'star' : 'starOff'));
      end.append(cap(el('div', 'head', t('feedDone')), 'feedDone'), sr, px(tf('feedScore', { n: st.score })));
      const row = el('div', 'pair'); row.append(cap(button(t('feedAgain'), 'big thumb', () => { this.newRun(); ui.menu(); }), 'feedAgain'), cap(button(t('goBack'), 'big thumb alt', () => this.close()), 'goBack'));
      end.append(row); this.box.append(end);
    },
    hint(now) {   // after a while with no move (the first run's sooner): a legal pair nudges toward each other, twice
      if (!this.active || this.busy || this.hinting || !this.st || this.st.done || now - this.idle < 1000 * FEED.hint * (save.seen.feedHint ? 2 : 1)) return;
      const ls = FL.legal(this.st.b); if (!ls.length) return;
      const [i, j] = ls[(Math.random() * ls.length) | 0], ei = this.els[i], ej = this.els[j], c = 0.16 * FEED.cell * PIX.size, n = FEED.n;
      const dx = ((j % n) - (i % n)) * c, dy = (((j / n) | 0) - ((i / n) | 0)) * c;
      this.hinting = true; this.idle = now;
      const nudge = (e, sx, sy) => (still || !e ? null : e.animate([{ transform: 'none' }, { transform: `translate(${sx}px,${sy}px)` }, { transform: 'none' }, { transform: `translate(${sx}px,${sy}px)` }, { transform: 'none' }], { duration: 900, easing: 'ease-in-out' }));
      this.nudges = [nudge(ei, dx, dy), nudge(ej, -dx, -dy)].filter(Boolean);
      Promise.all(this.nudges.map((a) => a.finished.catch(() => {}))).then(() => { this.hinting = false; });
    },
    unhint() { for (const a of this.nudges || []) a.cancel(); this.nudges = []; this.hinting = false; },   // (a hint's nudge stopped at a move: not left on the swapped foods)
  };
  window.feed = feed;
  const dayKey = () => new Date(today * 86400000).toISOString().slice(0, 10);   // the game's day (today: days since 1970, UTC), as the brief's YYYY-MM-DD
  document.addEventListener('keydown', (e) => { if (feed.key(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  setInterval(() => feed.hint(performance.now()), 250);
  document.addEventListener('visibilitychange', () => { if (document.hidden) feed.idle = performance.now(); });
}
