/* global describe test expect */
const validation = require('./validation')

const sampleSettings = {
  orderPixelsLimit: 250000
}

/**
|--------------------------------------------------
| Tests
|--------------------------------------------------
*/
describe('isPixelArrayInvalid', () => {
  test('Fail when data is empty', async done => {
    const result = validation.isPixelArrayInvalid()
    expect(result).toBeTruthy()
    done()
  })

  test('Fail when data is object', async done => {
    const result = validation.isPixelArrayInvalid({ asd: 123 }, sampleSettings)
    expect(result).toBeTruthy()
    done()
  })

  test('Fail when array is empty', async done => {
    const data = []
    const result = validation.isPixelArrayInvalid(data, sampleSettings)
    expect(result).toBeTruthy()
    done()
  })

  // test('Fail when array is bigger than that set by config', async done => {
  //   const data = Array(config.ORDER_PIXELS_LIMIT + 1)
  //   const result = validation.isPixelArrayInvalid(data, sampleSettings)
  //   expect(result).toBeTruthy()
  //   done()
  // })

  test('Fail when array object doesn\'t have all required fields', async done => {
    expect(validation.isPixelArrayInvalid([{ color: '#123' }], sampleSettings))
      .toBeTruthy()
    expect(validation.isPixelArrayInvalid([{ coordinates: [0, 0] }], sampleSettings))
      .toBeTruthy()
    done()
  })

  test('Fail when color doesn\'t exist in the swatch', async done => {
    expect(validation.isPixelArrayInvalid([{ color: '#121122', coordinates: [0, 0] }], sampleSettings))
      .toBeTruthy()
    done()
  })
})
