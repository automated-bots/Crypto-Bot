class Util {
  /**
   * Convert the date object to string
   * @param {Date} date Date object
   * @param {boolean} onlyDate Only return date (without time)
   */
  static dateToString (date, onlyDate = false) {
    let ret = date.getFullYear() + '-' +
    Util.appendLeadingZeroes(date.getMonth() + 1) + '-' +
    Util.appendLeadingZeroes(date.getDate())
    if (!onlyDate) {
      ret += ' ' +
      Util.appendLeadingZeroes(date.getHours()) + ':' +
      Util.appendLeadingZeroes(date.getMinutes())
    }
    return ret
  }

  static appendLeadingZeroes (n) {
    if (n <= 9) {
      return '0' + n
    }
    return n
  }

  /**
   * Return current date + time
   * @returns Current date time string
   */
  static getCurrentDateTime () {
    return new Date().toLocaleString('nl-NL')
  }
}

module.exports = Util
