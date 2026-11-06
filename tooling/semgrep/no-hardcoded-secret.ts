declare const cfg: any;

// ruleid: no-hardcoded-secret
const apiKey = 'abc123';
// ruleid: no-hardcoded-secret
let dbPassword = 'hunter2';
// ruleid: no-hardcoded-secret
cfg.authToken = 'xyz';
// ruleid: no-hardcoded-secret
const opts = { clientSecret: 'shh' };
// ruleid: no-hardcoded-secret
const opts2 = { password: 'x' };
// ok: no-hardcoded-secret
const emptyToken = '';
// ok: no-hardcoded-secret
const title = 'hello';
// ok: no-hardcoded-secret
const keyFromEnv = cfg.key;
// ok: no-hardcoded-secret
const KEY = 'storage-name';
// ok: no-hardcoded-secret
const field = { id: 'hero.lead', key: 'heroLead' };
// ok: no-hardcoded-secret
type TokenKind = 'token' | 'secret';
// ok: no-hardcoded-secret
interface Creds {
  password: 'a' | 'b';
}
