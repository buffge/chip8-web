import VM from "./VM"
import { emulatorROM } from "./rom"
import { Token, BufScanner, TokenScanner, TokenType } from "./scanner"

export default class Assembly {
  rom: ArrayBuffer
  // Label mapping.
  labels: Record<string, Token> = {}
  // Addresses with unresolved labels.
  unresolved: Record<number, string> = {}
  base: number
  // Super is true if using additional super CHIP-8 instructions.
  super: boolean = false
  // Extended is true if using additional CHIP-8E instructions.
  extended: boolean = false
  constructor(etiMode: boolean) {
    this.base = etiMode ? 0x600 : 0x200
    this.rom = new Uint8Array(this.base).buffer
  }
  assemble = (s: TokenScanner) => {
    const a = this
    let t = s.scanToken()
    // assign labels
    if (t.typ === TokenType.LABEL) {
      t = a.assembleLabel(t.val as string, s)
    }
    // continue assembling
    switch (t.typ) {
      case TokenType.INSTRUCTION:
        a.assembleInstruction(t.val as string, s)
        break
      case TokenType.SUPER:
        a.assembleSuper(s)
        break

      case TokenType.EXTENDED:
        a.assembleExtended(s)
        break
      case TokenType.BREAK:
        // a.assembleBreakpoint(s, false)
        break
      case TokenType.ASSERT:
        // a.assembleBreakpoint(s, true)
        break
      default:
        if (t.typ !== TokenType.END) {
          throw new Error("unexpected token")
        }
    }
  }
  assembleLabel = (label: string, s: TokenScanner) => {
    const a = this
    if (label in a.labels) {
      throw new Error("duplicate label")
    }
    // by default, the label is assigned the current address
    a.labels[label] = new Token(TokenType.LIT, a.rom.byteLength)

    // scan the next token
    let t = s.scanToken()

    // if EQU or VAR, reassign the label
    if (t.typ === TokenType.EQU || t.typ === TokenType.VAR) {
      let v = s.scanToken()
      // equ requires a literal, and var requires a v-register
      if (
        (t.typ === TokenType.EQU && v.typ === TokenType.LIT) ||
        (t.typ === TokenType.VAR && v.typ === TokenType.V)
      ) {
        a.labels[label] = v
        t = s.scanToken()
        // should be the final token
        if (t.typ === TokenType.END) {
          return t
        }
      }
      throw new Error("illegal label assignment")
    }
    return t
  }
  // 断点
  assembleBreakpoint = () => {}
  assembleSuper = (s: TokenScanner) => {
    if (s.scanToken().typ !== TokenType.END) {
      throw new Error("unexpected token")
    }
    const a = this
    if (a.rom.byteLength > a.base) {
      throw new Error("super must come before instructions")
    }
    // enter super instructions mode
    a.super = true
  }
  assembleExtended = (s: TokenScanner) => {
    if (s.scanToken().typ !== TokenType.END) {
      throw new Error("unexpected token")
    }
    const a = this
    if (a.rom.byteLength > a.base) {
      throw new Error("super must come before instructions")
    }
    // enter extended instructions mode
    a.extended = true
  }
  assembleInstruction = (i: string, s: TokenScanner) => {
    const tokens = s.scanOperands()
    const a = this
    switch (i) {
      case "CLS":
        a.rom = bufPushItems(a.rom, a.assembleCLS(tokens))
        break
      case "RET":
        a.rom = bufPushItems(a.rom, a.assembleRET(tokens))
        break
      case "EXIT":
        a.rom = bufPushItems(a.rom, a.assembleEXIT(tokens))
        break
      case "LOW":
        a.rom = bufPushItems(a.rom, a.assembleLOW(tokens))
        break
      case "HIGH":
        a.rom = bufPushItems(a.rom, a.assembleHIGH(tokens))
        break
      case "SCU":
        a.rom = bufPushItems(a.rom, a.assembleSCU(tokens))
        break
      case "SCD":
        a.rom = bufPushItems(a.rom, a.assembleSCD(tokens))
        break
      case "SCR":
        a.rom = bufPushItems(a.rom, a.assembleSCR(tokens))
        break
      case "SCL":
        a.rom = bufPushItems(a.rom, a.assembleSCL(tokens))
        break
      case "SYS":
        a.rom = bufPushItems(a.rom, a.assembleSYS(tokens))
        break
      case "JP":
        a.rom = bufPushItems(a.rom, a.assembleJP(tokens))
        break
      case "CALL":
        a.rom = bufPushItems(a.rom, a.assembleCALL(tokens))
        break
      case "SE":
        a.rom = bufPushItems(a.rom, a.assembleSE(tokens))
        break
      case "SNE":
        a.rom = bufPushItems(a.rom, a.assembleSNE(tokens))
        break
      case "SGT":
        a.rom = bufPushItems(a.rom, a.assembleSGT(tokens))
        break
      case "SLT":
        a.rom = bufPushItems(a.rom, a.assembleSLT(tokens))
        break
      case "SKP":
        a.rom = bufPushItems(a.rom, a.assembleSKP(tokens))
        break
      case "SKNP":
        a.rom = bufPushItems(a.rom, a.assembleSKNP(tokens))
        break
      case "OR":
        a.rom = bufPushItems(a.rom, a.assembleOR(tokens))
        break
      case "AND":
        a.rom = bufPushItems(a.rom, a.assembleAND(tokens))
        break
      case "XOR":
        a.rom = bufPushItems(a.rom, a.assembleXOR(tokens))
        break
      case "SHR":
        a.rom = bufPushItems(a.rom, a.assembleSHR(tokens))
        break
      case "SHL":
        a.rom = bufPushItems(a.rom, a.assembleSHL(tokens))
        break
      case "ADD":
        a.rom = bufPushItems(a.rom, a.assembleADD(tokens))
        break
      case "SUB":
        a.rom = bufPushItems(a.rom, a.assembleSUB(tokens))
        break
      case "SUBN":
        a.rom = bufPushItems(a.rom, a.assembleSUBN(tokens))
        break
      case "MUL":
        a.rom = bufPushItems(a.rom, a.assembleMUL(tokens))
        break
      case "DIV":
        a.rom = bufPushItems(a.rom, a.assembleDIV(tokens))
        break
      case "BCD":
        a.rom = bufPushItems(a.rom, a.assembleBCD(tokens))
        break
      case "RND":
        a.rom = bufPushItems(a.rom, a.assembleRND(tokens))
        break
      case "DRW":
        a.rom = bufPushItems(a.rom, a.assembleDRW(tokens))
        break
      case "LD":
        a.rom = bufPushItems(a.rom, a.assembleLD(tokens))
        break
      case "ASCII":
        a.rom = bufPushItems(a.rom, a.assembleASCII(tokens))
        break
      case "BYTE":
        a.rom = bufPushItems(a.rom, a.assembleBYTE(tokens))
        break
      case "WORD":
        a.rom = bufPushItems(a.rom, a.assembleWORD(tokens))
        break
      case "ALIGN":
        a.rom = bufPushItems(a.rom, a.assembleALIGN(tokens))
        break
      case "PAD":
        a.rom = bufPushItems(a.rom, a.assemblePAD(tokens))
        break
    }
  }
  assembleOperand = (t: Token) => {
    if (t.typ === TokenType.ID) {
      let label = t.val as string
      const a = this
      if (label in a.labels) {
        t = a.labels[label]
      } else {
        t = new Token(TokenType.LIT, 0x200)
        a.unresolved[a.rom.byteLength] = label
      }
    }
    return t
  }
  assembleOperands = (tokens: Token[], m: TokenType[]) => {
    let ops: Token[] = []
    // the number of desired tokens should match
    if (len(tokens) !== len(m)) {
      return null
    }
    const a = this
    // expand and compare the token types
    for (let i = 0; i < m.length; i++) {
      const typ = m[i]
      const t = a.assembleOperand(tokens[i])
      if (t.typ !== typ) {
        return null
      }
      ops = append(ops, t)
    }
    return ops
  }
  assembleCLS = (tokens: Token[]) => {
    if (len(tokens) === 0) {
      return [0x00, 0xe0]
    }
    panic("illegal instruction")
  }
  assembleRET = (tokens: Token[]) => {
    if (len(tokens) === 0) {
      return [0x00, 0xee]
    }

    panic("illegal instruction")
  }
  assembleEXIT = (tokens: Token[]) => {
    if (this.super) {
      if (len(tokens) === 0) {
        return [0x00, 0xfd]
      }
    }
    panic("illegal instruction")
  }
  assembleLOW = (tokens: Token[]) => {
    if (this.super) {
      if (len(tokens) === 0) {
        return [0x00, 0xfe]
      }
    }
    panic("illegal instruction")
  }
  assembleHIGH = (tokens: Token[]) => {
    if (this.super) {
      if (len(tokens) === 0) {
        return [0x00, 0xff]
      }
    }
    panic("illegal instruction")
  }
  assembleSCU = (tokens: Token[]) => {
    if (this.super) {
      let ops = this.assembleOperands(tokens, [TokenType.LIT])
      if (ops !== null) {
        let n = ops[0].val as number
        if (n < 0x10) {
          return [0x00, 0xb0 | n]
        }
      }
    }
    panic("illegal instruction")
  }
  assembleSCD = (tokens: Token[]) => {
    if (this.super) {
      let ops = this.assembleOperands(tokens, [TokenType.LIT])
      if (ops !== null) {
        let n = ops[0].val as number
        if (n < 0x10) {
          return [0x00, 0xc0 | n]
        }
      }
    }
    panic("illegal instruction")
  }
  assembleSCR = (tokens: Token[]) => {
    if (this.super) {
      if (tokens.length === 0) {
        return [0x00, 0xfb]
      }
    }
    panic("illegal instruction")
  }
  assembleSCL = (tokens: Token[]) => {
    if (this.super) {
      if (tokens.length === 0) {
        return [0x00, 0xfc]
      }
    }
    panic("illegal instruction")
  }
  assembleSYS = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.LIT])
    if (ops !== null) {
      let n = ops[0].val as number
      if (n < 0x1000) {
        return [0x10 | ((n >> 8) & 0xf), n & 0xff]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let n2 = ops[0].val as number
      let n = ops[1].val as number
      if (n2 === 0 && n < 0x1000) {
        return [0xb0 | ((n >> 8) & 0xf), n & 0xff]
      }
    }
    panic("illegal instruction")
  }
  assembleJP = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.LIT])
    if (ops !== null) {
      let n = ops[0].val as number
      if (n < 0x1000) {
        return [0x10 | ((n >> 8) & 0xf), n & 0xff]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      if (x === 0 && y < 0x1000) {
        return [0xb0 | ((y >> 8) & 0xf), y & 0xff]
      }
    }
    panic("illegal instruction")
  }
  assembleCALL = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.LIT])
    if (ops !== null) {
      let n = ops[0].val as number
      if (n < 0x1000) {
        return [0x20 | ((n >> 8) & 0xf), n & 0xff]
      }
    }

    panic("illegal instruction")
  }
  assembleSE = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let b = ops[1].val as number
      if (b < 0x100) {
        return [0x30 | x, b]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x50 | x, y << 4]
    }
    panic("illegal instruction")
  }
  assembleSNE = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let b = ops[1].val as number
      if (b < 0x100) {
        return [0x40 | x, b]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x90 | x, y << 4]
    }
    panic("illegal instruction")
  }
  assembleSGT = (tokens: Token[]) => {
    if (this.extended) {
      let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
      if (ops !== null) {
        let x = ops[0].val as number
        let y = ops[1].val as number
        return [0x50 | x, (y << 4) | 0x01]
      }
    }
    panic("illegal instruction")
  }
  assembleSLT = (tokens: Token[]) => {
    if (this.extended) {
      let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
      if (ops !== null) {
        let x = ops[0].val as number
        let y = ops[1].val as number
        return [0x50 | x, (y << 4) | 0x02]
      }
    }
    panic("illegal instruction")
  }
  assembleSKP = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xe0 | x, 0x9e]
    }
    panic("illegal instruction")
  }
  assembleSKNP = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xe0 | x, 0xa1]
    }
    panic("illegal instruction")
  }
  assembleOR = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, (y << 4) | 0x01]
    }
    panic("illegal instruction")
  }
  assembleAND = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, (y << 4) | 0x02]
    }
    panic("illegal instruction")
  }
  assembleXOR = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, (y << 4) | 0x03]
    }
    panic("illegal instruction")
  }
  assembleSHR = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0x80 | x, (x << 4) | 0x06]
    }
    panic("illegal instruction")
  }
  assembleSHL = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0x80 | x, (x << 4) | 0x0e]
    }
    panic("illegal instruction")
  }
  assembleADD = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      if (y < 0x100) {
        return [0x70 | x, y]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      if (y < 0x100) {
        return [0x80 | x, (y << 4) | 0x04]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.I, TokenType.V])
    if (ops !== null) {
      let x = ops[1].val as number
      return [0xf0 | x, 0x1e]
    }
    panic("illegal instruction")
  }
  assembleSUB = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, (y << 4) | 0x05]
    }
    panic("illegal instruction")
  }
  assembleSUBN = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, (y << 4) | 0x07]
    }
    panic("illegal instruction")
  }
  assembleMUL = (tokens: Token[]) => {
    if (this.extended) {
      let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
      if (ops !== null) {
        let x = ops[0].val as number
        let y = ops[1].val as number
        return [0x90 | x, (y << 4) | 0x01]
      }
    }
    panic("illegal instruction")
  }
  assembleDIV = (tokens: Token[]) => {
    if (this.extended) {
      let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
      if (ops !== null) {
        let x = ops[0].val as number
        let y = ops[1].val as number
        return [0x90 | x, (y << 4) | 0x02]
      }
    }
    panic("illegal instruction")
  }
  assembleBCD = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xf0 | x, 0x33]
    }
    if (this.extended) {
      let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
      if (ops !== null) {
        let x = ops[0].val as number
        let y = ops[1].val as number
        return [0x90 | x, (y << 4) | 0x03]
      }
    }
    panic("illegal instruction")
  }
  assembleRND = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      if (y < 0x100) {
        return [0xc0 | x, y]
      }
    }
    panic("illegal instruction")
  }
  assembleDRW = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      let z = ops[2].val as number
      if (z < 0x10) {
        return [0xd0 | x, (y << 4) | z]
      }
    }
    panic("illegal instruction")
  }
  assembleLD = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.V, TokenType.LIT])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      if (y < 0x100) {
        return [0x60 | x, y]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.V])
    if (ops !== null) {
      let x = ops[0].val as number
      let y = ops[1].val as number
      return [0x80 | x, y << 4]
    }
    ops = this.assembleOperands(tokens, [TokenType.I, TokenType.LIT])
    if (ops !== null) {
      let x = ops[1].val as number
      if (x < 0x1000) {
        return [0xa0 | ((x >> 8) & 0xf), x & 0xff]
      }
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.DT])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xf0 | x, 0x07]
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.K])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xf0 | x, 0x0a]
    }
    ops = this.assembleOperands(tokens, [TokenType.DT, TokenType.V])
    if (ops !== null) {
      let x = ops[1].val as number
      return [0xf0 | x, 0x15]
    }
    ops = this.assembleOperands(tokens, [TokenType.ST, TokenType.V])
    if (ops !== null) {
      let x = ops[1].val as number
      return [0xf0 | x, 0x18]
    }
    ops = this.assembleOperands(tokens, [TokenType.F, TokenType.V])
    if (ops !== null) {
      let x = ops[1].val as number
      return [0xf0 | x, 0x29]
    }
    ops = this.assembleOperands(tokens, [TokenType.EFFECTIVE_ADDRESS, TokenType.V])
    if (ops !== null) {
      let x = ops[1].val as number
      return [0xf0 | x, 0x55]
    }
    ops = this.assembleOperands(tokens, [TokenType.V, TokenType.EFFECTIVE_ADDRESS])
    if (ops !== null) {
      let x = ops[0].val as number
      return [0xf0 | x, 0x65]
    }
    if (this.super) {
      ops = this.assembleOperands(tokens, [TokenType.HF, TokenType.V])
      if (ops !== null) {
        let x = ops[1].val as number
        return [0xf0 | x, 0x30]
      }
      ops = this.assembleOperands(tokens, [TokenType.R, TokenType.V])
      if (ops !== null) {
        let x = ops[1].val as number
        if (x < 8) {
          return [0xf0 | x, 0x75]
        }
      }
      ops = this.assembleOperands(tokens, [TokenType.V, TokenType.R])
      if (ops !== null) {
        let x = ops[0].val as number
        if (x < 8) {
          return [0xf0 | x, 0x85]
        }
      }
    }
    if (this.extended) {
      ops = this.assembleOperands(tokens, [TokenType.ASCII, TokenType.V])
      if (ops !== null) {
        let x = ops[1].val as number
        return [0xf0 | x, 0x94]
      }
    }
    panic("illegal instruction")
  }
  assembleASCII = (tokens: Token[]) => {
    let b: number[] = []
    const a = this
    if (!a.extended) {
      panic("illegal instruction")
    }
    for (let t of tokens) {
      let op = a.assembleOperand(t)

      if (op.typ !== TokenType.TEXT) {
        panic("expected ascii string")
      }
      // loop over each byte in the string, write the ascii table value
      for (let c of op.val as string) {
        if (!asciiTable.includes(c)) {
          panic("invalid CHIP-8E ascii character")
        } else {
          b = append(b, c.charCodeAt(0))
        }
      }
    }
    return b
  }
  assembleBYTE = (tokens: Token[]) => {
    let b: number[] = []
    const a = this
    for (let t of tokens) {
      let op = a.assembleOperand(t)
      switch (op.typ) {
        case TokenType.LIT:
          if ((op.val as number) > 0xff) {
            panic("invalid byte")
          }
          b = append(b, t.val as number)
          break
        case TokenType.TEXT:
          b = append(
            b,
            (op.val as string).split("").map(v => v.charCodeAt(0)),
          )
          break
      }
    }
    return b
  }
  assembleWORD = (tokens: Token[]) => {
    let b: number[] = []
    const a = this
    for (let t of tokens) {
      let op = a.assembleOperand(t)
      if (op.typ !== TokenType.LIT || (op.val as number) > 0xffff) {
        panic("invalid word")
      }
      let msb = ((op.val as number) >> 8) & 0xff
      let lsb = op.val as number & 0xff

      // store msb first
      b = append(b, [msb, lsb])
    }
    return b
  }
  assembleALIGN = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.LIT])
    if (ops !== null) {
      let n = ops[0].val as number

      if ((n & (n - 1)) === 0) {
        let offset = this.rom.byteLength & (n - 1)
        let pad = n - offset

        // reserve pad bytes to meet alignment
        return new Array(pad).fill(0)
      }
    }
    panic("illegal alignment")
  }
  assemblePAD = (tokens: Token[]) => {
    let ops = this.assembleOperands(tokens, [TokenType.LIT])
    if (ops !== null) {
      let n = ops[0].val as number
      if (n < 0x1000 - this.rom.byteLength) {
        return new Array(n).fill(0)
      }
    }
    panic("illegal size")
  }
}
export const asciiTable = "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_ !\"#$%&'()*+,-./0123456789:;<=>?"
function bytesToUpper(buf: ArrayBuffer) {
  let view = new DataView(buf)
  for (let i = 0; i < buf.byteLength; i++) {
    let v = view.getUint8(i)
    if (v >= 97 && v <= 122) {
      view.setUint8(i, v - 32)
    }
  }
  return view.buffer
}
export function buildAsm(program: ArrayBuffer, etiMode: boolean): Assembly {
  const asm = new Assembly(etiMode)
  let base = etiMode ? 0x600 : 0x200
  let line = 1

  program = bytesToUpper(program)
  let scanner = new BufScanner(program)
  for (; scanner.scan(); line++) {
    asm.assemble(new TokenScanner(scanner.bytes as number[]))
  }
  let romView = new DataView(asm.rom)
  // resolve all label addresses
  for (let [address, label] of Object.entries(asm.unresolved)) {
    if (label in asm.labels) {
      const t = asm.labels[label]
      if (t.typ !== TokenType.LIT) {
        panic("label does not resolve to address!")
      }
      let msb = (t.val as number) >> 8
      let lsb = t.val as number & 0xff
      romView.setUint8(Number(address), msb | (romView.getUint8(Number(address)) & 0xf0))
      // asm.rom[address] = msb | (asm.rom[address] & 0xf0)
      romView.setUint8(Number(address) + 1, lsb)
      // asm.rom[address + 1] = lsb

      // delete the unresolved Address
      delete asm.unresolved[Number(address)]
    }
  }
  // clear the line number as we're done assembling
  line = 0
  // if there are any unresolved addresses, panic
  for (let label of Object.values(asm.unresolved)) {
    panic("unresolved label: " + label)
  }
  // drop the first 512 bytes from the rom
  asm.rom = asm.rom.slice(base)
  // done
  return asm
}
export function LoadROM(program: ArrayBuffer, eti: boolean): VM {
  // ETI-660 roms begin at 0x600
  let base = eti ? 0x600 : 0x200
  // make sure the program fits within 4k
  if (program.byteLength > 0x1000 - base) {
    panic("Program too large to fit in memory!")
  }
  // initialize any data that doesn't Reset()

  let vm = new VM(eti)
  vm.size = program.byteLength
  vm.base = base
  vm.speed = 700
  const romView = new DataView(vm.rom.buffer)
  const programView = new DataView(program)
  // copy the RCA 1802 512 byte ROM into the CHIP-8 followed by the program
  for (let i = 0; i < emulatorROM.length; i++) {
    romView.setUint8(i, emulatorROM[i])
  }
  for (let i = emulatorROM.length; i - emulatorROM.length < program.byteLength; i++) {
    let v = programView.getUint8(i - emulatorROM.length)
    romView.setUint8(i, v)
  }
  // reset the VM memory
  vm.reset()

  return vm
}
export function loadAssembly(asm: Assembly, etiMode: boolean): VM {
  return LoadROM(asm.rom, etiMode)
}
export function bufPushItems(buf: ArrayBuffer, items: number[]) {
  let newBuf = new ArrayBuffer(buf.byteLength + items.length)
  let bufView = new DataView(buf)
  let newBufView = new DataView(newBuf)
  for (let i = 0; i < buf.byteLength; i++) {
    newBufView.setUint8(i, bufView.getUint8(i))
    // newBuf[i] = buf[i]
  }
  for (let i = buf.byteLength; i - buf.byteLength < items.length; i++) {
    newBufView.setUint8(i, items[i - buf.byteLength])
    // newBuf[i] = items[i]
  }
  return newBuf
}

export function len(arr: Array<any>) {
  return arr.length
}
export function append<T>(arr: Array<T>, items: T | T[]) {
  Array.isArray(items) ? arr.push(...items) : arr.push(items)
  return arr
}
export function panic(msg: string): never {
  throw new Error(msg)
}
export function uint<T>(a: T) {
  return a
}
export const int = uint
export const byte = uint
