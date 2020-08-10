// Type for scanned tokens.
import _ from "lodash"
type TokenVal = string | undefined | number | Token
export enum TokenType {
  END,
  CHAR,
  LABEL,
  ID,
  INSTRUCTION,
  OPERAND,
  V,
  R,
  I,
  EFFECTIVE_ADDRESS,
  F,
  HF,
  K,
  DT,
  ST,
  LIT,
  TEXT,
  BREAK,
  ASSERT,
  EQU,
  VAR,
  HERE,
  SUPER,
  EXTENDED,
  ASCII,
}
export class Token {
  typ: TokenType
  val: TokenVal
  constructor(typ: TokenType, val: TokenVal = undefined) {
    this.typ = typ
    this.val = val
  }
}
export class TokenScanner {
  bytes: number[] = []
  pos = 0
  constructor(bytes: number[]) {
    this.bytes = bytes
  }
  scanToken = (): Token => {
    // 找到第一个可见字符
    while (this.bytes.length > this.pos && this.bytes[this.pos] < 33) {
      this.pos++
    }
    // 如果已到最后 返回结束token
    if (this.bytes.length <= this.pos) {
      return new Token(TokenType.END, "")
    }
    // get the next character
    let c = String.fromCharCode(this.bytes[this.pos])
    // 0-9
    if (this.bytes[this.pos] >= 48 && this.bytes[this.pos] <= 57) {
      return this.scanDecLit()
    }
    // A-Z
    if (this.bytes[this.pos] >= 65 && this.bytes[this.pos] <= 90) {
      return this.scanIdentifier()
    }
    // get the next character
    switch (c) {
      case ";":
        return this.scanToEnd()
      case "[":
        return this.scanEffectiveAddress()
      case ",":
        return this.scanOperand()
      case "#":
        return this.scanHexLit()
      case "%":
        return this.scanBinLit()
      case "-":
        return this.scanDecLit()
      case '"':
      case "'":
      case "`":
        return this.scanString(c.charCodeAt(0))
    }

    return this.scanChar()
  }
  scanChar = (): Token => {
    let i = this.pos
    this.pos++
    // *
    if (this.bytes[i] === 42) {
      return new Token(TokenType.HERE)
    }
    return new Token(TokenType.CHAR, this.bytes[i])
  }
  scanToEnd = () => {
    let txt = String.fromCharCode.apply(null, this.bytes.slice(this.pos))
    // skip to the end
    this.pos = this.bytes.length
    // a hard-coded token
    return new Token(TokenType.END, _.trim(txt))
    // return new Token(TokenType.END,  strings.TrimSpace(text)}
  }
  scanOperand = () => {
    this.pos++
    // scan the next token as the operand
    // t := s.scanToken()
    let t = this.scanToken()
    // make sure there was an operand
    if (t.typ === TokenType.END) {
      throw new Error("expected operand")
    }
    return new Token(TokenType.OPERAND, t)
  }
  scanOperands = () => {
    let tokens: Token[] = []
    // is this the end of the operand list?
    for (let t = this.scanToken(); t.typ !== TokenType.END; ) {
      tokens.push(t)
      // get another token, are we at the end?
      t = this.scanToken()
      if (t.typ !== TokenType.OPERAND) {
        if (t.typ === TokenType.END) {
          break
        }
        throw new Error("unexpected token")
      }
      // expand the operand
      t = t.val as Token
    }
    return tokens
  }
  scanEffectiveAddress = () => {
    this.pos++
    // scan the next token to take the effective address
    let t = this.scanToken()
    if (t.typ !== TokenType.I) {
      throw new Error("illegal indirection")
    }
    t = this.scanToken()
    // terminate with closing bracket
    // 93 => ']'
    if (t.typ !== TokenType.CHAR || (t.val as number) !== 93) {
      throw new Error("illegal effective address")
    }
    return new Token(TokenType.EFFECTIVE_ADDRESS)
  }
  scanIdentifier = () => {
    let i = this.pos
    // advance to the first non-identifier character
    for (; this.pos < this.bytes.length; this.pos++) {
      let c = this.bytes[this.pos]
      // validate identifier characters
      if (
        (c < "A".charCodeAt(0) || c > "Z".charCodeAt(0)) &&
        (c < "0".charCodeAt(0) || c > "9".charCodeAt(0)) &&
        c !== "_".charCodeAt(0)
      ) {
        break
      }
    }

    // extract the label
    let id = String.fromCharCode.apply(null, this.bytes.slice(i, this.pos))
    console.log(id, this.bytes.slice(i, this.pos))
    // determine whether the label is an instruction, register or reference
    switch (id) {
      case "V0":
        return new Token(TokenType.V, 0)
      case "V1":
        return new Token(TokenType.V, 1)
      case "V2":
        return new Token(TokenType.V, 2)
      case "V3":
        return new Token(TokenType.V, 3)
      case "V4":
        return new Token(TokenType.V, 4)
      case "V5":
        return new Token(TokenType.V, 5)
      case "V6":
        return new Token(TokenType.V, 6)
      case "V7":
        return new Token(TokenType.V, 7)
      case "V8":
        return new Token(TokenType.V, 8)
      case "V9":
        return new Token(TokenType.V, 9)
      case "VA":
        return new Token(TokenType.V, 10)
      case "VB":
        return new Token(TokenType.V, 11)
      case "VC":
        return new Token(TokenType.V, 12)
      case "VD":
        return new Token(TokenType.V, 13)
      case "VE":
        return new Token(TokenType.V, 14)
      case "VF":
        return new Token(TokenType.V, 15)
      case "R":
        return new Token(TokenType.R)
      case "I":
        return new Token(TokenType.I)
      case "F":
        return new Token(TokenType.F)
      case "HF":
        return new Token(TokenType.HF)
      case "K":
        return new Token(TokenType.K)
      case "A":
        return new Token(TokenType.ASCII)
      case "D":
      case "DT":
        return new Token(TokenType.DT)
      case "S":
      case "ST":
        return new Token(TokenType.ST)
      case "CLS":
      case "RET":
      case "EXIT":
      case "LOW":
      case "HIGH":
      case "SCU":
      case "SCD":
      case "SCR":
      case "SCL":
      case "SYS":
      case "JP":
      case "CALL":
      case "SE":
      case "SNE":
      case "SGT":
      case "SLT":
      case "SKP":
      case "SKNP":
      case "LD":
      case "OR":
      case "AND":
      case "XOR":
      case "ADD":
      case "SUB":
      case "SUBN":
      case "MUL":
      case "DIV":
      case "SHR":
      case "SHL":
      case "BCD":
      case "RND":
      case "DRW":
        return new Token(TokenType.INSTRUCTION, id)
      case "ASCII":
      case "BYTE":
      case "WORD":
      case "ALIGN":
      case "PAD":
        return new Token(TokenType.INSTRUCTION, id)
      case "BREAK":
        return new Token(TokenType.BREAK)
      case "ASSERT":
        return new Token(TokenType.ASSERT)
      case "EQU":
        return new Token(TokenType.EQU)
      case "VAR":
        return new Token(TokenType.VAR)
      case "SUPER":
        return new Token(TokenType.SUPER)
      case "EXTENDED":
        return new Token(TokenType.EXTENDED)
    }
    return new Token(i === 0 ? TokenType.LABEL : TokenType.ID, id)
  }
  getView = (bytes: number[]) => {
    let view = new DataView(new ArrayBuffer(bytes.length))
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(i, bytes[i])
    }
    return view
  }
  scanDecLit = () => {
    let i = this.pos
    // skip a unary minus negation
    if (this.bytes[i] === "-".charCodeAt(0)) {
      this.pos++
    }
    // find the first non-numeric character
    for (; this.pos < this.bytes.length; this.pos++) {
      // 0-9
      if (![48, 49, 50, 51, 52, 53, 54, 55, 56, 57].includes(this.bytes[this.pos])) {
        break
      }
    }
    try {
      // convert the hex value to a signed number
      let nStr = ""
      this.bytes.slice(i, this.pos).map(v => (nStr += String.fromCharCode(v)))
      let n = parseInt(nStr, 10)
      console.log(nStr, n, this.bytes.slice(i, this.pos))
      return new Token(TokenType.LIT, n)
    } catch (err) {
      throw new Error(
        "illegal decimal value: " + String.fromCharCode.apply(null, this.bytes.slice(i, this.pos)),
      )
    }
  }
  scanHexLit = () => {
    let i = this.pos
    const s = this
    // find the first non-hex character
    for (s.pos += 1; s.pos < s.bytes.length; s.pos++) {
      // 0-9 A-F
      if (
        ![48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70].includes(
          this.bytes[this.pos],
        )
      ) {
        break
      }
    }
    let nStr = ""
    this.bytes.slice(i + 1, this.pos).map(v => (nStr += String.fromCharCode(v)))
    let n = parseInt(nStr, 16)
    if (isNaN(n)) {
      throw new Error(
        "illegal hex value: " + String.fromCharCode.apply(null, s.bytes.slice(i + 1, s.pos)),
      )
    }
    return new Token(TokenType.LIT, n)
  }
  scanBinLit = () => {
    let s = this
    let i = s.pos
    // find the first non-binary character
    for (s.pos += 1; s.pos < s.bytes.length; s.pos += 1) {
      // .01

      if (![46, 48, 49].includes(this.bytes[this.pos])) {
        break
      }
    }
    let v = s.bytes.slice(i + 1, s.pos).filter(a => a !== 46)
    let nStr = ""
    v.map(v => (nStr += String.fromCharCode(v)))
    let n = parseInt(nStr, 2)
    if (isNaN(n)) {
      throw new Error(
        "illegal binary value: " + String.fromCharCode.apply(null, s.bytes.slice(i, s.pos)),
      )
    }
    return new Token(TokenType.LIT, n)
  }
  scanString = (term: number) => {
    const s = this

    s.pos++

    // store starting position
    let i = s.pos
    // find the terminating quotation
    while (s.pos < s.bytes.length && s.bytes[s.pos] !== term) {
      // advance past the terminator
      s.pos++
    }
    return new Token(TokenType.TEXT, String.fromCharCode.apply(null, s.bytes.slice(i, s.pos - 1)))
  }
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
      let val = this.view!.getUint8(this.pos++)
      if (val) {
        curr = val
      }
      if (curr === 10) {
        this.bytes = res
        return true
      }
      res.push(curr)
    }
    this.resetPos()
    return false
  }
  resetPos = () => {
    this.pos = 0
  }
}
