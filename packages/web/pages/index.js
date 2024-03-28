import React from 'react'
import { Provider } from 'mobx-react'
import { getSnapshot } from 'mobx-state-tree'
import { initStore } from '../store'
import CanvasBoard from '../components/CanvasBoard'
import GameHud from '../components/GameHud'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Modal from '../components/Modal'
import Layout from '../components/Layout'
import ErrorMessage from '../components/ErrorMessage'
import { initGA, logPageView } from '../utils/analytics'
import BrowserStorage from 'store'
import get from 'just-safe-get'

export default class Counter extends React.Component {
  static getInitialProps(ctx) {
    const isServer = !!ctx.req
    const store = initStore(isServer)

    // Redirect to maintenance page if maintenance flag is set
    if (process.env.MAINTENANCE === 'yes') {
      ctx.res.writeHead(303, { Location: '/maintenance' })
      ctx.res.end()
      ctx.res.finished = true
    }

    return { initialState: getSnapshot(store), isServer }
  }

  constructor(props) {
    super(props)
    this.store = initStore(props.isServer, props.initialState)
  }

  componentDidMount() {
    // Check if the user has done the tutorial, otherwise open the info modal
    const bsData = BrowserStorage.get('satoshis.place')
    const isTutorialDone = get(bsData, 'isTutorialDone')
    if (!isTutorialDone) {
      this.store.openInfoModal()
      BrowserStorage.set('satoshis.place', { isTutorialDone: true })
    }

    let { clientWidth, clientHeight } = this.refs['content']
    // Make canvas responsive to window resizing
    this.store.setClientWidthHeight({ width: clientWidth, height: clientHeight })
    // // Init keyboard press detectors
    window.addEventListener('resize', () => {
      let { clientWidth, clientHeight } = this.refs['content']
      this.store.setClientWidthHeight({ width: clientWidth, height: clientHeight })
      this.store.resizeCanvas(clientWidth, clientHeight)
    })
    // Let's check if the browser supports notifications
    if ("Notification" in window) {
      // Chrome Notifications
      Notification && Notification.requestPermission()
    }
    // Track google analytics
    if (!window.GA_INITIALIZED) {
      initGA()
      window.GA_INITIALIZED = true
    }
    logPageView()
    // Developer message
    console.log('')
    console.log('-------------------------------------------------------------------')
    console.log('Made with ⚡️ by Lightning K0ala - https://twitter.com/LightningK0ala')
    console.log('Source code: https://github.com/LightningK0ala/satoshis.place')
    console.log('-------------------------------------------------------------------')
    console.log('')
  }

  render() {
    return (
      <Layout>
        <Provider store={this.store}>
          <div className='wrapper'>
            <ErrorMessage />
            <Header className='header' />
            <div ref='content' className='content'>
              <CanvasBoard />
              <GameHud />
            </div>
            <Footer className='footer' />
            <Modal />
            <style jsx>{`
              .content {
                position: relative;
                display: flex;
                flex-grow: 1;
                justify-content: center;
                align-items: center;
              }
              .wrapper {
                display: flex;
                flex-direction: column;
                height: 100%;
              }
            `}</style>
          </div>
        </Provider>
      </Layout>
    )
  }
}
