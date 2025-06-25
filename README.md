# Scribe
A scholarly Visual Studio Code extension that aids in writing medieval languages.

<img src="./doc/scribe.png" width="400"/>

## Status
_Scribe_ is currently **pre-release** at version `0.1.0`, but you are free to evalute it and give feedback!

### 🗺️ Roadmap for `0.2.0`
- [ ] Add more Old English words for autocomplete
- [ ] Add Gothic words for autocomplete
- [ ] Add Unit Tests
- [ ] Add multi-line `@*` for runic and gothic transliterations

## Language Features

## ⌨️ Autocomplete

Added basic functionality for autocomplete while typing.  Popups include definition and documentation.

- **Old English:** 772 beginner words
- **Old Norse:** 36,847 words
- **Gothic:** 1 placeholder word

## Languages

### Old English (Anglo-Saxon)

#### Anglo-Saxon Letter Substitution Guide

To make it easy to type Old English (Anglo-Saxon) text using a modern keyboard, this project automatically converts certain letter sequences into their correct historical characters and diacritics.

#### How It Works

When you type the following combinations, they are automatically replaced with the correct Old English letters:

| Input     | Output | Description                                 |
|-----------|--------|---------------------------------------------|
| `th`      | þ      | **Thorn**: Represents "th" as in *thin*     |
| `dh`      | ð      | **Eth**: Represents "th" as in *this*       |
| `ae`, `æ` | æ      | **Ash**: Single-letter vowel                |
| `ae-`, `æ-` | ǣ    | **Long Ash**: "æ" with macron (long vowel)  |
| `oe`, `œ` | œ      | **Oe Ligature**: Used in some loanwords     |
| `c'`, `cʼ` | ċ      | **Dot C**: Palatalized "c"                  |
| `g'`, `gʼ` | ġ      | **Dot G**: Palatalized "g"                  |
| `ge-`     | ġe-    | **Palatal "ge-"**: Used for palatalized "ge-"|
| `wynn`    | ƿ      | **Wynn**: Early "w" character               |
| `a-`      | ā      | **Long A**: "a" with macron (long vowel)    |
| `e-`      | ē      | **Long E**: "e" with macron                 |
| `i-`      | ī      | **Long I**: "i" with macron                 |
| `o-`      | ō      | **Long O**: "o" with macron                 |
| `u-`      | ū      | **Long U**: "u" with macron                 |
| `y-`      | ȳ      | **Long Y**: "y" with macron                 |

#### Example Usage
Typing this:

```text
Thaet c'ild bearn waes aefter wynnfullum daegum.
```

Becomes:

```text
Þæt ċild bearn wæs æfter ƿynnfullum dægum.
```

### Old Norse

#### Old Norse Letter Substitution Guide

This project allows you to type Old Norse using a modern keyboard. The following substitutions are performed automatically to produce the correct Old Norse characters and diacritics:

| Input     | Output | Description                                           |
|-----------|--------|-------------------------------------------------------|
| `th`      | þ      | **Thorn**: "th" as in *thin* (voiceless)             |
| `dh`      | ð      | **Eth**: "th" as in *this* (voiced)                   |
| `a'`      | á      | **A with acute**: long "a"                            |
| `e'`      | é      | **E with acute**: long "e"                            |
| `i'`      | í      | **I with acute**: long "i"                            |
| `o'`      | ó      | **O with acute**: long "o"                            |
| `u'`      | ú      | **U with acute**: long "u"                            |
| `y'`      | ý      | **Y with acute**: long "y"                            |
| `ae`      | æ      | **Ash**: front vowel "ae"                             |
| `oe`      | œ      | **Oe ligature**: front rounded vowel                  |
| `o/`      | ø      | **O with stroke**: front rounded vowel                |
| `o_`      | ǫ      | **O with ogonek**: "open o" or rounded "a"           |
| `c'`      | ç      | **C with cedilla**: rare, but occurs in loanwords     |
| `g'`      | ǥ      | **G with stroke**: archaic/phonetic in some dialects  |
| `k'`      | ǩ      | **K with caron**: used in some reconstructions        |
| `ae-`     | ǣ      | **Long Ash**: "æ" with macron (long vowel)           |
| `oe-`     | œ̄     | **Long Oe**: "œ" with macron (long vowel)             |
| `ss`      | ß      | **Eszett**: "ss" ligature, mostly in loanwords        |

#### Example Usage

Typing this:

```text
thae k'ona var a' mikill maðr ok o_ll e'ygð
```

Becomes:

```text
þæ ǩona var á mikill maðr ok ǫll éygð
```

### Gothic

#### Gothic Letter Substitution Guide

This project enables easy typing of the Gothic alphabet using a modern keyboard. The following substitutions are automatically performed:

| Input | Output | Description                               |
|-------|--------|-------------------------------------------|
| `th`  | þ      | **Thorn**: Represents the Gothic "þ" sound|
| `hv`  | ƕ      | **Hwair**: Represents the Gothic "ƕ" sound|

#### Example Usage

Typing this:

```text
Jah hvaiwa is thatei hvam thamma
```

Becomes:

```text
Jah ƕaiwa is þatei ƕam þamma
```

## Ancient Writing System Support

### Runes
The following runic writing systems are fully supported:
- Elder Futhark (Proto Germanic)
- Younger Futhark (Old Norse)
- Medieval Futhark (Old Norse & Old Scandinavian languages)
- Futhorc (Old English aka. Anglo-Saxon, Old Frisian)

### Gothic Script
- Wulifia's Gothic writing system for the Gothic Bible.

#### Example Usage

```ruby
@elder futhark
@younger futhark
@medieval futhark
@futhorc futhorc
@gothic gothik
```

ALT+R →

```
ᚠᚢᚦᚨᚱᚲ
ᚠᚢᛏᚼᛅᚱᚴ
ᚠᚢᛐᚼᛆᚱᚴ
ᚠᚢᚦᚩᚱᚳ
𐌲𐍉𐍄𐌷𐌹𐌺
```

#### Opening to Bēowulf

##### Old English

```ruby
@futhorc Hwæt! Wē Gār-Dena in ġēardagum,
@futhorc þēodcyninga, þrym ġefrūnon,
@futhorc hū þā æþelingas ellen fremedon.
@futhorc Oft Scyld Scēfing sceaþena þrēatum,
@futhorc monegum mægþum, meodosetla oftēah,
@futhorc egsode eorlas syððan ǣrest wearð
@futhorc fēasceaft funden; hē þæs frōfre ġebād,
@futhorc wēox under wolcnum, weorðmyndum þāh,
@futhorc oþþæt him ǣghwylc þāra ymbsittendra
@futhorc ofer hronrāde hyran scolde,
@futhorc gomban gyldan; þæt wæs gōd cyning!
```

ALT+R →

```
ᚻᚹᚫᛏ! ᚹᛖ ᚷᚪᚱ-ᛞᛖᚾᚪ ᛁᚾ ᚷᛖᚪᚱᛞᚪᚷᚢᛗ,
ᚦᛇᛞᚳᚣᚾᛁᛝᚪ, ᚦᚱᚣᛗ ᚷᛖᚠᚱᚢᚾᚩᚾ,
ᚻᚢ ᚦᚪ ᚫᚦᛖᛚᛁᛝᚪᛋ ᛖᛚᛚᛖᚾ ᚠᚱᛖᛗᛖᛞᚩᚾ.
ᚩᚠᛏ ᛋᚳᚣᛚᛞ ᛋᚳᛖᚠᛁᛝ ᛋᚳᛖᚪᚦᛖᚾᚪ ᚦᚱᛖᚪᛏᚢᛗ,
ᛗᚩᚾᛖᚷᚢᛗ ᛗᚫᚷᚦᚢᛗ, ᛗᛇᛞᚩᛋᛖᛏᛚᚪ ᚩᚠᛏᛖᚪᚻ,
ᛖᚷᛋᚩᛞᛖ ᛇᚱᛚᚪᛋ ᛋᚣᚦᚦᚪᚾ ᚫᚱᛖᛋᛏ ᚹᛖᚪᚱᚦ
ᚠᛖᚪᛋᚳᛖᚪᚠᛏ ᚠᚢᚾᛞᛖᚾ; ᚻᛖ ᚦᚫᛋ ᚠᚱᚩᚠᚱᛖ ᚷᛖᛒᚪᛞ,
ᚹᛇᛉ ᚢᚾᛞᛖᚱ ᚹᚩᛚᚳᚾᚢᛗ, ᚹᛇᚱᚦᛗᚣᚾᛞᚢᛗ ᚦᚪᚻ,
ᚩᚦᚦᚫᛏ ᚻᛁᛗ ᚫᚷᚻᚹᚣᛚᚳ ᚦᚪᚱᚪ ᚣᛗᛒᛋᛁᛏᛏᛖᚾᛞᚱᚪ
ᚩᚠᛖᚱ ᚻᚱᚩᚾᚱᚪᛞᛖ ᚻᚣᚱᚪᚾ ᛋᚳᚩᛚᛞᛖ,
ᚷᚩᛗᛒᚪᚾ ᚷᚣᛚᛞᚪᚾ; ᚦᚫᛏ ᚹᚫᛋ ᚷᚩᛞ ᚳᚣᚾᛁᛝ!
```

##### The Lord's Prayer in Gothic

```ruby
@gothic Atta unsar, þu in himinam,
@gothic weihnai namo þein.
@gothic qimai þiudinassus þeins.
@gothic wairþai wilja þeins,
@gothic swe in himina jah ana airþai.
@gothic hlaif unsarana þana sinteinan gif uns himma daga.
@gothic jah aflet uns þatei skulans sijaima,
@gothic swaswe jah weis afletam þaim skulam unsaraim.
@gothic jah ni briggais uns in fraistubnjai,
@gothic ak lausei uns af þamma ubilin.
@gothic unte þeina ist þiudangardi jah mahts jah wulþus in aiwins.
@gothic Amen.
```

ALT+R →

```
𐌰𐍄𐍄𐌰 𐌿𐌽𐍃𐌰𐍂, 𐍄𐌷𐌿 𐌹𐌽 𐌷𐌹𐌼𐌹𐌽𐌰𐌼,
𐍅𐌴𐌹𐌷𐌽𐌰𐌹 𐌽𐌰𐌼𐍉 𐍄𐌷𐌴𐌹𐌽.
𐌵𐌹𐌼𐌰𐌹 𐍄𐌷𐌹𐌿𐌳𐌹𐌽𐌰𐍃𐍃𐌿𐍃 𐍄𐌷𐌴𐌹𐌽𐍃.
𐍅𐌰𐌹𐍂𐍄𐌷𐌰𐌹 𐍅𐌹𐌻𐌾𐌰 𐍄𐌷𐌴𐌹𐌽𐍃,
𐍃𐍅𐌴 𐌹𐌽 𐌷𐌹𐌼𐌹𐌽𐌰 𐌾𐌰𐌷 𐌰𐌽𐌰 𐌰𐌹𐍂𐍄𐌷𐌰𐌹.
𐌷𐌻𐌰𐌹𐍆 𐌿𐌽𐍃𐌰𐍂𐌰𐌽𐌰 𐍄𐌷𐌰𐌽𐌰 𐍃𐌹𐌽𐍄𐌴𐌹𐌽𐌰𐌽 𐌲𐌹𐍆 𐌿𐌽𐍃 𐌷𐌹𐌼𐌼𐌰 𐌳𐌰𐌲𐌰.
𐌾𐌰𐌷 𐌰𐍆𐌻𐌴𐍄 𐌿𐌽𐍃 𐍄𐌷𐌰𐍄𐌴𐌹 𐍃𐌺𐌿𐌻𐌰𐌽𐍃 𐍃𐌹𐌾𐌰𐌹𐌼𐌰,
𐍃𐍅𐌰𐍃𐍅𐌴 𐌾𐌰𐌷 𐍅𐌴𐌹𐍃 𐌰𐍆𐌻𐌴𐍄𐌰𐌼 𐍄𐌷𐌰𐌹𐌼 𐍃𐌺𐌿𐌻𐌰𐌼 𐌿𐌽𐍃𐌰𐍂𐌰𐌹𐌼.
𐌾𐌰𐌷 𐌽𐌹 𐌱𐍂𐌹𐌲𐌲𐌰𐌹𐍃 𐌿𐌽𐍃 𐌹𐌽 𐍆𐍂𐌰𐌹𐍃𐍄𐌿𐌱𐌽𐌾𐌰𐌹,
𐌰𐌺 𐌻𐌰𐌿𐍃𐌴𐌹 𐌿𐌽𐍃 𐌰𐍆 𐍄𐌷𐌰𐌼𐌼𐌰 𐌿𐌱𐌹𐌻𐌹𐌽.
𐌿𐌽𐍄𐌴 𐍄𐌷𐌴𐌹𐌽𐌰 𐌹𐍃𐍄 𐍄𐌷𐌹𐌿𐌳𐌰𐌽𐌲𐌰𐍂𐌳𐌹 𐌾𐌰𐌷 𐌼𐌰𐌷𐍄𐍃 𐌾𐌰𐌷 𐍅𐌿𐌻𐍄𐌷𐌿𐍃 𐌹𐌽 𐌰𐌹𐍅𐌹𐌽𐍃.
𐌰𐌼𐌴𐌽.
```

## [AGPLv3 License](./LICENSE)
