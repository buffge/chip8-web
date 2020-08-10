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
  constructor(etiMode: boolean) {
    this.etiMode = etiMode
    this.base = this.etiMode ? 0x200 : 0x600
  }
  reset = () => {
    const vm = this
    let romView = new DataView(vm.rom)
    let memoryView = new DataView(vm.memory)
    console.log(new Uint8Array(vm.rom))
    console.log(new Uint8Array(vm.memory))
    for (let i = 0; i < vm.rom.byteLength; i++) {
      memoryView.setUint8(i, romView.getUint8(i))
    }
    // reset video memory
    vm.video = new Uint8Array(0x440).buffer

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
    vm.clock = new Date().getTime() * 1000
    vm.cycles = 0

    // not waiting for a key
    vm.w = undefined

    // not in high-res mode
    vm.pitch = 8
    console.log(new Uint8Array(vm.memory))
  }
}
