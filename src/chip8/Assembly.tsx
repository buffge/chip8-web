import VM from './VM'
import { Token, BufScanner, TokenScanner } from './scanner'

export default class Assembly {
  rom: ArrayBuffer = new Int8Array(1000)
  // Label mapping.
  labels: Record<string, Token> = {}
  // Addresses with unresolved labels.
  unresolved: Record<number, string> = {}
  base: number = 0x200
  // Super is true if using additional super CHIP-8 instructions.
  super: boolean = false
  // Extended is true if using additional CHIP-8E instructions.
  extended: boolean = false
  assemble = (s: TokenScanner) => {
    let t = s.scanToken()
  }
}
export const asciiTable = '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_ !"#$%&\'()*+,-./0123456789:;<=>?'

export function buildAsm(program: ArrayBuffer, etiMode: boolean): Assembly {
  const asm = new Assembly()
  asm.base = etiMode ? 0x200 : 0x600
  let line = 1
  let scanner = new BufScanner(program)
  for (; scanner.scan(); line++) {
    asm.assemble(new TokenScanner(scanner.bytes as number[]))
  }
  return asm
}
export function loadAssembly(_asm: Assembly, etiMode: boolean): VM {
  return new VM(etiMode)
}
