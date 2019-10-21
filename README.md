
# Radix-Flashtext

Base on https://github.com/drenther/flashtext.js (trie tree version), this is the radix tree version of flashtext.

**You should know this was just an experiment code, the time performance of radix can be improved if you digger deep into the code **

In current implementation, I try to keep the interface as same as the original one.

Here are some basic test data about the memory usage and speed of trie tree version and radix tree version:

Note: the data size here, 10K mean 10K line of random data, every line has 10-16 characters, every character can be 0-9, a-z, A-Z

Memory Usage:

| Data Size  | Trie  | Radix  |
|---|---|---|---|---|
| 10K  | 4MB  | 5.1MB  |
| 50k | 28MB  | 18MB  |
| 100k  | 53MB  | 31MB  |
| 500k  | 266MB  | 123MB  |
| 1M  | 555MB  | 244MB  |

Performance:
Note: The match performance is almost the same, the only difference is the build tree time.
The time cost here is about: build tree + match
| Data Size  | Trie  | Radix  |
|---|---|---|---|---|
| 10K  | 265ms  | 339ms  |
| 50k | 469ms  | 926ms  |
| 100k  | 695ms  | 1981ms  |
| 200k  | 1261ms  | 3679ms  |
| 500k  | 2884ms  | 9081ms  |
| 1M  | 8394ms  | 31129ms  |

