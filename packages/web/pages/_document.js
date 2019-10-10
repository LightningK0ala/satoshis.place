// _document is only rendered on the server side and not on the client side
// Event handlers like onClick can't be added to this file

import Document, { Head, Main, NextScript } from 'next/document'
import { ServerStyleSheet } from 'styled-components'

export default class MyDocument extends Document {
  static async getInitialProps(ctx) {
    // Styled components support
    const sheet = new ServerStyleSheet()
    const page = ctx.renderPage(App => props => sheet.collectStyles(<App {...props} />))
    const styleTags = sheet.getStyleElement()
    // Context
    const initialProps = await Document.getInitialProps(ctx)
    return { ...page, styleTags, ...initialProps }
  }
  render() {
    return (
      <html className='stretch'>
        <Head>
          <meta charSet="utf-8" />
          <meta name='description' content='A Bitcoin Lightning Network powered online multiplayer game inspired by Reddit Place and the million dollar homepage.' />
          <meta name='viewport' content='user-scalable=0, width=device-width, initial-scale=1' />
          <title>Satoshi's Place</title>
          <link href='https://fonts.googleapis.com/css?family=Nunito+Sans:300,400,700,800' rel='stylesheet' />
          <link rel='icon' type='image/png' href='/static/icon.png' />
          <link
            rel='stylesheet'
            href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
          />
          <style>{`
            * {
              font-family: Nunito Sans, sans-serif;
            }
            html, body {
              margin: 0;
              background-color: white;
              color: #666;
            }
            body, #__next, .stretch {
              height: 100%;
            }
            button, div {
              transition:all 0.3s ease;
            }
          `}</style>
          {this.props.styleTags}
        </Head>
        <body className='stretch'>
          <Main />
          <NextScript />
        </body>
      </html>
    )
  }
}
