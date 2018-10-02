# rest-session-store
Express session store using [rest-session-cache](https://github.com/nohorjo/rest-session-cache)

# Usage
```javascript
import * as session from 'express-session';
const FileMySQLSession = require('file-mysql-session')(session);

app.use(session({
    store: new FileMySQLSession({
        url: 'http://127.0.0.1:3500', // base url of ther server
        secret: 'MySecretPassword' // password used to encrypt/decrypt data
    })
}))
```
