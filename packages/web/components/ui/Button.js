import styled from 'styled-components'
import { space, width } from 'styled-system'

const Button = styled.button`
  ${space}
  ${width}
  color: ${({ color }) => color};
  min-width: 40px;
  height: 40px;
  line-height: 20px;
  padding: 10px 10px;
  border-radius: 5px;
  border: 1px solid lightgray;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;

  &.button-light {
    background-color: #61C1FD;
    text-decoration: none;
    color: white;
  }

  &.button-success {
    background-color: #6FC446;
    color: white;
  }

  &:focus {
    outline:0;
  }

  &:hover:enabled {
    cursor: pointer;
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
  }
`
export default ({ children, color = 'gray', icon, iconSize = 1, active, success, className, ...props }) =>
  <Button
    color={color}
    className={`button ${active && 'button-light'}
    ${success && 'button-success'} ${className}`}
    {...props}
  >
    { children }
    { icon && <i className={`fa fa-${icon}`} style={{ transform: `scale(${iconSize})` }} /> }
  </Button>
