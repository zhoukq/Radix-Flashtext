
/* eslint-disable */

class RadixKeywordProcessor {

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

    this.keywordRadixTree = {};
    this.caseSensitive = caseSensitive;
  }

  getRadixTree() {
    return this.keywordRadixTree;
  }

  wrapperString(str) {
    return `_${str}`;
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

  buildRadixTreeFromStringArray(stringArray) {
    stringArray.forEach(str => this.buildRadixTreeFromString(str));
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

