/**
 * Типографика переносов — общий хелпер для всех пользовательских текстов (правила владелицы 12.10.2026 и
 * 20.10.2026: «переноси текст и слова-предлоги не оставляй, я уже тебе говорила»).
 *
 * Что делает `nbsp(text)`:
 *  - неразрывный пробел после коротких предлогов, союзов и частиц («в Москве», «и готов», «а также для»);
 *  - неразрывный пробел перед «же», «ли», «бы» — они не начинают строку;
 *  - неразрывный пробел перед тире «—» и «–» и перед точкой-разделителем «·», «•» — они не начинают строку;
 *  - число не отрывается от следующего слова и разрядов («10 420 баллов», «15 окт», «8 ч 54 мин», «263,30 ₽»);
 *  - «№» не отрывается от номера; «РЖД Бонус», «ОАО «РЖД»» не разрываются.
 * Переводы строк (`\n`) не трогаются: это намеренные переносы в данных.
 *
 * `installTypography()` применяет то же правило ко всем текстам страницы — в том числе к данным, порталам
 * (поповеры, окна) и тому, что появляется позже, — поэтому отдельные строки оборачивать не нужно.
 */

const WORDS =
  'а|в|во|и|к|ко|о|об|обо|с|со|у|я|на|за|по|из|от|до|не|ни|но|да|то|для|без|при|про|под|над|или|как|что|чем|через|из-за|из-под|изо|ото|нет'

const NB = ' '

/** Короткое слово, после которого обычный пробел (не перевод строки). */
const AFTER_SHORT = new RegExp(`(?<![\\p{L}\\p{N}\\-])(${WORDS})[ \\t]+(?=\\S)`, 'giu')
/** Короткое слово в самом конце текстового узла: «в » + <b>Москве</b>. */
const AFTER_SHORT_END = new RegExp(`(?<![\\p{L}\\p{N}\\-])(${WORDS})[ \\t]+$`, 'giu')
/** Частицы, которые не начинают строку. */
const BEFORE_PARTICLE = /[ \t]+(же|ли|бы|ль|б)(?![\p{L}\p{N}])/giu
/** Тире и разделители — не в начале строки. */
const BEFORE_DASH = /[ \t]+([—–·•])/gu
/** Число + слово / знак / следующий разряд. */
const AFTER_NUMBER = /(\d)[ \t]+(?=[\p{L}\d₽%№])/gu
const NUMBER_SIGN = /№[ \t]+(?=\d)/gu
/** Названия, которые не разрываются: «РЖД Бонус», «ОАО «РЖД»». */
const NAMES = /(РЖД|ОАО|АО)[ \t]+(?=Бонус|«)/gu

function nbsp(text) {
  if (!text || !/[ \t]/.test(text)) return text
  // Два прохода: подряд идущие короткие слова («а также для», «и в») захватываются по очереди.
  return text
    .replace(AFTER_SHORT, `$1${NB}`)
    .replace(AFTER_SHORT, `$1${NB}`)
    .replace(AFTER_SHORT_END, `$1${NB}`)
    .replace(BEFORE_PARTICLE, `${NB}$1`)
    .replace(BEFORE_DASH, `${NB}$1`)
    .replace(AFTER_NUMBER, `$1${NB}`)
    .replace(NUMBER_SIGN, `№${NB}`)
    .replace(NAMES, `$1${NB}`)
}

const SKIP = 'script,style,textarea,code,pre,[contenteditable],[data-typo-skip]'

function fixTextNode(node) {
  const value = node.nodeValue
  if (!value) return
  const parent = node.parentElement
  if (!parent || parent.closest(SKIP)) return
  const next = nbsp(value)
  if (next !== value) node.nodeValue = next
}

function fixTree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    fixTextNode(root)
    return
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) fixTextNode(n)
}

/** Подключается один раз в `main.tsx`: следит за всей страницей, включая порталы в `<body>`. */
function installTypography(root = document.body) {
  fixTree(root)
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') fixTextNode(r.target)
      else r.addedNodes.forEach(fixTree)
    }
  })
  observer.observe(root, { subtree: true, childList: true, characterData: true })
  return () => observer.disconnect()
}

installTypography()
