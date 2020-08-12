import React, { Component } from "react"
import Assembly, { buildAsm, loadAssembly } from "./Assembly"
import style from "./chip8.module.scss"
import VM from "./VM"
interface Props {
  program: ArrayBuffer // 游戏源码
}
interface State {
  logs: string[]
}
type DefaultProps = {
  etiMode: boolean
}

export default class Chip8 extends Component<Props & DefaultProps, State> {
  asm?: Assembly
  vm?: VM
  videoTimer?: NodeJS.Timeout
  audioTimer?: NodeJS.Timeout
  programTimer?: NodeJS.Timeout
  screenRef = React.createRef<HTMLCanvasElement>()
  baseScale = 2
  screenW = 384
  screenH = 192
  paused = false
  static defaultProps: DefaultProps = {
    etiMode: false,
  }
  constructor(props: any) {
    super(props)
    this.state = this.getInitState()
  }
  componentDidMount() {
    this.log("CHIP-8, Copyright 2020 by Buffge")
    this.log("All rights reserved")
    if (this.props.etiMode) {
      this.log("Running in ETI-660 mode")
    }
    this.log("Loading game...")
    this.vm = this.loadFile(this.props.program)
    this.log("program size: " + this.vm.size)
    //
    this.loop()
  }
  loop = () => {
    this.programTimer = setInterval(this.process, 1)
    this.videoTimer = setInterval(this.redraw, 1000 / 60)
    this.audioTimer = setInterval(this.updateSound, 1000 / 60)
    // @ts-ignore
    window.vm = this.vm
  }
  process = () => {
    const now = new Date().getTime()
    const vm = this.vm as VM
    const paused = this.paused
    // calculate how many cycles should have been executed
    let count = ~~(((now - vm.clock) * vm.speed) / 1000 / 60)
    // console.log(count, vm.cycles)
    // if paused, count cycles without stepping
    if (paused) {
      vm.cycles = count
    } else {
      // console.log(vm.cycles, count)
      while (vm.cycles < count) {
        let err = vm.step()
        if (err) {
          // console.log(err)
          return err
        }

        // if waiting for a key, catch up
        if (!vm.w) {
          vm.cycles = count
        }
      }
    }
    return
  }
  updateScreen = () => {}
  drawScreen = () => {
    const w = this.screenW
    const h = this.screenH
    const vm = this.vm as VM
    const cv2 = this.screenRef.current!.getContext("2d") as CanvasRenderingContext2D
    // const c1 = document.createElement("canvas")
    // const cv1 = c1.getContext("2d") as CanvasRenderingContext2D
    //设置线的颜色为黑色
    cv2.fillStyle = "rgba(143, 145, 133, 255)"
    cv2.fillRect(0, 0, this.screenW, this.screenH)
    let shift = 6 + (w >> 7)
    const videoView = new DataView(vm.video)
    // draw all the pixels
    for (let p = 0; p < w * h; p++) {
      if (p >> 3 < vm.video.byteLength && (videoView.getUint8(p >> 3) & (0x80 >> (p & 7))) !== 0) {
        let x = p & (w - 1)
        let y = p >> shift
        // render the pixel to the screen
        cv2.fillRect(x, y, this.baseScale * 3, this.baseScale * 3)
      }
    }
  }
  redraw = () => {
    const { updateScreen, drawScreen } = this
    updateScreen()

    // clear the renderer
    // 设置背景色

    // Renderer.SetDrawColor(32, 42, 53, 255)
    // Renderer.Clear()

    // frame the screen, instructions, log, and registers
    // frame(8, 8, 386, 194)
    // frame(8, 208, 386, 164)
    // frame(402, 8, 204, 194)
    // frame(402, 208, 204, 164)

    // draw the screen, log, instructions, and registers
    drawScreen()
    // drawLog()
    // drawInstructions()
    // drawRegisters()

    // show it
    // Renderer.Present()
  }
  updateSound = () => {}
  getInitState = (): State => {
    return {
      logs: [],
    }
  }
  // 输出日志
  log = (msg: string) => {
    this.setState({
      logs: [...this.state.logs, msg],
    })
  }
  loadFile = (program: ArrayBuffer) => {
    const { etiMode } = this.props
    this.asm = buildAsm(program, etiMode)
    return loadAssembly(this.asm, etiMode)
  }
  loadRom = () => {}
  render() {
    return (
      <div className={style.main}>
        <canvas ref={this.screenRef} width={384} height={192} />
      </div>
    )
  }
}
