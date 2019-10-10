import { Component } from 'react'
import { inject, observer } from 'mobx-react'
import { CURSOR_MODES } from '../store'
import UIButton from './ui/Button'
import { Image, Text, Container, Flex, Box } from 'rebass'
import styled from 'styled-components'
import { space } from 'styled-system'

const Wrapper = Flex.extend`
  z-index: 1;
  box-shadow: 0px 1px 5px lightgray;
  background-color: white;
`

const Logo = styled.img`
  height: 30px;
`

const StyledButton = styled(UIButton)`${space}`
const Button = props => <StyledButton
  mr={[1, 1, 2]}
  ml={[1, 1, 0]}
  mb={[1, 1, 0]}
  {...props}
/>

@inject('store')
@observer
export default class Header extends Component {
  state = {
    dickCount: Math.floor(Math.random() * 100) + 20 
  }

  render () {
    const {
      clearDrawing,
      zoomIn,
      zoomOut,
      setDrawMode,
      setDragMode,
      setEraseMode,
      togglePreviewMode,
      isPreviewModeOn,
      cursorMode,
      centerViewport,
      paintedPixelsCount,
      newOrder,
      priceInSatoshis,
      priceInDollars,
      hasPaintedMaximum,
      openInfoModal,
      brushSize,
      toggleBrushSize
    } = this.props.store

    const isTestnet = process.env.TESTNET === 'yes'

    return (
      <Wrapper p={2} justify='center'>
        <Flex
          w='100%'
          style={{ maxWidth: '1080px' }}
          flexDirection='column'
        >
          <Flex
            flexDirection={['column', 'column', 'row']}
            justify='space-between'
          >
            <Flex flexWrap='wrap' justify={['center', 'center', 'flex-start']}>
              <Button
                disabled={paintedPixelsCount === 0}
                onClick={togglePreviewMode}
                title='Toggle Preview (p)'
                icon='eye'
                active={!isPreviewModeOn && paintedPixelsCount > 0}
              />
              <Button
                onClick={setDragMode}
                title='Move (m)'
                icon='arrows-alt'
                active={cursorMode === CURSOR_MODES.DRAG}
              />
              <Button
                onClick={setDrawMode}
                title='Draw (d)'
                icon='pencil'
                active={cursorMode === CURSOR_MODES.DRAW}
              />
              <Button
                onClick={toggleBrushSize}
                title={`Brush Size (${brushSize})`}
                iconSize={brushSize === 0 ? 0.25 : brushSize === 1 ? 0.65 : 1}
                icon='square'
              />
              <Button
                disabled={paintedPixelsCount === 0}
                onClick={setEraseMode}
                title='Eraser (e)'
                icon='eraser'
                active={cursorMode === CURSOR_MODES.ERASE}
              />
              <Button title='Zoom in (i)' onClick={() => zoomIn()} icon='search-plus' />
              <Button title='Zoom out (o)' onClick={() => zoomOut()} icon='search-minus' />
              <Button
                disabled={paintedPixelsCount === 0}
                onClick={clearDrawing}
                title='Clear drawing (x)'
                icon='trash'
              />
              <Button title='Information' onClick={openInfoModal} icon='info' />
              {/* <Flex align='center' justify='center' color={hasPaintedMaximum() ? 'red' : 'inherit'} mr={2}>
                Dick count: {process.browser ? this.state.dickCount : ''}
              </Flex> */}
            </Flex>
            <Flex
              mt={[3, 3, 0]}
              align='center'
              alignSelf='flex-end'
              justify={['center', 'center', 'flex-end']}
            >
              <Box
                color={hasPaintedMaximum() ? 'red' : 'inherit'}
                mr={2}
                style={{ userSelect: 'none' }}
              >
                Price: {priceInSatoshis} {isTestnet ? 'tSatoshis' : 'satoshis'}{priceInDollars ? ` (≈ ${priceInDollars} ${isTestnet ? 'tUSD' : 'USD'})` : null}
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </Wrapper>
    )
  }
}
