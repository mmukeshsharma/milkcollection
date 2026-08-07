// Sharma Dairy Milk Collection ERP — English to Hindi Phonetic Transliteration Engine
// Enables automatic English-to-Devanagari transliteration & translation when Hindi mode is active.

const DICTIONARY: Record<string, string> = {
  // Common Dairy & App terms
  cash: 'नकद',
  upi: 'यूपीआई',
  bank: 'बैंक',
  cheque: 'चेक',
  online: 'ऑनलाइन',
  purchase: 'खरीद',
  sale: 'बिक्री',
  payment: 'भुगतान',
  cow: 'गाय',
  buffalo: 'भैंस',
  mixed: 'मिश्रित',
  morning: 'सुबह',
  evening: 'शाम',
  feed: 'खली/दाना',
  milk: 'दूध',
  ghee: 'घी',
  paneer: 'पनीर',
  butter: 'मक्खन',
  curd: 'दही',
  dahi: 'दही',
  sweets: 'मिठाई',
  farmer: 'किसान',
  buyer: 'खरीदार',
  guest: 'अतिथि',
  walkin: 'सामान्य',

  // Common Names & Places
  ram: 'राम',
  shyam: 'श्याम',
  murli: 'मुरली',
  sharma: 'शर्मा',
  mukesh: 'मुकेश',
  rampur: 'रामपुर',
  jaipur: 'जयपुर',
  delhi: 'दिल्ली',
  dhar: 'धार',
  indore: 'इंदौर',
  bhopal: 'भोपाल',
  mohan: 'मोहन',
  sohan: 'सोहन',
  rohit: 'रोहित',
  rahul: 'राहुल',
  vijay: 'विजय',
  sanjay: 'संजय',
  anil: 'अनिल',
  sunil: 'सुनील',
  rajesh: 'राजेश',
  dinesh: 'दिनेश',
  suresh: 'सुरेश',
  ramesh: 'रमेश',
  rakesh: 'राकेश',
  kamlesh: 'कमलेश',
  prakash: 'प्रकाश',
  vikas: 'विकास',
  deepak: 'दीपक',
  amit: 'अमित',
  sumit: 'सुमित',
  sachin: 'सचिन',
  virendra: 'वीरेंद्र',
  jitendra: 'जिंतेंद्र',
  devendra: 'देवेंद्र',
}

const DOUBLE_CONSONANTS: [string, string][] = [
  ['ksh', 'क्ष'],
  ['gya', 'ज्ञ'],
  ['tra', 'त्र'],
  ['kh', 'ख'],
  ['gh', 'घ'],
  ['ch', 'च'],
  ['jh', 'झ'],
  ['th', 'थ'],
  ['dh', 'ध'],
  ['ph', 'फ'],
  ['bh', 'भ'],
  ['sh', 'श'],
]

const SINGLE_CONSONANTS: [string, string][] = [
  ['k', 'क'],
  ['g', 'ग'],
  ['c', 'क'],
  ['j', 'ज'],
  ['t', 'त'],
  ['d', 'द'],
  ['n', 'न'],
  ['p', 'प'],
  ['f', 'फ'],
  ['b', 'ब'],
  ['m', 'म'],
  ['y', 'य'],
  ['r', 'र'],
  ['l', 'ल'],
  ['v', 'व'],
  ['w', 'व'],
  ['s', 'स'],
  ['h', 'ह'],
  ['z', 'ज़'],
  ['x', 'क्स'],
]

const VOWEL_MATRAS: [string, string][] = [
  ['aa', 'ा'],
  ['ai', 'ै'],
  ['au', 'ौ'],
  ['ee', 'ी'],
  ['oo', 'ू'],
  ['a', 'ा'],
  ['i', 'ि'],
  ['u', 'ु'],
  ['e', 'े'],
  ['o', 'ो'],
]

const INITIAL_VOWELS: [string, string][] = [
  ['aa', 'आ'],
  ['ai', 'ऐ'],
  ['au', 'औ'],
  ['ee', 'ई'],
  ['oo', 'ऊ'],
  ['a', 'अ'],
  ['i', 'इ'],
  ['u', 'उ'],
  ['e', 'ए'],
  ['o', 'ओ'],
]

/**
 * Phonetic English word to Devanagari converter
 */
export function transliterateWord(word: string): string {
  if (!word) return ''

  // 1. Direct dictionary match
  const lower = word.toLowerCase().trim()
  if (DICTIONARY[lower]) {
    return DICTIONARY[lower]
  }

  // Preserve non-alphabetic strings (numbers, punctuation)
  if (!/^[a-zA-Z]+$/.test(word)) {
    return word
  }

  let str = lower
  let result = ''
  let i = 0

  // Check initial vowel
  let matchedInitial = false
  for (const [v, dev] of INITIAL_VOWELS) {
    if (str.startsWith(v)) {
      result += dev
      i += v.length
      matchedInitial = true
      break
    }
  }

  while (i < str.length) {
    let matched = false

    // Try double consonants first
    for (const [c, dev] of DOUBLE_CONSONANTS) {
      if (str.substring(i).startsWith(c)) {
        result += dev
        i += c.length
        matched = true

        // Check if followed by vowel matra
        let matraMatched = false
        for (const [v, matra] of VOWEL_MATRAS) {
          if (str.substring(i).startsWith(v)) {
            if (v !== 'a' || i + v.length < str.length) {
              result += matra
            }
            i += v.length
            matraMatched = true
            break
          }
        }
        break
      }
    }

    if (matched) continue

    // Try single consonants
    for (const [c, dev] of SINGLE_CONSONANTS) {
      if (str.substring(i).startsWith(c)) {
        result += dev
        i += c.length
        matched = true

        // Check if followed by vowel matra
        for (const [v, matra] of VOWEL_MATRAS) {
          if (str.substring(i).startsWith(v)) {
            if (v !== 'a' || i + v.length < str.length) {
              result += matra
            }
            i += v.length
            break
          }
        }
        break
      }
    }

    if (matched) continue

    // Single vowel fallback
    for (const [v, dev] of INITIAL_VOWELS) {
      if (str.substring(i).startsWith(v)) {
        result += dev
        i += v.length
        matched = true
        break
      }
    }

    if (!matched) {
      result += str[i]
      i++
    }
  }

  return result || word
}

/**
 * Transliterates/translates English text to Hindi if locale is 'hi'.
 * Preserves numbers, spaces, and punctuation.
 */
export function autoTransliterate(text: string, locale: string): string {
  if (locale !== 'hi' || !text) return text

  // If text is already Devanagari, return as-is
  if (/[\u0900-\u097F]/.test(text)) return text

  return text.split(/(\s+)/).map(token => {
    if (/^\s+$/.test(token)) return token
    if (/^[0-9\W]+$/.test(token)) return token
    return transliterateWord(token)
  }).join('')
}
