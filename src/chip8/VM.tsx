import { panic, int, uint, byte } from "./Assembly"
import _ from "lodash"
export default class VM {
  rom: ArrayBuffer = new Uint8Array(0x1000).buffer
  memory: ArrayBuffer = new Uint8Array(0x1000).buffer
  // 视频区域 64x32
  video: ArrayBuffer = new Uint8Array(0x440).buffer
  stack: ArrayBuffer = new Uint32Array(16).buffer
  sp: number = 0 // 栈指针
  pc: number = 0 // 程序 counter
  // 程序起始地址
  base: number
  etiMode: boolean
  size: number = 0 // rom size
  // I is the address register.
  i: number = 0 // address register
  //16 个寄存器
  v: ArrayBuffer = new Uint8Array(0x10).buffer
  // R are the 8, HP-RPL user flags.
  r: ArrayBuffer = new Uint8Array(0x8).buffer
  // DT is the delay timer register. It is set to a time (in ns) in the
  // future and compared against the current time.
  dt: number = 0
  // ST is the sound timer register. It is set to a time (in ns) in the
  // future and compared against the current time.
  st: number = 0
  // Clock is the time (in ns) when emulation begins.
  clock: number = 0

  // Cycles is how many clock cycles have been processed. It is assumed
  // one clock cycle per instruction.
  cycles: number = 0

  // Speed is how many cycles (instructions) should execute per second.
  // By default this is 700. The RCA CDP1802 ran at 1.76 MHz, with each
  // instruction taking 16-24 clock cycles, which is a bit over 70,000
  // instructions per second.
  speed: number = 0
  // W is the wait key (V-register) pointer. When waiting for a key
  // to be pressed, it will be set to &V[0..F].
  w?: number
  // Keys hold the current state for the 16-key pad keys.
  keys: boolean[] = new Array(16).fill(false)
  // Number of bytes per scan line. This is 8 in low mode and 16 when high.
  pitch: number = 0
  memoryView: DataView
  videoView: DataView
  stackView: DataView
  constructor(etiMode: boolean) {
    this.etiMode = etiMode
    this.base = this.etiMode ? 0x200 : 0x600
    this.memoryView = new DataView(this.memory)
    this.videoView = new DataView(this.video)
    this.stackView = new DataView(this.stack)
  }
  fetch = () => {
    const vm = this
    let i = vm.pc
    // advance the program counter
    vm.pc += 2
    // return the 16-bit instruction
    return (this.memoryView.getUint8(i) << 8) | this.memoryView.getUint8(i + 1)
  }
  step = () => {
    const vm = this
    if (vm.w) {
      return
    }

    // fetch the next instruction
    let inst = vm.fetch()

    // 12-bit address operand
    let a = inst & 0xfff

    // byte and nibble operands
    let b = inst & 0xff
    let n = inst & 0xf

    // x and y register operands
    let x = (inst >> 8) & 0xf
    let y = (inst >> 4) & 0xf

    // instruction decoding
    if (inst === 0x00e0) {
      vm.cls()
    } else if (inst === 0x00ee) {
      vm.ret()
    } else if (inst === 0x00fb) {
      vm.scrollRight()
    } else if (inst === 0x00fc) {
      vm.scrollLeft()
    } else if (inst === 0x00fd) {
      vm.exit()
    } else if (inst === 0x00fe) {
      vm.low()
    } else if (inst === 0x00ff) {
      vm.high()
    } else if ((inst & 0xfff0) === 0x00b0) {
      vm.scrollUp(n)
    } else if ((inst & 0xfff0) === 0x00c0) {
      vm.scrollDown(n)
    } else if ((inst & 0xf000) === 0x0000) {
      vm.sys(a)
    } else if ((inst & 0xf000) === 0x1000) {
      vm.jump(a)
    } else if ((inst & 0xf000) === 0x2000) {
      vm.call(a)
    } else if ((inst & 0xf000) === 0x3000) {
      vm.skipIf(x, b)
    } else if ((inst & 0xf000) === 0x4000) {
      vm.skipIfNot(x, b)
    } else if ((inst & 0xf00f) === 0x5000) {
      vm.skipIfXY(x, y)
    } else if ((inst & 0xf00f) === 0x5001) {
      vm.skipIfGreater(x, y)
    } else if ((inst & 0xf00f) === 0x5002) {
      vm.skipIfLess(x, y)
    } else if ((inst & 0xf000) === 0x6000) {
      vm.loadX(x, b)
    } else if ((inst & 0xf000) === 0x7000) {
      vm.addX(x, b)
    } else if ((inst & 0xf00f) === 0x8000) {
      vm.loadXY(x, y)
    } else if ((inst & 0xf00f) === 0x8001) {
      vm.or(x, y)
    } else if ((inst & 0xf00f) === 0x8002) {
      vm.and(x, y)
    } else if ((inst & 0xf00f) === 0x8003) {
      vm.xor(x, y)
    } else if ((inst & 0xf00f) === 0x8004) {
      vm.addXY(x, y)
    } else if ((inst & 0xf00f) === 0x8005) {
      vm.subXY(x, y)
    } else if ((inst & 0xf00f) === 0x8006) {
      vm.shr(x)
    } else if ((inst & 0xf00f) === 0x8007) {
      vm.subYX(x, y)
    } else if ((inst & 0xf00f) === 0x800e) {
      vm.shl(x)
    } else if ((inst & 0xf00f) === 0x9000) {
      vm.skipIfNotXY(x, y)
    } else if ((inst & 0xf00f) === 0x9001) {
      vm.mulXY(x, y)
    } else if ((inst & 0xf00f) === 0x9002) {
      vm.divXY(x, y)
    } else if ((inst & 0xf0ff) === 0xf033) {
      vm.bcd(x)
    } else if ((inst & 0xf00f) === 0x9003) {
      vm.bcd16(x, y)
    } else if ((inst & 0xf000) === 0xa000) {
      vm.loadI(a)
    } else if ((inst & 0xf000) === 0xb000) {
      vm.jumpV0(a)
    } else if ((inst & 0xf000) === 0xc000) {
      vm.loadRandom(x, b)
    } else if ((inst & 0xf00f) === 0xd000) {
      vm.drawSpriteEx(x, y)
    } else if ((inst & 0xf000) === 0xd000) {
      vm.drawSprite(x, y, n)
    } else if ((inst & 0xf0ff) === 0xe09e) {
      vm.skipIfPressed(x)
    } else if ((inst & 0xf0ff) === 0xe0a1) {
      vm.skipIfNotPressed(x)
    } else if ((inst & 0xf0ff) === 0xf007) {
      vm.loadXDT(x)
    } else if ((inst & 0xf0ff) === 0xf00a) {
      vm.loadXK(x)
    } else if ((inst & 0xf0ff) === 0xf015) {
      vm.loadDTX(x)
    } else if ((inst & 0xf0ff) === 0xf018) {
      vm.loadSTX(x)
    } else if ((inst & 0xf0ff) === 0xf01e) {
      vm.addIX(x)
    } else if ((inst & 0xf0ff) === 0xf029) {
      vm.loadF(x)
    } else if ((inst & 0xf0ff) === 0xf030) {
      vm.loadHF(x)
    } else if ((inst & 0xf0ff) === 0xf055) {
      vm.saveRegs(x)
    } else if ((inst & 0xf0ff) === 0xf065) {
      vm.loadRegs(x)
    } else if ((inst & 0xf0ff) === 0xf075) {
      vm.storeR(x)
    } else if ((inst & 0xf0ff) === 0xf085) {
      vm.readR(x)
    } else if ((inst & 0xf0ff) === 0xf094) {
      vm.loadASCII(x)
    } else {
      return new Error("Invalid opcode: 0x" + inst.toString(16))
    }

    // increment the cycle count
    vm.cycles++

    return null
  }
  reset = () => {
    const vm = this
    let romView = new DataView(vm.rom)
    for (let i = 0; i < vm.rom.byteLength; i++) {
      this.memoryView.setUint8(i, romView.getUint8(i))
    }
    // reset video memory
    vm.video = new Uint8Array(0x440).buffer
    this.videoView = new DataView(vm.video)
    // reset keys
    vm.keys = new Array(16).fill(false)

    // reset program counter and stack pointer
    vm.pc = vm.base
    vm.sp = 0

    // reset address register
    vm.i = 0

    // reset virtual registers and user flags
    vm.v = new Uint8Array(0x10).buffer
    vm.r = new Uint8Array(0x8).buffer

    // reset timer registers
    vm.dt = 0
    vm.st = 0

    // reset the clock and cycles executed
    vm.clock = new Date().getTime()
    vm.cycles = 0

    // not waiting for a key
    vm.w = undefined

    // not in high-res mode
    vm.pitch = 8
    console.log(new Uint8Array(vm.memory))
  }
  sys = (_a: number) => {
    // panic("not impl sys")
  }
  cls = () => {
    const vm = this
    for (let i = 0; i < vm.video.byteLength; i++) {
      vm.videoView.setUint8(i, 0)
    }
  }
  call(address: number) {
    const vm = this
    if (vm.sp >= vm.stack.byteLength) {
      panic("Stack overflow!")
    }
    const view = new DataView(vm.stack)
    // post increment
    view.setUint8(vm.sp, vm.pc)
    vm.sp++

    // jump to address
    vm.pc = address
  }
  ret = () => {
    const vm = this
    if (vm.sp === 0) {
      panic("Stack underflow!")
    }

    // pre-decrement
    vm.sp--
    vm.pc = this.stackView.getUint8(vm.sp)
  }
  exit() {
    this.pc -= 2
  }
  low() {
    this.pitch = 8
  }
  high() {
    this.pitch = 16
  }
  scrollUp = (n: number) => {
    if (this.pitch === 8) {
      n >>= 1
    }
    let begin = n * this.pitch
    // shift this.video .byteLength pixels up
    for (let i = 0; i + begin < this.video.byteLength; i++) {
      this.videoView.setUint8(i, this.videoView.getUint8(i + begin))
    }

    // wipe the bottom-most pixels
    for (let i = 0x400 - n * this.pitch; i < 0x400; i++) {
      this.videoView.setUint8(i, 0)
    }
  }
  scrollDown = (n: number) => {
    if (this.pitch === 8) {
      n >>= 1
    }
    let begin = n * this.pitch
    // shift all the pixels down
    for (let i = 0; i + begin < this.video.byteLength; i++) {
      this.videoView.setUint8(i + begin, this.videoView.getUint8(i))
    }

    // wipe the top-most pixels
    for (let i = 0; i < n * this.pitch; i++) {
      this.videoView.setUint8(i, 0)
    }
  }
  scrollRight = () => {
    let shift = uint(this.pitch >> 2)

    for (let i = 0x3ff; i >= 0; i--) {
      this.videoView.setUint8(i, this.videoView.getUint8(i) >> shift)

      // get the lower bits from the previous byte
      if ((i & (this.pitch - 1)) > 0) {
        this.videoView.setUint8(
          i,
          this.videoView.getUint8(i) | (this.videoView.getUint8(i - 1) << (8 - shift)),
        )
      }
    }
  }
  scrollLeft = () => {
    let shift = uint(this.pitch >> 2)

    for (let i = 0; i < 0x400; i++) {
      this.videoView.setUint8(i, this.videoView.getUint8(i) << shift)
      // get the upper bits from the next byte
      if ((i & (this.pitch - 1)) < this.pitch - 1) {
        this.videoView.setUint8(
          i,
          this.videoView.getUint8(i) | (this.videoView.getUint8(i + 1) >> (8 - shift)),
        )
      }
    }
  }
  jump(address: number) {
    this.pc = address
  }
  jumpV0(address: number) {
    this.pc = address + uint(new Uint8Array(this.v)[0])
  }
  skipIf(x: number, b: number) {
    if (new Uint8Array(this.v)[x] === b) {
      this.pc += 2
    }
  }
  skipIfNot(x: number, b: number) {
    if (new Uint8Array(this.v)[x] === b) {
      this.pc += 2
    }
  }
  skipIfXY(x: number, y: number) {
    const v = new Uint8Array(this.v)
    if (v[x] === v[y]) {
      this.pc += 2
    }
  }
  skipIfNotXY(x: number, y: number) {
    const v = new Uint8Array(this.v)
    if (v[x] !== v[y]) {
      this.pc += 2
    }
  }

  // Skip next instruction if vx > vy.
  skipIfGreater(x: number, y: number) {
    const v = new Uint8Array(this.v)
    if (v[x] > v[y]) {
      this.pc += 2
    }
  }

  // Skip next instruction if vx < vy.
  skipIfLess(x: number, y: number) {
    const v = new Uint8Array(this.v)
    if (v[x] < v[y]) {
      this.pc += 2
    }
  }

  // Skip next instruction if key(vx) is pressed.
  skipIfPressed(x: number) {
    const v = new Uint8Array(this.v)
    if (this.keys[v[x]]) {
      this.pc += 2
    }
  }

  // Skip next instruction if key(vx) is not pressed.
  skipIfNotPressed(x: number) {
    const v = new Uint8Array(this.v)

    if (!this.keys[v[x]]) {
      this.pc += 2
    }
  }

  // Load n into vx.
  loadX(x: number, b: number) {
    const v = new Uint8Array(this.v)
    v[x] = b
  }

  // Load y into vx.
  loadXY(x: number, y: number) {
    const v = new Uint8Array(this.v)
    v[x] = v[y]
  }

  // Load delay timer into vx.
  loadXDT(x: number) {
    const v = new Uint8Array(this.v)
    v[x] = this.getDelayTimer()
  }

  // Load vx into delay timer.
  loadDTX(x: number) {
    const v = new Uint8Array(this.v)
    this.dt = new Date().getTime() + (int(v[x]) * 1000) / 60
  }

  // Load vx into sound timer.
  loadSTX(x: number) {
    const v = new Uint8Array(this.v)
    this.st = new Date().getTime() + (int(v[x]) * 1000) / 60
  }

  // Load vx with next key hit (blocking).
  loadXK(x: number) {
    const v = new Uint8Array(this.v)
    this.w = v[x]
  }

  // Load address register.
  loadI(address: number) {
    this.i = address
  }

  // Load address with 8-bit, BCD of vx.
  bcd(x: number) {
    const v = new Uint8Array(this.v)

    let n = uint(v[x])
    let b = uint(0)
    // perform 8 shifts
    for (let i = uint(0); i < 8; i++) {
      if (((b >> 0) & 0xf) >= 5) {
        b += 3
      }
      if (((b >> 4) & 0xf0) >= 5) {
        b += 3 << 4
      }
      if (((b >> 8) & 0xf) >= 5) {
        b += 3 << 8
      }

      // apply shift, pull next bit
      b = (b << 1) | ((n >> (7 - i)) & 1)
    }

    // write to memory
    this.memoryView.setUint8(this.i + 0, (b >> 8) & 0xf)
    this.memoryView.setUint8(this.i + 1, (b >> 4) & 0xf)
    this.memoryView.setUint8(this.i + 2, (b >> 0) & 0xf)
  }

  // Load address with 16-bit, BCD of vx, vy.
  bcd16(x: number, y: number) {
    const v = new Uint8Array(this.v)
    let n = (uint(v[x]) << 8) | uint(v[y])
    let b = uint(0)

    // perform 16 shifts
    for (let i = uint(0); i < 16; i++) {
      if (((b >> 0) & 0xf) >= 5) {
        b += 3
      }
      if (((b >> 4) & 0xf) >= 5) {
        b += 3 << 4
      }
      if (((b >> 8) & 0xf) >= 5) {
        b += 3 << 8
      }
      if (((b >> 12) & 0xf) >= 5) {
        b += 3 << 12
      }
      if (((b >> 16) & 0xf) >= 5) {
        b += 3 << 16
      }

      // apply shift, pull next bit
      b = (b << 1) | ((n >> (15 - i)) & 1)
    }

    // write to memory
    this.memoryView.setUint8(this.i + 0, (b >> 16) & 0xf)
    this.memoryView.setUint8(this.i + 1, (b >> 12) & 0xf)
    this.memoryView.setUint8(this.i + 2, (b >> 8) & 0xf)
    this.memoryView.setUint8(this.i + 3, (b >> 4) & 0xf)
    this.memoryView.setUint8(this.i + 4, (b >> 0) & 0xf)
  }

  // Load font sprite for vx into I.
  loadF(x: number) {
    const v = new Uint8Array(this.v)

    this.i = uint(v[x]) * 5
  }

  // Load high font sprite for vx into I.
  loadHF(x: number) {
    const v = new Uint8Array(this.v)

    this.i = 0x50 + uint(v[x]) * 10
  }

  // Load ASCII font sprite for vx into I and length into v0.
  loadASCII(x: number) {
    const v = new Uint8Array(this.v)
    let c = 0x100 + int(v[x]) * 3
    const memory = new Uint8Array(this.memory)
    // AB CD EF are the bytes in memory, but are unpacked as
    // EF CD AB where E is the length and F-B are the rows
    const ab = memory[c]
    const cd = memory[c + 1]
    const ef = memory[c + 2]
    // write the byte patters of each nibble to character memory
    memory[0x1c0] = memory[0xf0 + (ef & 0xf)]
    memory[0x1c1] = memory[0xf0 + (cd >> 4)]
    memory[0x1c2] = memory[0xf0 + (cd & 0xf)]
    memory[0x1c3] = memory[0xf0 + (ab >> 4)]
    memory[0x1c4] = memory[0xf0 + (ab & 0xf)]

    // set the length to v0
    v[0] = ef >> 4

    // point I to where the ascii character was unpacked
    this.i = 0x1c0
  }

  // Bitwise or vx with vy into vx.
  or(x: number, y: number) {
    const v = new Uint8Array(this.v)
    v[x] |= v[y]
  }

  // Bitwise and vx with vy into vx.
  and(x: number, y: number) {
    const v = new Uint8Array(this.v)

    v[x] &= v[y]
  }

  // Bitwise xor vx with vy into vx.
  xor(x: number, y: number) {
    const v = new Uint8Array(this.v)

    v[x] ^= v[y]
  }

  // Bitwise shift vx 1 bit, set carry to MSB of vx before shift.
  shl(x: number) {
    const v = new Uint8Array(this.v)

    v[0xf] = v[x] >> 7
    v[x] <<= 1
  }

  // Bitwise shift vx 1 bit, set carry to LSB of vx before shift.
  shr(x: number) {
    const v = new Uint8Array(this.v)

    v[0xf] = v[x] & 1
    v[x] >>= 1
  }

  // Add n to vx.
  addX(x: number, b: number) {
    const v = new Uint8Array(this.v)

    v[x] += b
  }

  // Add vy to vx and set carry.
  addXY(x: number, y: number) {
    const v = new Uint8Array(this.v)

    v[x] += v[y]

    if (v[x] < v[y]) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }
  }

  // Add v to i.
  addIX(x: number) {
    const v = new Uint8Array(this.v)
    this.i += uint(v[x])
    if (this.i >= 0x1000) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }
  }

  // Subtract vy from vx, set carry if no borrow.
  subXY(x: number, y: number) {
    const v = new Uint8Array(this.v)

    if (v[x] >= v[y]) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }

    v[x] -= v[y]
  }

  // Subtract vx from vy and store in vx, set carry if no borrow.
  subYX(x: number, y: number) {
    const v = new Uint8Array(this.v)

    if (v[y] >= v[x]) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }

    v[x] = v[y] - v[x]
  }

  // Multiply vx and vy; vf contains the most significant byte.
  mulXY(x: number, y: number) {
    const v = new Uint8Array(this.v)

    let r = uint(v[x]) * uint(v[y])

    // most significant byte to vf
    v[0xf] = byte((r >> 8) & 0xff)
    v[x] = byte(r & 0xff)
  }

  // Divide vx by vy; vf is set to the remainder.
  divXY(x: number, y: number) {
    const v = new Uint8Array(this.v)

    v[x] = v[x] / v[y]
    v[0xf] = v[x] % v[y]
  }

  // Load a random number & n into vx.
  loadRandom(x: number, b: number) {
    const v = new Uint8Array(this.v)

    v[x] = byte(_.random(256) & int(b))
  }

  // Draw a sprite in memory to video at x,y with a height of n.
  draw(a: number, x: number, y: number, n: number): number {
    let c = byte(0)
    // byte offset and bit index
    let b = uint(x >> 3)
    let i = uint(x & 7)

    // which scan line will it render on
    let pos = int(y) * this.pitch
    const memory = new Uint8Array(this.memory)
    const video = new Uint8Array(this.video)
    // draw each row of the sprite
    for (let j = 0; j < n; j++) {
      const s = memory[a + j]
      if (pos >= 0) {
        let n = uint(pos) + b

        // stop once outside of video memory
        if ((n >= 256 && this.pitch === 8) || (n >= 1024 && this.pitch === 16)) {
          break
        }

        // origin pixel values
        let b0 = video[n]
        let b1 = video[n + 1]

        // xor pixels
        video[n] ^= s >> i

        // are there pixels overlapping next byte?
        if (i > 0) {
          video[n + 1] ^= s << (8 - i)
        }

        // were any pixels turned off?
        c |= b0 &= ~video[n]
        c |= b1 & ~video[n + 1]
      }

      // next scan line
      pos += this.pitch
    }

    // non-zero if there was a collision
    return c
  }

  // Draw a sprite at I to video memory at vx, vy.
  drawSprite(x: number, y: number, n: number) {
    const v = new Uint8Array(this.v)

    if (this.draw(this.i, int(v[x]), int(v[y]), n) === 0) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }
  }

  // Draw an extended 16x16 sprite at I to video memory to vx, vy.
  drawSpriteEx(x: number, y: number) {
    const v = new Uint8Array(this.v)

    let c = byte(0)
    let a = this.i

    // draw sprite columns
    for (let i = byte(0); i < 16; i++) {
      c |= this.draw(a + uint(i << 1), int(v[x]), int(v[y] + i), 1)

      if (this.pitch === 16) {
        c |= this.draw(a + uint(i << 1) + 1, int(v[x] + 8), int(v[y] + i), 1)
      }
    }

    // set the collision flag
    if (c === 0) {
      v[0xf] = 1
    } else {
      v[0xf] = 0
    }
  }

  // Save registers v0..vx to I.
  saveRegs(x: number) {
    const v = new Uint8Array(this.v)
    const memory = new Uint8Array(this.memory)

    for (let i = uint(0); i <= x; i++) {
      if (this.i + i < 0x1000) {
        memory[this.i + i] = v[i]
      }
    }
  }

  // Load registers v0..vx from I.
  loadRegs(x: number) {
    const v = new Uint8Array(this.v)
    const memory = new Uint8Array(this.memory)

    for (let i = uint(0); i <= x; i++) {
      if (this.i + i < 0x1000) {
        v[i] = memory[this.i + i]
      } else {
        v[i] = 0
      }
    }
  }

  // Store v0..v7 in the HP-RPL user flags.
  storeR(x: number) {
    const v = new Uint8Array(this.v)
    const r = new Uint8Array(this.r)
    for (let i = 0; i < x + 1; i++) {
      r[i] = v[x + 1]
    }
  }

  // Read the HP-RPL user flags into v0..v7.
  readR(x: number) {
    const v = new Uint8Array(this.v)
    const r = new Uint8Array(this.r)
    for (let i = 0; i < x + 1; i++) {
      v[i] = r[i]
    }
  }
  getDelayTimer(): number {
    let now = new Date().getTime()

    if (now < this.dt) {
      return uint(((this.dt - now) * 60) / 1000)
    }

    return 0
  }
}
