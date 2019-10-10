import { Component } from 'react'
import { inject, observer } from 'mobx-react'
import Button from './ui/Button'
import Tooltip from './ui/Tooltip'
import color from 'tinycolor2'
import { Flex } from 'rebass'

const ColorButton = ({ color, onClick, active }) =>
  <div onClick={onClick}>
    <style jsx>{`
      display: inline-block;
      cursor: pointer;
      width: 25px;
      height: 25px;
      background-color: ${color};
      margin: 0 3px;
      border: 1px solid black;
      box-shadow: ${!active ? 'none' : '1px 1px 1px 1px rgba(0,0,0,0.2)'};
      opacity: ${active ? 1 : 0.2};
      border-radius: 2px;
    `}</style>
  </div>

const Wrapper = Flex.extend`
  z-index: 1;
  min-height: 1.5em;
  box-shadow: 0px -1px 5px lightgray;
  background-color: white;
`

@inject('store')
@observer
export default class Footer extends Component {
  render () {
    const {
      setPaintColor,
      paintColor,
      cursorCoordinates,
      paintedPixelsCount,
      newOrder,
      settings,
      stats
    } = this.props.store

    return (
      <Wrapper justify='center' style={{ userSelect: 'none' }}>
        <Flex
          flexDirection={['column', 'column', 'row']}
          p={2}
          w='100%'
          style={{ maxWidth: '1080px' }}
          align='center'
        >
          <Flex>
            <div className='color-palette'>
              {
                settings && settings.colors.map(
                  (c, i) => (
                    <div key={`color-button-${c}`} className='color-box'>
                      <ColorButton
                        color={c}
                        active={paintColor === color(c).toHex()}
                        onClick={() => setPaintColor(c)}
                      />
                    </div>
                  )
                )
              }
            </div>
          </Flex>
          <Flex
            w={1}
            my={3}
            justify={['center', 'center', 'flex-start']}
            align='center'
            ml={[0, 0, 3]}
          >
            {cursorCoordinates}
          </Flex>
          <Flex
            w={1}
            align='center'
            flexDirection={['column', 'column', 'row']}
            justify={['center', 'center', 'flex-end']}
          >
            <Flex mr={[0, 0, 3]} mb={[3, 3, 0]} flexDirection={['row', 'row', 'column']}>
              <Flex f={0} justify='flex-end'>
                <Tooltip text='Pixels drawn per day'>
                  {stats.pixelsPerDay} px / day
                </Tooltip>
              </Flex>
              <Flex f={0} pl={3} justify='flex-end'>
                <Tooltip text='Transactions per day'>
                  {stats.transactionsPerDay} tx / day
                </Tooltip>
              </Flex>
            </Flex>
            <Flex w={['100%', 150]}>
              <Button
                w={['100%', 150]}
                success
                disabled={paintedPixelsCount === 0}
                onClick={newOrder}
              >
                Submit
              </Button>
            </Flex>
          </Flex>
        </Flex>
        <style jsx>{`
          .color-palette {
            display: flex;
            width: 249px;
            flex-flow: row wrap;
          }
          .color-box {
            flex: 0 1 calc(12.5%);
          }
          .coordinates {
            text-align: center;
            font
            color: gray;
          }
        `}</style>
      </Wrapper>
    )
  }
}