import React, { Component } from 'react'
import Chip8 from './chip8/Chip8'
import style from './assets/sass/app.module.scss'
interface Props {}
interface State {
  program?: ArrayBuffer
}
type DefaultProps = {}
export default class App extends Component<Props & DefaultProps, State> {
  static defaultProps: DefaultProps
  constructor(props: any) {
    super(props)
    this.state = this.getInitState()
  }
  getInitState = (): State => {
    return {}
  }
  render() {
    const { program } = this.state
    return (
      <div className={style.main}>
        <input
          type={'file'}
          onChange={evt => {
            const file = evt.target.files![0]
            let reader = new FileReader()
            reader.onload = () => {
              this.setState({
                program: reader.result as ArrayBuffer,
              })
            }
            reader.readAsArrayBuffer(file)
          }}
        />
        <div className={style.gameCenter}>{program && <Chip8 program={program} />}</div>
      </div>
    )
  }
}
