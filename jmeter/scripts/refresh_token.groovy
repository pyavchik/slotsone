// Refresh JWT token every 12 minutes (JWT TTL = 15 min)
import org.apache.http.client.methods.HttpPost
import org.apache.http.entity.StringEntity
import org.apache.http.impl.client.HttpClients
import org.apache.http.util.EntityUtils
import groovy.json.JsonSlurper

def REFRESH_INTERVAL_MS = 12 * 60 * 1000 // 12 minutes
def lastRefresh = props.get('LAST_TOKEN_REFRESH')
def now = System.currentTimeMillis()

if (lastRefresh == null) {
    props.put('LAST_TOKEN_REFRESH', now.toString())
    return
}

def elapsed = now - (lastRefresh as Long)
if (elapsed < REFRESH_INTERVAL_MS) {
    return
}

// Time to refresh
def protocol = vars.get('PROTOCOL') ?: 'http'
def host = vars.get('BASE_URL') ?: 'localhost'
def port = vars.get('PORT') ?: ''
def portSuffix = (port && port != '') ? ':' + port : ''
def baseUrl = protocol + '://' + host + portSuffix

def email = vars.get('USER_EMAIL') ?: 'player@example.com'
def password = vars.get('USER_PASSWORD') ?: 'password123'

try {
    def client = HttpClients.createDefault()
    def post = new HttpPost(baseUrl + '/api/v1/auth/login')
    post.setHeader('Content-Type', 'application/json')
    post.setEntity(new StringEntity('{"email":"' + email + '","password":"' + password + '"}'))
    def response = client.execute(post)
    def body = EntityUtils.toString(response.getEntity())
    client.close()

    def json = new JsonSlurper().parseText(body)
    if (json.access_token) {
        props.put('AUTH_TOKEN', json.access_token)
        props.put('LAST_TOKEN_REFRESH', now.toString())
        log.info('JWT refreshed successfully at spin #' + (props.get('SPIN_NUMBER') ?: '?'))
    } else {
        log.warn('JWT refresh failed: ' + body)
    }
} catch (Exception e) {
    log.warn('JWT refresh error: ' + e.getMessage())
}
