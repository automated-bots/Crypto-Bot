class Util {
  /**
   * Convert the date object to string
   * @param {Date} date Date object
   */
  static dateToString (date) {
    return date.getFullYear() + '-' +
      Util.appendLeadingZeroes(date.getMonth() + 1) + '-' +
      Util.appendLeadingZeroes(date.getDate()) + ' ' +
      Util.appendLeadingZeroes(date.getHours()) + ':' +
      Util.appendLeadingZeroes(date.getMinutes())
  }

  static appendLeadingZeroes (n) {
    if (n <= 9) {
      return '0' + n
    }
    return n
  }
}

module.exports = Util
