import React from 'react'
import Konva from 'konva'
import { Rect } from 'react-konva'

export default class ColoredRect extends React.Component {
  state = {
    color: Konva.Util.getRandomColor()
  }

  handleClick = () => {
    this.setState({
      color: Konva.Util.getRandomColor()
    })
  }

  render() {
    const { x, y, width, height, color } = this.props
    return (
      <Rect
        x={x}
        y={y}
        draggable
        width={width}
        height={height}
        fill={color}
        onClick={this.handleClick}
      />
    )
  }
}