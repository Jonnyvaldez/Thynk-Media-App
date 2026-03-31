const SUPABASE_URL = 'https://aerepscregaufhxfrqhy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_qcR3EaQoVhZIlEvvRmWXBA__gnQTWaK'

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
