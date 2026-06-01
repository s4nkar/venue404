const OPENAPI_URL = process.env.OPENAPI_URL ?? 'http://localhost:8000/openapi.json'

async function generate() {
  const res = await fetch(OPENAPI_URL)
  const schema = await res.json()
  console.log('Fetched OpenAPI schema, generation not yet implemented')
  console.log(JSON.stringify(schema, null, 2))
}

generate().catch(console.error)
