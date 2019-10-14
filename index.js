
/* eslint-disable */
/*
    Copied from https://github.com/drenther/flashtext.js
	A JavaScript (Node) fork of the Python Package @ https://github.com/vi3k6i5/flashtext
	Tried to keep the API as close as possible
*/

class KeywordProcessor {

  constructor(caseSensitive = false) {
    this._keyword = '_keyword_';

    this.nonWordBoundaries = (() => {
      const getChars = (start, end, ascii) => {
        const temp = [];
        for (let i = start; i <= end; i++) {
          temp.push(ascii ? String.fromCharCode(i) : i);
        }
        return temp;
      };
      return new Set([
        ...getChars(0, 9),
        ...getChars(65, 90, true),
        ...getChars(97, 122, true),
        '_'
      ]);
    })();

    this.keywordTrieDict = [];

    this.keywordRadixTree = {};
    this.caseSensitive = caseSensitive;
  }

  getRadixTree() {
    return this.keywordRadixTree;
  }

  wrapperString(str) {
    return `_${str}`;
  }


  isWordBoundary(char) {
    char = char.substring(1);
    return !this.nonWordBoundaries.has(char);
  }

  compareStringFromBegin(str0, str1, length) {
    let pos = -1;
    for (let i = 0; i < length; i++) {
      if (str0[i] != str1[i]) {
        break;
      } else {
        pos = i;
      }
    }
    return pos;
  }

  /**
   * Compare two string to see if they are the same
   * or one is another one's prefix
   */
  compareStringPattern(left, right) {
    let pos = -1;
    let isSame = false;
    let leftBeginWithRight = false;
    let rightBeginWithLeft = false;
    let commonPrefix = false;
    if (left.length == right.length) {
      pos = this.compareStringFromBegin(left, right, left.length);
      if (pos == left.length - 1) {
        isSame = true;
      } else if (pos > -1) {
        commonPrefix = true;
      }
    } else if (left.length > right.length) {
      pos = this.compareStringFromBegin(left, right, right.length);
      if (pos == right.length - 1) {
        leftBeginWithRight = true;
      } else if (pos > -1) {
        commonPrefix = true;
      }
    } else {
      pos = this.compareStringFromBegin(left, right, left.length);
      if (pos == left.length - 1) {
        rightBeginWithLeft = true;
      } else if (pos > -1) {
        commonPrefix = true;
      }
    }

    return { pos, isSame, leftBeginWithRight, rightBeginWithLeft, commonPrefix };
  }

  buildRadixTreeFromString(baseKeyWord) {
    if (!this.caseSensitive) baseKeyWord = baseKeyWord.toLowerCase();
    const keyWord = this.wrapperString(baseKeyWord);
    const radixTreeRef = this.keywordRadixTree;
    const stack = [];
    const keys = Object.keys(radixTreeRef);
    if (keys.length == 0) {
      radixTreeRef[keyWord] = {};
      radixTreeRef[keyWord][this._keyword] = baseKeyWord;
      return;
    }
    stack.push({ tree: this.keywordRadixTree, keys, currentBaseKeyWord: baseKeyWord });

    while (stack.length > 0) {
      const { tree: curTreeNode,
        keys: curTreeKeys,
        currentBaseKeyWord: curBaseKeyWord,
      } = stack.pop();
      const curKeyWord = this.wrapperString(curBaseKeyWord);
      const itemResults = curTreeKeys.map(key => Object.assign(this.compareStringPattern(key, curKeyWord), { key }));
      // if all keys are no match, we should add it manually
      const noMatch = itemResults.filter(item => {
        const {
          pos,
          isSame,
          leftBeginWithRight,
          rightBeginWithLeft,
          commonPrefix,
        } = item;
        return !(isSame || leftBeginWithRight || rightBeginWithLeft || (commonPrefix && pos > 0))
      });
      if (noMatch.length === itemResults.length) {
        curTreeNode[curKeyWord] = {};
        curTreeNode[curKeyWord][this._keyword] = baseKeyWord;
      }

      itemResults.forEach(item => {
        const {
          key,
          pos,
          isSame,
          leftBeginWithRight,
          rightBeginWithLeft,
          commonPrefix,
        } = item;
        if (isSame) {
          curTreeNode[key][this._keyword] = baseKeyWord;
          return;
        }
        if (leftBeginWithRight) {
          const newKey = this.wrapperString(key.slice(curKeyWord.length));
          curTreeNode[curKeyWord] = {};
          curTreeNode[curKeyWord][this._keyword] = baseKeyWord;
          curTreeNode[curKeyWord][newKey] = curTreeNode[key];
          delete curTreeNode[key];
        } else if (rightBeginWithLeft) {
          stack.push({
            tree: curTreeNode[key],
            keys: Object.keys(curTreeNode[key]),
            currentBaseKeyWord: curBaseKeyWord.slice(key.length - 1)
          });
        } else if (commonPrefix && pos > 0) {
          const newPrefixKey = key.slice(0, pos + 1);
          const newKey1 = this.wrapperString(key.slice(pos + 1));
          const newKey2 = this.wrapperString(curKeyWord.slice(pos + 1));
          curTreeNode[newPrefixKey] = {};
          curTreeNode[newPrefixKey][newKey1] = curTreeNode[key];
          curTreeNode[newPrefixKey][newKey2] = {};
          curTreeNode[newPrefixKey][newKey2][this._keyword] = baseKeyWord;
          delete curTreeNode[key];
        }
      })
    }
  }

  addKeywordsFromArray(stringArray) {
    stringArray.forEach(str => this.buildRadixTreeFromString(str));
  }

  getWordByKey(currentKey, initialWord, sentence, index) {
    let step = 0
    let word = initialWord;
    while (currentKey.length > word.length) {
      step++;
      word += sentence[index + step];
    }
    return { step, word };
  }

  extractKeywords(sentence) {
    /*
      Args -
        sentence (String): Line of text where we will search for keywords
      Returns -
        keywordsExtracted (Array(String)): Array of terms/keywords found in the sentence that match our corpus
    */
    const keywordsExtracted = [];
    const sentenceLength = sentence.length;

    if (typeof sentence !== 'string' && sentenceLength === 0)
      return keywordsExtracted;

    if (!this.caseSensitive) sentence = sentence.toLowerCase();

    let currentDictRef = this.keywordRadixTree;
    let sequenceStartPos = -1;
    let sequenceEndPos = 0;
    let idx = 0;

    while (idx < sentenceLength) {
      if (sequenceStartPos === -1) {
        sequenceStartPos = idx;
      }
      let char = this.wrapperString(sentence[idx]);

      let longestSequenceFound, isLongerSequenceFound, idy;
      const keys = Object.keys(currentDictRef);

      let keyMatched = false;
      for (const currentKey of keys) {
        if (currentKey != this._keyword) {
          const {
            word,
            step
          } = this.getWordByKey(currentKey, char, sentence, idx);

          if (this.isWordBoundary(char)) {
            // word is end or the boundaries is part of the word
            if (currentDictRef[this._keyword] !== undefined || currentDictRef[word] != undefined) {
              keyMatched = true;
              longestSequenceFound = '';
              isLongerSequenceFound = false;

              if (currentDictRef[this._keyword] !== undefined) {
                longestSequenceFound = currentDictRef[this._keyword];
                sequenceEndPos = idx + step;
              }

              if (currentDictRef[word] != undefined) {
                let currentDictContinued = currentDictRef[word];
                idy = idx + step + 1;
                while (idy < sentenceLength) {
                  let innerChar = this.wrapperString(sentence[idy]);
                  const innerKeys = Object.keys(currentDictContinued);
                  let innerCount = 0;
                  for (const innerCurrentKey of innerKeys) {
                    if (
                      this.isWordBoundary(innerChar) &&
                      currentDictContinued[this._keyword] !== undefined
                    ) {
                      longestSequenceFound = currentDictContinued[this._keyword];
                      sequenceEndPos = idy;
                      isLongerSequenceFound = true;
                    }

                    let innerStep = 0
                    if (innerCurrentKey != this._keyword) {
                      const {
                        word: innerWord,
                        step: innerStep
                      } = this.getWordByKey(innerCurrentKey, innerChar, sentence, idy);

                      if (currentDictContinued[innerWord]) {
                        currentDictContinued = currentDictContinued[innerWord];
                        idy = idy + innerStep + 1;
                        break;
                      }
                    }

                    innerCount++;
                  }
                  if (isLongerSequenceFound || innerCount === innerKeys.length) break;
                }

                if (
                  idy >= sentenceLength &&
                  currentDictContinued[this._keyword] !== undefined
                ) {
                  longestSequenceFound = currentDictContinued[this._keyword];
                  sequenceEndPos = idy;
                  isLongerSequenceFound = true;
                }

                if (isLongerSequenceFound) {
                  idx = sequenceEndPos;
                }
              }

              if (longestSequenceFound) {
                keywordsExtracted.push([sequenceStartPos, idx - 1, longestSequenceFound]);

                currentDictRef = this.keywordRadixTree;
                sequenceStartPos = -1;
                break;
              }
              currentDictRef = this.keywordRadixTree;
              sequenceStartPos = -1;
            }
          } else if (currentDictRef[word] !== undefined) {
            currentDictRef = currentDictRef[word];
            idx += step;
            keyMatched = true;
            break;
          } else if (currentKey == keys[keys.length - 1]) {
            idy = idx + 1;

            while (idy < sentenceLength) {
              char = this.wrapperString(sentence[idy]);
              if (this.isWordBoundary(char)) break;
              ++idy;
            }

            idx = idy;
          }
        } else {
          if (keys.length == 1 && this.isWordBoundary(char)) {
            longestSequenceFound = currentDictRef[this._keyword];
            if (longestSequenceFound) {
              keywordsExtracted.push([sequenceStartPos, idx - 1, longestSequenceFound]);

              currentDictRef = this.keywordRadixTree;
              sequenceStartPos = -1;
              break;
            }
          }
        }
      }
      if (!keyMatched) {
        currentDictRef = this.keywordRadixTree;
        sequenceStartPos = -1;
      }
      if (idx + 1 >= sentenceLength) {
        if (currentDictRef[this._keyword] !== undefined) {
          longestSequenceFound = currentDictRef[this._keyword];
          keywordsExtracted.push([sequenceStartPos, idx, longestSequenceFound]);
        }
      }
      idx++;
    }
    return keywordsExtracted;
  }
}

const nodes = [
  "bank of america",
  "bank of beijing",
  "bank of guiyang",
  "apsf",
  "apple",
  "appelr",
  "ap sff",
  "appkt",
  "ss",
  "ap",
  "a",
  "as",
  "ass",
  "assp",
  "as sp",
];


const rx = new RadixKeywordProcessor();
rx.buildRadixTreeFromStringArray(nodes)
console.log(rx.getRadixTree());

