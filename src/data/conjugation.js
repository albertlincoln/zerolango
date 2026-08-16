// Verb conjugation drill set.
//
// Eight forms per verb, following the stem + suffix model:
//   ichidan  — fixed stem, suffix vowel discarded   (tabe + (i)masu  = tabemasu)
//   godan    — stem with a wildcard consonant that  (nom* + (i)masu  = nomimasu)
//              activates the suffix's secret vowel   (nom* + (a)nai   = nomanai)
//
// `group` is the dictionary-form romaji. The engine uses it to draw distractors
// from the SAME verb, so a question tests the form rather than the vocabulary.
const CONJUGATION = [
  // --- Ichidan (fixed stem) ---
  { character: 'たべる',     reading: 'eat (dictionary)',       group: 'taberu' },
  { character: 'たべます',   reading: 'eat (polite)',           group: 'taberu' },
  { character: 'たべません', reading: 'eat (polite negative)',  group: 'taberu' },
  { character: 'たべない',   reading: 'eat (casual negative)',  group: 'taberu' },
  { character: 'たべた',     reading: 'eat (casual past)',      group: 'taberu' },
  { character: 'たべました', reading: 'eat (polite past)',      group: 'taberu' },
  { character: 'たべたい',   reading: 'eat (want to)',          group: 'taberu' },
  { character: 'たべて',     reading: 'eat (te-form)',          group: 'taberu' },

  { character: 'みる',       reading: 'see (dictionary)',       group: 'miru' },
  { character: 'みます',     reading: 'see (polite)',           group: 'miru' },
  { character: 'みません',   reading: 'see (polite negative)',  group: 'miru' },
  { character: 'みない',     reading: 'see (casual negative)',  group: 'miru' },
  { character: 'みた',       reading: 'see (casual past)',      group: 'miru' },
  { character: 'みました',   reading: 'see (polite past)',      group: 'miru' },
  { character: 'みたい',     reading: 'see (want to)',          group: 'miru' },
  { character: 'みて',       reading: 'see (te-form)',          group: 'miru' },

  { character: 'ねる',       reading: 'sleep (dictionary)',      group: 'neru' },
  { character: 'ねます',     reading: 'sleep (polite)',          group: 'neru' },
  { character: 'ねません',   reading: 'sleep (polite negative)', group: 'neru' },
  { character: 'ねない',     reading: 'sleep (casual negative)', group: 'neru' },
  { character: 'ねた',       reading: 'sleep (casual past)',     group: 'neru' },
  { character: 'ねました',   reading: 'sleep (polite past)',     group: 'neru' },
  { character: 'ねたい',     reading: 'sleep (want to)',         group: 'neru' },
  { character: 'ねて',       reading: 'sleep (te-form)',         group: 'neru' },

  { character: 'おきる',     reading: 'wake up (dictionary)',      group: 'okiru' },
  { character: 'おきます',   reading: 'wake up (polite)',          group: 'okiru' },
  { character: 'おきません', reading: 'wake up (polite negative)', group: 'okiru' },
  { character: 'おきない',   reading: 'wake up (casual negative)', group: 'okiru' },
  { character: 'おきた',     reading: 'wake up (casual past)',     group: 'okiru' },
  { character: 'おきました', reading: 'wake up (polite past)',     group: 'okiru' },
  { character: 'おきたい',   reading: 'wake up (want to)',         group: 'okiru' },
  { character: 'おきて',     reading: 'wake up (te-form)',         group: 'okiru' },

  // --- Godan, m/n/b stems → -nda / -nde ---
  { character: 'のむ',       reading: 'drink (dictionary)',      group: 'nomu' },
  { character: 'のみます',   reading: 'drink (polite)',          group: 'nomu' },
  { character: 'のみません', reading: 'drink (polite negative)', group: 'nomu' },
  { character: 'のまない',   reading: 'drink (casual negative)', group: 'nomu' },
  { character: 'のんだ',     reading: 'drink (casual past)',     group: 'nomu' },
  { character: 'のみました', reading: 'drink (polite past)',     group: 'nomu' },
  { character: 'のみたい',   reading: 'drink (want to)',         group: 'nomu' },
  { character: 'のんで',     reading: 'drink (te-form)',         group: 'nomu' },

  { character: 'しぬ',       reading: 'die (dictionary)',      group: 'shinu' },
  { character: 'しにます',   reading: 'die (polite)',          group: 'shinu' },
  { character: 'しにません', reading: 'die (polite negative)', group: 'shinu' },
  { character: 'しなない',   reading: 'die (casual negative)', group: 'shinu' },
  { character: 'しんだ',     reading: 'die (casual past)',     group: 'shinu' },
  { character: 'しにました', reading: 'die (polite past)',     group: 'shinu' },
  { character: 'しにたい',   reading: 'die (want to)',         group: 'shinu' },
  { character: 'しんで',     reading: 'die (te-form)',         group: 'shinu' },

  // --- Godan, g stem → -ida / -ide ---
  { character: 'およぐ',     reading: 'swim (dictionary)',      group: 'oyogu' },
  { character: 'およぎます', reading: 'swim (polite)',          group: 'oyogu' },
  { character: 'およぎません', reading: 'swim (polite negative)', group: 'oyogu' },
  { character: 'およがない', reading: 'swim (casual negative)', group: 'oyogu' },
  { character: 'およいだ',   reading: 'swim (casual past)',     group: 'oyogu' },
  { character: 'およぎました', reading: 'swim (polite past)',   group: 'oyogu' },
  { character: 'およぎたい', reading: 'swim (want to)',         group: 'oyogu' },
  { character: 'およいで',   reading: 'swim (te-form)',         group: 'oyogu' },

  // --- Godan, s stem → regular -shita / -shite ---
  { character: 'はなす',     reading: 'speak (dictionary)',      group: 'hanasu' },
  { character: 'はなします', reading: 'speak (polite)',          group: 'hanasu' },
  { character: 'はなしません', reading: 'speak (polite negative)', group: 'hanasu' },
  { character: 'はなさない', reading: 'speak (casual negative)', group: 'hanasu' },
  { character: 'はなした',   reading: 'speak (casual past)',     group: 'hanasu' },
  { character: 'はなしました', reading: 'speak (polite past)',   group: 'hanasu' },
  { character: 'はなしたい', reading: 'speak (want to)',         group: 'hanasu' },
  { character: 'はなして',   reading: 'speak (te-form)',         group: 'hanasu' },

  // --- Godan, r/t stems → -tta / -tte ---
  { character: 'かえる',     reading: 'return home (dictionary)',      group: 'kaeru' },
  { character: 'かえります', reading: 'return home (polite)',          group: 'kaeru' },
  { character: 'かえりません', reading: 'return home (polite negative)', group: 'kaeru' },
  { character: 'かえらない', reading: 'return home (casual negative)', group: 'kaeru' },
  { character: 'かえった',   reading: 'return home (casual past)',     group: 'kaeru' },
  { character: 'かえりました', reading: 'return home (polite past)',   group: 'kaeru' },
  { character: 'かえりたい', reading: 'return home (want to)',         group: 'kaeru' },
  { character: 'かえって',   reading: 'return home (te-form)',         group: 'kaeru' },

  { character: 'まつ',       reading: 'wait (dictionary)',      group: 'matsu' },
  { character: 'まちます',   reading: 'wait (polite)',          group: 'matsu' },
  { character: 'まちません', reading: 'wait (polite negative)', group: 'matsu' },
  { character: 'またない',   reading: 'wait (casual negative)', group: 'matsu' },
  { character: 'まった',     reading: 'wait (casual past)',     group: 'matsu' },
  { character: 'まちました', reading: 'wait (polite past)',     group: 'matsu' },
  { character: 'まちたい',   reading: 'wait (want to)',         group: 'matsu' },
  { character: 'まって',     reading: 'wait (te-form)',         group: 'matsu' },

  // --- Godan, vowel stem: ka* + (a)nai → kawanai ---
  { character: 'かう',       reading: 'buy (dictionary)',      group: 'kau' },
  { character: 'かいます',   reading: 'buy (polite)',          group: 'kau' },
  { character: 'かいません', reading: 'buy (polite negative)', group: 'kau' },
  { character: 'かわない',   reading: 'buy (casual negative)', group: 'kau' },
  { character: 'かった',     reading: 'buy (casual past)',     group: 'kau' },
  { character: 'かいました', reading: 'buy (polite past)',     group: 'kau' },
  { character: 'かいたい',   reading: 'buy (want to)',         group: 'kau' },
  { character: 'かって',     reading: 'buy (te-form)',         group: 'kau' },

  // --- Irregular: iku takes itta / itte, not iita / iite ---
  { character: 'いく',       reading: 'go (dictionary)',      group: 'iku' },
  { character: 'いきます',   reading: 'go (polite)',          group: 'iku' },
  { character: 'いきません', reading: 'go (polite negative)', group: 'iku' },
  { character: 'いかない',   reading: 'go (casual negative)', group: 'iku' },
  { character: 'いった',     reading: 'go (casual past)',     group: 'iku' },
  { character: 'いきました', reading: 'go (polite past)',     group: 'iku' },
  { character: 'いきたい',   reading: 'go (want to)',         group: 'iku' },
  { character: 'いって',     reading: 'go (te-form)',         group: 'iku' },

  // --- Irregular: suru / kuru — memorise outright ---
  { character: 'する',       reading: 'do (dictionary)',      group: 'suru' },
  { character: 'します',     reading: 'do (polite)',          group: 'suru' },
  { character: 'しません',   reading: 'do (polite negative)', group: 'suru' },
  { character: 'しない',     reading: 'do (casual negative)', group: 'suru' },
  { character: 'した',       reading: 'do (casual past)',     group: 'suru' },
  { character: 'しました',   reading: 'do (polite past)',     group: 'suru' },
  { character: 'したい',     reading: 'do (want to)',         group: 'suru' },
  { character: 'して',       reading: 'do (te-form)',         group: 'suru' },

  { character: 'くる',       reading: 'come (dictionary)',      group: 'kuru' },
  { character: 'きます',     reading: 'come (polite)',          group: 'kuru' },
  { character: 'きません',   reading: 'come (polite negative)', group: 'kuru' },
  { character: 'こない',     reading: 'come (casual negative)', group: 'kuru' },
  { character: 'きた',       reading: 'come (casual past)',     group: 'kuru' },
  { character: 'きました',   reading: 'come (polite past)',     group: 'kuru' },
  { character: 'きたい',     reading: 'come (want to)',         group: 'kuru' },
  { character: 'きて',       reading: 'come (te-form)',         group: 'kuru' },

  // --- Irregular: aru negates to nai, it does not take -aranai.
  //     No "want to" form — aru is not volitional, so it has 7 forms here. ---
  { character: 'ある',       reading: 'exist (dictionary)',      group: 'aru' },
  { character: 'あります',   reading: 'exist (polite)',          group: 'aru' },
  { character: 'ありません', reading: 'exist (polite negative)', group: 'aru' },
  { character: 'ない',       reading: 'exist (casual negative)', group: 'aru' },
  { character: 'あった',     reading: 'exist (casual past)',     group: 'aru' },
  { character: 'ありました', reading: 'exist (polite past)',     group: 'aru' },
  { character: 'あって',     reading: 'exist (te-form)',         group: 'aru' },
];
