import { Component } from 'react'
import { inject, observer } from 'mobx-react'
import BitcoinSpinner from '../components/BitcoinSpinner'

@inject('store')
@observer
export default class CanvasBoard extends Component {
  /**
   * Handle when component mounts
   */
  componentDidMount() {
    const { initSocket, setDomRef, getSettings, resizeCanvas } = this.props.store
    // Init Socket
    initSocket()
    // Set dom reference for initialization after settings response
    setDomRef(this.refs['pixi-dom-container'])
    // Get latest settings from api, board will init on response
    getSettings()
  }

  /**
   * Render it baby!
   */
  render() {
    const { isFirstLoadComplete } = this.props.store
    return (
      <div style={{ backgroundColor: 'white' }}>
        <div
          ref='pixi-dom-container'
          style={{
            position: 'relative',
            display: isFirstLoadComplete ? 'block' : 'none'
          }}
        />
        {
          !isFirstLoadComplete ? <BitcoinSpinner /> : null
        }
      </div>
    )
  }
}
