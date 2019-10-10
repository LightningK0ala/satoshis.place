import { Component } from 'react'
import { Heading, Flex, Text, Box } from 'rebass'

class Maintenance extends Component {
  state = {
    clickCount: 0
  }

  render() {
    return (
      <Flex
        flexDirection='column'
        align='center'
        justify='center'
        p={5}
      >
        <img src={'/static/internet-party.gif'} />
        <Heading my={4} textAlign='center'>Site undergoing maintenance</Heading>
        <Text textAlign='center'>Our team of Koalas is busy improving things. We'll be back shortly :-) If you made an order in the the last 10 minutes and paid for it, don't worry, it will still be processed and show up on the canvas as soon as we get back up!</Text>
      </Flex>
    )
  }
}

export default Maintenance