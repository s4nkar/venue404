import { TRUST_STATS } from '../../constants'

export function TrustStrip() {
  return (
    <section className="border-t border-zinc-100 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
          {TRUST_STATS.map(({ stat, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">{stat}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}