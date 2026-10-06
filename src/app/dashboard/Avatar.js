const COLORS = ['#1D4ED8', '#0F766E', '#B45309', '#7C3AED', '#BE123C', '#0891B2']

export default function Avatar({ name, photoUrl, size = 40 }) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  }
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const color = COLORS[(name || '?').charCodeAt(0) % COLORS.length]
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  )
}
