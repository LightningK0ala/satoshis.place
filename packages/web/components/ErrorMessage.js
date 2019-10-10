import { Component } from 'react'
import { inject, observer } from 'mobx-react'
import styled from 'styled-components'
import { Box } from 'rebass'

/**
|--------------------------------------------------
| Sub Components
|--------------------------------------------------
*/
const Wrapper = styled(Box)`
  z-index: 100;
  border-top-right-radius: 5px;
  top: 0;
  left: 0;
  min-width: 252px;
  padding: 0 12px;
  background-color: #ffd6d6;
  box-shadow: 1px -1px 1px rgba(0,0,0,0.5);
  border-bottom: 1px solid lightgray;
`

const Message = props =>
  <p className='text'>
    {props.message}
    <style jsx>{`
      .text {
        color: #ff4444;
        user-select: none;
        cursor: inherit;
        font-size: 10pt;
        user-select: none;
      }
    `}</style>
  </p>

/**
|--------------------------------------------------
| Main Component
|--------------------------------------------------
*/
@inject('store')
@observer
class ErrorMessage extends Component {
  render() {
    return (
      <Wrapper className='error-messages' style={{ zIndex: 10 }}>
        {this.props.store.errorMessage && <Message message={this.props.store.errorMessage} />}
      </Wrapper>
    )
  }
}

export default ErrorMessage
