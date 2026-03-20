// RTP Final Report — runs in tearDown thread group
def safe = { String key, String fallback = '0' -> (props.get(key) ?: fallback) as BigDecimal }

def totalWagered = safe('TOTAL_WAGERED')
def totalWon = safe('TOTAL_WON')
def winCount = safe('WIN_COUNT')
def lossCount = safe('LOSS_COUNT')
def maxWin = safe('MAX_WIN')
def spinCount = safe('SPIN_NUMBER')
def scatterCount = safe('SCATTER_COUNT')
def rateLimited = safe('RATE_LIMITED_COUNT')
def initBalance = safe('INIT_BALANCE', '1000')

def rtp = totalWagered > 0 ? (totalWon / totalWagered * 100).setScale(4, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO
def hitRate = spinCount > 0 ? (winCount / spinCount * 100).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO
def avgWin = winCount > 0 ? (totalWon / winCount).setScale(4, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO
def houseEdge = (new BigDecimal('100') - rtp).setScale(4, java.math.RoundingMode.HALF_UP)
def netResult = totalWon - totalWagered
def scatterRate = spinCount > 0 ? (scatterCount / spinCount * 100).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO
def avgBetPerSpin = spinCount > 0 ? (totalWagered / spinCount).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO

def sep = '============================================================'
def div = '------------------------------------------------------------'

def sb = new StringBuilder()
sb.append('\n').append(sep).append('\n')
sb.append('     PYAVCHIK TIME MACHINE - RTP ANALYSIS REPORT\n')
sb.append(sep).append('\n')
sb.append('  Total Spins:        ').append(spinCount.toPlainString().padLeft(12)).append('\n')
sb.append('  Total Wagered:    $ ').append(totalWagered.setScale(2).toPlainString().padLeft(12)).append('\n')
sb.append('  Total Won:        $ ').append(totalWon.setScale(2).toPlainString().padLeft(12)).append('\n')
sb.append('  Net Result:       $ ').append(netResult.setScale(2).toPlainString().padLeft(12)).append('\n')
sb.append(div).append('\n')
sb.append('  ACTUAL RTP:         ').append(rtp.toPlainString().padLeft(10)).append(' %\n')
sb.append('  Expected RTP:         96.0000 %\n')
sb.append('  House Edge:         ').append(houseEdge.toPlainString().padLeft(10)).append(' %\n')
sb.append(div).append('\n')
sb.append('  Win Count:          ').append(winCount.toPlainString().padLeft(12)).append('\n')
sb.append('  Loss Count:         ').append(lossCount.toPlainString().padLeft(12)).append('\n')
sb.append('  Hit Rate:           ').append(hitRate.toPlainString().padLeft(10)).append(' %\n')
sb.append('  Average Win:      $ ').append(avgWin.toPlainString().padLeft(12)).append('\n')
sb.append('  Max Single Win:   $ ').append(maxWin.setScale(2).toPlainString().padLeft(12)).append('\n')
sb.append('  Avg Bet/Spin:     $ ').append(avgBetPerSpin.toPlainString().padLeft(12)).append('\n')
sb.append(div).append('\n')
sb.append('  Scatter Triggers:   ').append(scatterCount.toPlainString().padLeft(12)).append('\n')
sb.append('  Scatter Rate:       ').append(scatterRate.toPlainString().padLeft(10)).append(' %\n')
sb.append(div).append('\n')
sb.append('  Initial Balance:  $ ').append(initBalance.setScale(2).toPlainString().padLeft(12)).append('\n')
sb.append('  Rate-limited:      ').append(rateLimited.toPlainString().padLeft(12)).append('\n')
sb.append(sep).append('\n')

def report = sb.toString()
log.info(report)
SampleResult.setResponseData(report, 'UTF-8')
SampleResult.setSuccessful(true)
SampleResult.setSampleLabel('RTP Report')

// RTP tolerance check (96% +/- 3% for statistical variance at 10k spins)
def rtpDiff = (rtp - new BigDecimal('96')).abs()
if (rtpDiff > new BigDecimal('3')) {
    log.warn('WARNING: RTP deviates >3% from expected 96%. Actual: ' + rtp + '%')
}

// Clean up properties
['TOTAL_WAGERED', 'TOTAL_WON', 'WIN_COUNT', 'LOSS_COUNT', 'MAX_WIN',
 'SPIN_NUMBER', 'SCATTER_COUNT', 'RATE_LIMITED_COUNT', 'AUTH_TOKEN',
 'SESSION_ID', 'INIT_BALANCE'].each { props.remove(it) }
