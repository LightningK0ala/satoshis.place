import { Component } from 'react'
import { inject, observer } from 'mobx-react'

/**
|--------------------------------------------------
| Sub Components
|--------------------------------------------------
*/
const Message = props =>
  <p className='text'>
    {props.data.message}
    <style jsx>{`
      .text {
        color: ${ props.data.color };
        text-shadow: 1px 1px 0px #333; 
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
class GameHud extends Component {
  render() {
    return (
      <div className='game-hud'>
        {this.props.store.hudMessages.map((data, key) => <Message key={key} data={data} />)}
        <style jsx>{`
          .game-hud {
            position: absolute;
            border-top-right-radius: 5px;
            left: 0;
            min-width: 252px;
            padding: 0 12px;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            box-shadow: 1px -1px 1px rgba(0,0,0,0.5);
          }
        `}</style>
      </div>
    )
  }
}

export default GameHud
