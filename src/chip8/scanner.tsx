// Type for scanned tokens.
export class Token {}
export class TokenScanner {
  bytes: number[] = []
  constructor(bytes: number[]) {
    this.bytes = bytes
  }
  scanToken = (): Token => {}
}
export enum Tokens {
  TOKEN_END,
  TOKEN_CHAR,
  TOKEN_LABEL,
  TOKEN_ID,
  TOKEN_INSTRUCTION,
  TOKEN_OPERAND,
  TOKEN_V,
  TOKEN_R,
  TOKEN_I,
  TOKEN_EFFECTIVE_ADDRESS,
  TOKEN_F,
  TOKEN_HF,
  TOKEN_K,
  TOKEN_DT,
  TOKEN_ST,
  TOKEN_LIT,
  TOKEN_TEXT,
  TOKEN_BREAK,
  TOKEN_ASSERT,
  TOKEN_EQU,
  TOKEN_VAR,
  TOKEN_HERE,
  TOKEN_SUPER,
  TOKEN_EXTENDED,
  TOKEN_ASCII,
}
export class BufScanner {
  buf?: ArrayBuffer
  pos = 0
  view?: DataView
  bytes?: number[]
  constructor(buf: ArrayBuffer) {
    this.buf = buf
    this.view = new DataView(this.buf)
  }
  scan = (): boolean => {
    let res = []
    let curr = 0
    while (this.pos < this.buf!.byteLength) {
      let val = this.view!.getInt8(this.pos++)
      if (val) {
        curr = val
      }
      if (curr == 10) {
        this.bytes = res
        return true
      }
      res.push(curr)
    }
    return false
  }
}
