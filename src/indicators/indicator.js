/**
 * @class Indicator
 * Indicator abstract base class (template)
 */
class Indicator {
  constructor () {
    if (this.constructor === Indicator) {
      throw new TypeError('Abstract class can\'t be instantiated directly')
    }

    if (this.update === undefined) {
      throw new TypeError('Indicator sub-class should implement a update() method')
    }

    if (this.getResult === undefined) {
      throw new TypeError('Indicator sub-class should implement a getResult() method')
    }
  }
}

module.exports = Indicator
