// Accumulate RTP Data — runs after each spin response
def responseCode = prev.getResponseCode()

// Handle rate-limited or error responses — skip accumulation
if (responseCode != '200') {
    def rlCount = ((props.get('RATE_LIMITED_COUNT') ?: '0') as Integer) + 1
    props.put('RATE_LIMITED_COUNT', rlCount.toString())
    if (responseCode == '429') {
        prev.setSuccessful(true)
        prev.setSampleLabel('POST /spin [429 rate-limited]')
    }
    return
}

def winStr = vars.get('WIN_AMOUNT')
def betStr = vars.get('ACTUAL_BET')
def balStr = vars.get('CURRENT_BALANCE')

// Guard against extraction failures
if (winStr == 'NOT_FOUND' || betStr == 'NOT_FOUND' || balStr == 'NOT_FOUND') {
    log.warn('JSON extraction failed — win: ' + winStr + ' bet: ' + betStr + ' bal: ' + balStr)
    return
}

def spinNum = ((props.get('SPIN_NUMBER') ?: '0') as BigDecimal) + 1
def betAmount = betStr as BigDecimal
def winAmount = winStr as BigDecimal
def balance = balStr as BigDecimal

def totalWagered = ((props.get('TOTAL_WAGERED') ?: '0') as BigDecimal) + betAmount
def totalWon = ((props.get('TOTAL_WON') ?: '0') as BigDecimal) + winAmount
def winCount = (props.get('WIN_COUNT') ?: '0') as BigDecimal
def lossCount = (props.get('LOSS_COUNT') ?: '0') as BigDecimal
def maxWin = (props.get('MAX_WIN') ?: '0') as BigDecimal
def scatterCount = (props.get('SCATTER_COUNT') ?: '0') as BigDecimal

if (winAmount > 0) {
    winCount++
    if (winAmount > maxWin) { maxWin = winAmount }
} else {
    lossCount++
}

def bonus = vars.get('BONUS')
if (bonus != null && bonus != 'null' && bonus != '' && !bonus.contains('NOT_FOUND')) {
    scatterCount++
}

props.put('TOTAL_WAGERED', totalWagered.toPlainString())
props.put('TOTAL_WON', totalWon.toPlainString())
props.put('WIN_COUNT', winCount.toPlainString())
props.put('LOSS_COUNT', lossCount.toPlainString())
props.put('MAX_WIN', maxWin.toPlainString())
props.put('SPIN_NUMBER', spinNum.toPlainString())
props.put('SCATTER_COUNT', scatterCount.toPlainString())

// Running RTP
def rtp = totalWagered > 0 ? (totalWon / totalWagered * 100).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO

// Log progress every 500 spins
if (spinNum.remainder(new BigDecimal('500')) == BigDecimal.ZERO) {
    def hitRate = spinNum > 0 ? (winCount / spinNum * 100).setScale(2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO
    def rlCount = props.get('RATE_LIMITED_COUNT') ?: '0'
    log.info(String.format('Spin #%s | RTP: %s%% | Bal: %s | Wins: %s | HitRate: %s%% | MaxWin: %s | Scatters: %s | 429s: %s',
        spinNum.toPlainString(), rtp.toPlainString(), balance.toPlainString(),
        winCount.toPlainString(), hitRate.toPlainString(),
        maxWin.toPlainString(), scatterCount.toPlainString(), rlCount))
}
