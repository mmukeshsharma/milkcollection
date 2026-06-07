const combiningRegex = /[\u0901\u0902\u0903\u093c\u093e\u093f\u0940-\u094c\u094d\u0951-\u0957\u0962\u0963]/;

function getVisualWidth(text) {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (combiningRegex.test(char)) {
      continue;
    }
    if (i > 0 && text[i - 1] === '\u094d' && char >= '\u0900' && char <= '\u097f') {
      continue;
    }
    width++;
  }
  return width;
}

const labels = ["दिनांक", "कोड", "ग्राहक", "दूध प्रकार", "मात्रा", "फैट", "एसएनएफ", "दर", "राशि"];
labels.forEach(l => {
  console.log(`${l}: string length = ${l.length}, visual width = ${getVisualWidth(l)}`);
});
