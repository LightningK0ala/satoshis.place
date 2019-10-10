import { Provider } from 'rebass'
import theme from '../utils/theme'

export default ({ children }) => (
  <Provider className='stretch' theme={theme}>
    {children}
  </Provider>
)
