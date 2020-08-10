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
  }
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
    return <div className={style.main}> </div>
  }
}
