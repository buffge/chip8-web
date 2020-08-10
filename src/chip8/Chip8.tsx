import React, { Component } from 'react'
import style from './chip8.module.scss'
import Assembly, { buildAsm, loadAssembly } from './Assembly'
import { message } from 'antd'
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
  static defaultProps: DefaultProps = {
    etiMode: false,
  }
  constructor(props: any) {
    super(props)
    this.state = this.getInitState()
  }
  componentDidMount() {
    this.log('CHIP-8, Copyright 2020 by Buffge')
    this.log('All rights reserved')
    if (this.props.etiMode) {
      this.log('Running in ETI-660 mode')
    }
    this.log('Loading game...')
    this.loadFile(this.props.program)
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
    try {
      this.asm = buildAsm(program, etiMode)
      loadAssembly(this.asm, etiMode)
    } catch (err) {
      message.error(err)
    }
  }
  loadRom = () => {}
  render() {
    return <div className={style.main}> </div>
  }
}
